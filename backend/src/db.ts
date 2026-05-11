// D1 查询和数据形态转换的小工具。
//
// 关键决策:
// - DB 列是 snake_case(SQL 惯例),API 响应是 camelCase(前端原 Artifact 代码用 camelCase)。
//   这两个函数在边界做无感转换,业务代码两边都不用关心。
// - is_assistant / supports_projects / is_weekly 在 DB 里是 INTEGER 0/1,转成前端的 boolean。
// - assigned_roles 在 DB 里是 JSON 字符串,转成前端的数组。

import type { Context } from 'hono';
import type { Bindings } from './index';

export type AppContext = Context<{ Bindings: Bindings; Variables: { user: AuthUser } }>;

export interface AuthUser {
  email: string;
  role: 'owner' | 'assistant';
  assignedRoles: string[];
  name: string | null;
}

// ── 命名风格转换 ───────────────────────────────────────────
// DB 行 → API 响应:snake_case 转 camelCase,0/1 转 bool,JSON 字段解析
const BOOLEAN_FIELDS = new Set([
  'is_assistant',
  'supports_projects',
  'is_weekly',
]);

const JSON_FIELDS = new Set(['assigned_roles', 'item_data', 'related_data']);

export function rowToCamel<T = Record<string, unknown>>(row: Record<string, unknown> | null): T | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    let value: unknown = v;
    if (BOOLEAN_FIELDS.has(k) && typeof v === 'number') value = v === 1;
    else if (JSON_FIELDS.has(k) && typeof v === 'string') {
      try { value = JSON.parse(v); } catch { value = v; }
    }
    out[camel] = value;
  }
  return out as T;
}

export function rowsToCamel<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => rowToCamel<T>(r)!).filter(Boolean);
}

// API 输入 → DB 写入:camelCase 转 snake_case,bool 转 0/1,数组/对象转 JSON 串
export function camelToSnakeValue(key: string, value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value);
  }
  return value;
}

export function camelKey(s: string): string {
  return s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

// ── ID 生成 ────────────────────────────────────────────────
// 短前缀 + 时间排序的 base36 + 4 字符随机。可读性比裸 UUID 好。
export function genId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${t}${r}`;
}

// ── 回收站 ────────────────────────────────────────────────
// 30 天恢复期。所有 DELETE 走这个,不直接物理删。返回生成的 trash id,
// route handler 把它带回给客户端,前端不再轮询 listTrash 拿真实 id。
export async function moveToTrash(
  c: AppContext,
  type: 'task' | 'project' | 'album' | 'role',
  item: unknown,
  related: unknown,
): Promise<string> {
  const trashId = genId('trash');
  await c.env.DB
    .prepare(`INSERT INTO trash (id, type, item_data, related_data, deleted_at, deleted_by)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(
      trashId,
      type,
      JSON.stringify(item),
      related ? JSON.stringify(related) : null,
      Date.now(),
      c.var.user.email,
    )
    .run();
  return trashId;
}

// ── 通用查询助手 ─────────────────────────────────────────
export async function one<T = Record<string, unknown>>(
  c: AppContext,
  sql: string,
  ...binds: unknown[]
): Promise<T | null> {
  const row = await c.env.DB.prepare(sql).bind(...binds).first<Record<string, unknown>>();
  return rowToCamel<T>(row);
}

export async function all<T = Record<string, unknown>>(
  c: AppContext,
  sql: string,
  ...binds: unknown[]
): Promise<T[]> {
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all<Record<string, unknown>>();
  return rowsToCamel<T>(results);
}
