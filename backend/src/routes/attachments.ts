// 文件附件:可挂在 task / project / album 三类实体上。
// 文件本体存 R2(env.BUCKET),元数据存 D1 的 attachments 表。

import { Hono } from 'hono';
import type { Bindings } from '../index';
import type { AuthUser } from '../db';
import { all, genId, one } from '../db';

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>();

type ParentType = 'task' | 'project' | 'album';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_PER_PARENT = 20;

// 白名单 MIME,前缀匹配 image/* 全允许
const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/zip',
]);

// 扩展名兜底:某些浏览器/系统把 docx/xlsx 等报成 application/octet-stream,
// 这时按扩展名放行。
const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.svg', '.bmp',
  '.pdf',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.md', '.json', '.zip',
]);

function getExt(filename: string): string {
  const m = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : '';
}

function isAllowed(filename: string, mime: string | null | undefined): boolean {
  if (mime) {
    if (ALLOWED_MIME_EXACT.has(mime)) return true;
    if (ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) return true;
  }
  // 扩展名兜底
  return ALLOWED_EXT.has(getExt(filename));
}

function isValidType(t: string): t is ParentType {
  return t === 'task' || t === 'project' || t === 'album';
}

// 权限:用户能否操作这个父实体的附件?
// task:owner 看全部;assistant 仅其 assignedRoles 里的
// project/album:任何已登录用户(后端 bootstrap 也是返回所有 projects/albums 给所有人)
async function canAccessParent(
  env: Bindings,
  user: AuthUser,
  type: ParentType,
  id: string,
): Promise<boolean> {
  if (type === 'task') {
    const row = await env.DB
      .prepare(`SELECT role_id FROM tasks WHERE id = ?`)
      .bind(id)
      .first<{ role_id: string }>();
    if (!row) return false;
    if (user.role === 'owner') return true;
    return user.assignedRoles.includes(row.role_id);
  }
  // project / album:存在即可访问
  const table = type === 'project' ? 'projects' : 'album_designs';
  const exists = await env.DB.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).bind(id).first();
  return !!exists;
}

// 注意:Hono 按注册顺序匹配,更具体的路由必须先注册。
// `/:id/download` 在 `/:type/:id` 之前 — 否则下载请求会先命中 list 路由(type='att_xxx', id='download')。

// ── 下载:GET /api/attachments/:id/download ────────────
app.get('/:id/download', async (c) => {
  const id = c.req.param('id');
  const row = await one<{
    id: string;
    parentType: ParentType;
    parentId: string;
    r2Key: string;
    filename: string;
    contentType: string | null;
  }>(
    c,
    `SELECT id, parent_type, parent_id, r2_key, filename, content_type FROM attachments WHERE id = ?`,
    id,
  );
  if (!row) return c.json({ error: 'not_found' }, 404);
  if (!(await canAccessParent(c.env, c.var.user, row.parentType, row.parentId))) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const obj = await c.env.BUCKET.get(row.r2Key);
  if (!obj) return c.json({ error: 'file_gone' }, 410);

  const headers = new Headers();
  if (row.contentType) headers.set('content-type', row.contentType);
  // RFC 5987:用 filename*=UTF-8''<percent-encoded> 支持 unicode 文件名
  const ascii = row.filename.replace(/[^\x20-\x7e]/g, '_');
  headers.set('content-disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(row.filename)}`);
  headers.set('cache-control', 'private, max-age=60');

  return new Response(obj.body, { headers });
});

// ── 列表:GET /api/attachments/:type/:id ────────────────
app.get('/:type/:id', async (c) => {
  const type = c.req.param('type');
  const id = c.req.param('id');
  if (!isValidType(type)) return c.json({ error: 'invalid_type' }, 400);
  if (!(await canAccessParent(c.env, c.var.user, type, id))) return c.json({ error: 'forbidden' }, 403);

  const items = await all(
    c,
    `SELECT id, parent_type, parent_id, filename, content_type, size_bytes, uploaded_at, uploaded_by
     FROM attachments WHERE parent_type = ? AND parent_id = ? ORDER BY uploaded_at DESC`,
    type,
    id,
  );
  return c.json({ items });
});

// ── 上传:POST /api/attachments/:type/:id ──────────────
// 期望 multipart/form-data,字段 `file`
app.post('/:type/:id', async (c) => {
  const type = c.req.param('type');
  const id = c.req.param('id');
  if (!isValidType(type)) return c.json({ error: 'invalid_type' }, 400);
  if (!(await canAccessParent(c.env, c.var.user, type, id))) return c.json({ error: 'forbidden' }, 403);

  // 每父实体上限
  const count = await c.env.DB
    .prepare(`SELECT COUNT(*) AS n FROM attachments WHERE parent_type = ? AND parent_id = ?`)
    .bind(type, id)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_PER_PARENT) {
    return c.json({ error: 'too_many_attachments', limit: MAX_PER_PARENT }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ error: 'invalid_multipart' }, 400);
  }
  const file = body.file;
  if (!(file instanceof File)) return c.json({ error: 'missing_file' }, 400);

  if (file.size > MAX_BYTES) {
    return c.json({ error: 'file_too_large', limitMb: MAX_BYTES / 1024 / 1024 }, 413);
  }
  if (!isAllowed(file.name, file.type)) {
    return c.json({ error: 'unsupported_mime', got: file.type || '(empty)', filename: file.name, ext: getExt(file.name) }, 415);
  }

  const attId = genId('att');
  // 文件名做基本清洗,只去掉路径分隔符,保留 unicode 字符
  const safeName = file.name.replace(/[/\\]/g, '_').slice(0, 200);
  const r2Key = `${type}s/${id}/${attId}-${safeName}`;

  await c.env.BUCKET.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  await c.env.DB
    .prepare(`INSERT INTO attachments (id, parent_type, parent_id, r2_key, filename, content_type, size_bytes, uploaded_at, uploaded_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(attId, type, id, r2Key, file.name, file.type, file.size, Date.now(), c.var.user.email)
    .run();

  const created = await one(
    c,
    `SELECT id, parent_type, parent_id, filename, content_type, size_bytes, uploaded_at, uploaded_by
     FROM attachments WHERE id = ?`,
    attId,
  );
  return c.json(created, 201);
});

// ── 删除:DELETE /api/attachments/:id ──────────────────
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await one<{ parentType: ParentType; parentId: string; r2Key: string }>(
    c,
    `SELECT parent_type, parent_id, r2_key FROM attachments WHERE id = ?`,
    id,
  );
  if (!row) return c.json({ error: 'not_found' }, 404);
  if (!(await canAccessParent(c.env, c.var.user, row.parentType, row.parentId))) {
    return c.json({ error: 'forbidden' }, 403);
  }

  await c.env.BUCKET.delete(row.r2Key);
  await c.env.DB.prepare(`DELETE FROM attachments WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

export default app;
