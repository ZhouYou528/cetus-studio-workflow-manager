import { Hono } from 'hono';
import type { Bindings } from '../index';
import { all, genId, moveToTrash, one } from '../db';
import type { AuthUser } from '../db';

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>();

type Frequency = '每日' | '每周' | '每月' | '临时';
const VALID_FREQ: Frequency[] = ['每日', '每周', '每月', '临时'];

// assistant 可见的 role_id 列表;owner 是 null(无限制)
function visibleRoleIds(user: AuthUser): string[] | null {
  return user.role === 'owner' ? null : user.assignedRoles;
}

function visibleClause(prefix: string, user: AuthUser, binds: unknown[]): string {
  const ids = visibleRoleIds(user);
  if (ids === null) return '';
  if (ids.length === 0) return ` AND 1=0`;
  binds.push(...ids);
  return ` AND ${prefix}role_id IN (${ids.map(() => '?').join(',')})`;
}

// ── 列表 ─────────────────────────────────────────────────
// GET /api/tasks?role_id=r1   单职位
// GET /api/tasks               全部(按权限过滤)
app.get('/', async (c) => {
  const roleId = c.req.query('role_id');
  const binds: unknown[] = [];
  let where = `1=1`;

  if (roleId) {
    const ids = visibleRoleIds(c.var.user);
    if (ids !== null && !ids.includes(roleId)) {
      return c.json({ error: 'forbidden', reason: 'role-not-assigned' }, 403);
    }
    where += ` AND role_id = ?`;
    binds.push(roleId);
  } else {
    where += visibleClause('', c.var.user, binds);
  }

  const tasks = await all(c, `SELECT * FROM tasks WHERE ${where} ORDER BY role_id, id`, ...binds);
  return c.json({ tasks });
});

// GET /api/tasks/today
// 返回今天"相关"的任务 + 今天的完成记录。
// 与原前端 todayTasks 行为一致:
//   - '每日':每天展示
//   - '每周':仅周一展示(原前端 t.weekday ?? 1 默认即 1=周一)
//   - '每月':仅每月 1 号展示(原前端 t.monthday ?? 1)
//   - '临时' 不在此处展示,归 WeeklyView
// 前端 TodayView 负责按时间段(r3/r6/r4+r5/r7/其他)分组。
//
// 时区:Worker 跑在 UTC。前端可传 ?date=YYYY-MM-DD&dow=N&dom=N 覆盖本地时区,
// 任一参数缺失或非法时 fallback UTC 推断。
app.get('/today', async (c) => {
  const qDate = c.req.query('date');
  const qDow = c.req.query('dow');
  const qDom = c.req.query('dom');
  const now = new Date();
  const todayKey = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : now.toISOString().split('T')[0];
  const dow = qDow !== undefined ? parseInt(qDow, 10) : now.getUTCDay();
  const dom = qDom !== undefined ? parseInt(qDom, 10) : now.getUTCDate();

  const binds: unknown[] = [dow, dom];
  let where = `(
    frequency = '每日'
    OR (frequency = '每周' AND ? = 1)
    OR (frequency = '每月' AND ? = 1)
  )`;

  where += visibleClause('', c.var.user, binds);

  const tasks = await all(c, `SELECT * FROM tasks WHERE ${where} ORDER BY role_id`, ...binds);

  // 今日完成记录(同一 task 同一天最多一条)
  const taskIds = tasks.map((t) => (t as { id: string }).id);
  let completions: Record<string, boolean> = {};
  if (taskIds.length > 0) {
    const placeholders = taskIds.map(() => '?').join(',');
    const rows = await all<{ taskId: string }>(
      c,
      `SELECT task_id FROM task_completions WHERE completion_date = ? AND task_id IN (${placeholders})`,
      todayKey,
      ...taskIds,
    );
    completions = Object.fromEntries(rows.map((r) => [r.taskId, true]));
  }

  return c.json({ date: todayKey, tasks, completions });
});

// GET /api/tasks/weekly
// 仅 is_weekly=1 的临时任务。按 due_date 升序;前端按职位分组。
app.get('/weekly', async (c) => {
  const qDate = c.req.query('date');
  const todayKey = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : new Date().toISOString().split('T')[0];
  const binds: unknown[] = [];
  let where = `is_weekly = 1`;
  where += visibleClause('', c.var.user, binds);

  const tasks = await all(c, `SELECT * FROM tasks WHERE ${where} ORDER BY due_date ASC, role_id`, ...binds);

  // 这批任务在"今天"的完成态(本周待办用今天作为状态参考日,与原前端一致)
  const taskIds = tasks.map((t) => (t as { id: string }).id);
  let completions: Record<string, boolean> = {};
  if (taskIds.length > 0) {
    const placeholders = taskIds.map(() => '?').join(',');
    const rows = await all<{ taskId: string }>(
      c,
      `SELECT task_id FROM task_completions WHERE completion_date = ? AND task_id IN (${placeholders})`,
      todayKey,
      ...taskIds,
    );
    completions = Object.fromEntries(rows.map((r) => [r.taskId, true]));
  }

  return c.json({ date: todayKey, tasks, completions });
});

// ── 创建 ─────────────────────────────────────────────────
const MAX_NESTING_DEPTH = 5;

app.post('/', async (c) => {
  const body = await c.req.json<{
    id?: string;
    roleId: string;
    name: string;
    frequency: Frequency;
    duration?: number | string | null;
    description?: string | null;
    dueDate?: string | null;
    isWeekly?: boolean;
    parentTaskId?: string | null;
  }>();

  if (!body.name || !body.frequency) {
    return c.json({ error: 'missing_fields' }, 400);
  }
  if (!VALID_FREQ.includes(body.frequency)) {
    return c.json({ error: 'invalid_frequency' }, 400);
  }

  // 子任务路径:从 parent 继承 roleId(用户传的会被忽略)
  // 同时校验深度 ≤ 5
  let roleId = body.roleId;
  if (body.parentTaskId) {
    const parent = await one<{ roleId: string; parentTaskId: string | null }>(
      c,
      `SELECT role_id, parent_task_id FROM tasks WHERE id = ?`,
      body.parentTaskId,
    );
    if (!parent) return c.json({ error: 'parent_not_found' }, 400);

    // 计算深度:从 parent 往上数
    let depth = 1;
    let cur: string | null = parent.parentTaskId;
    while (cur && depth < MAX_NESTING_DEPTH + 2) {
      const next = await one<{ parentTaskId: string | null }>(
        c,
        `SELECT parent_task_id FROM tasks WHERE id = ?`,
        cur,
      );
      cur = next?.parentTaskId ?? null;
      depth++;
    }
    if (depth >= MAX_NESTING_DEPTH) {
      return c.json({ error: 'max_depth_exceeded', limit: MAX_NESTING_DEPTH }, 400);
    }

    // 强制继承父的 role,忽略 body.roleId
    roleId = parent.roleId;
  }

  if (!roleId) return c.json({ error: 'missing_fields', missing: 'roleId' }, 400);

  // 权限:assistant 只能为自己 assignedRoles 里的职位建任务
  const ids = visibleRoleIds(c.var.user);
  if (ids !== null && !ids.includes(roleId)) {
    return c.json({ error: 'forbidden', reason: 'role-not-assigned' }, 403);
  }

  // 引用完整性:role 必须存在
  const role = await one(c, `SELECT id FROM roles WHERE id = ?`, roleId);
  if (!role) return c.json({ error: 'role_not_found' }, 400);

  // 接受 client 提供的 id(用于嵌套任务在同一 session 里立刻被子任务引用的场景);
  // 不合法或缺失时回退到 server-side genId('t')。
  const id = body.id && /^[a-zA-Z0-9_-]{1,64}$/.test(body.id) ? body.id : genId('t');
  // 防 id 冲突:若已存在,直接拒绝。
  const existing = await one(c, `SELECT id FROM tasks WHERE id = ?`, id);
  if (existing) return c.json({ error: 'id_collision' }, 409);

  const duration =
    body.duration === undefined || body.duration === null || body.duration === ''
      ? null
      : typeof body.duration === 'string'
      ? parseInt(body.duration, 10) || null
      : body.duration;

  await c.env.DB
    .prepare(`INSERT INTO tasks (id, role_id, name, frequency, duration, description, due_date, is_weekly, created_at, parent_task_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id,
      roleId,
      body.name,
      body.frequency,
      duration,
      body.description ?? null,
      body.dueDate ?? null,
      body.isWeekly ? 1 : 0,
      Date.now(),
      body.parentTaskId ?? null,
    )
    .run();

  const created = await one(c, `SELECT * FROM tasks WHERE id = ?`, id);
  return c.json(created, 201);
});

// ── 修改 ─────────────────────────────────────────────────
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<{
    roleId: string;
    name: string;
    frequency: Frequency;
    duration: number | string | null;
    description: string | null;
    dueDate: string | null;
    isWeekly: boolean;
  }>>();

  const existing = await one<{ roleId: string }>(c, `SELECT role_id FROM tasks WHERE id = ?`, id);
  if (!existing) return c.json({ error: 'not_found' }, 404);

  const ids = visibleRoleIds(c.var.user);
  if (ids !== null && !ids.includes(existing.roleId)) {
    return c.json({ error: 'forbidden' }, 403);
  }
  if (body.roleId && ids !== null && !ids.includes(body.roleId)) {
    return c.json({ error: 'forbidden', reason: 'target-role-not-assigned' }, 403);
  }
  if (body.frequency && !VALID_FREQ.includes(body.frequency)) {
    return c.json({ error: 'invalid_frequency' }, 400);
  }

  const map: Record<string, string> = {
    roleId: 'role_id',
    name: 'name',
    frequency: 'frequency',
    duration: 'duration',
    description: 'description',
    dueDate: 'due_date',
    isWeekly: 'is_weekly',
  };
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (!(k in body)) continue;
    const v = (body as Record<string, unknown>)[k];
    sets.push(`${col} = ?`);
    if (typeof v === 'boolean') binds.push(v ? 1 : 0);
    else if (k === 'duration' && typeof v === 'string') binds.push(parseInt(v, 10) || null);
    else binds.push(v ?? null);
  }
  if (sets.length === 0) return c.json({ error: 'no_fields' }, 400);
  binds.push(id);
  await c.env.DB.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();

  const updated = await one(c, `SELECT * FROM tasks WHERE id = ?`, id);
  return c.json(updated);
});

// ── 软删:cascade 收集所有后代,一起进回收站 ────────────────
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const task = await one<{ roleId: string }>(c, `SELECT * FROM tasks WHERE id = ?`, id);
  if (!task) return c.json({ error: 'not_found' }, 404);

  const ids = visibleRoleIds(c.var.user);
  if (ids !== null && !ids.includes(task.roleId)) {
    return c.json({ error: 'forbidden' }, 403);
  }

  // BFS 收集所有后代
  const allIds: string[] = [id];
  const descendants: unknown[] = [];
  let frontier = [id];
  while (frontier.length > 0) {
    const placeholders = frontier.map(() => '?').join(',');
    const children = await all(
      c,
      `SELECT * FROM tasks WHERE parent_task_id IN (${placeholders})`,
      ...frontier,
    );
    if (children.length === 0) break;
    descendants.push(...children);
    frontier = children.map((c) => (c as { id: string }).id);
    allIds.push(...frontier);
  }

  // 拉所有相关 task_completions(自己 + 后代)
  const placeholders = allIds.map(() => '?').join(',');
  const compls = await all(
    c,
    `SELECT * FROM task_completions WHERE task_id IN (${placeholders})`,
    ...allIds,
  );

  const trashId = await moveToTrash(c, 'task', task, { task_completions: compls, descendants });

  // 物理删:completions + tasks(覆盖整树)
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM task_completions WHERE task_id IN (${placeholders})`).bind(...allIds),
    c.env.DB.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`).bind(...allIds),
  ]);

  return c.json({ ok: true, trashId, deletedCount: allIds.length });
});

// ── 完成 / 取消完成(按日期) ────────────────────────────
app.post('/:id/complete', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ date?: string }>().catch(() => ({} as { date?: string }));
  const date = body.date ?? new Date().toISOString().split('T')[0];

  const task = await one<{ roleId: string }>(c, `SELECT role_id FROM tasks WHERE id = ?`, id);
  if (!task) return c.json({ error: 'not_found' }, 404);
  const ids = visibleRoleIds(c.var.user);
  if (ids !== null && !ids.includes(task.roleId)) {
    return c.json({ error: 'forbidden' }, 403);
  }

  await c.env.DB
    .prepare(`INSERT OR REPLACE INTO task_completions (task_id, completion_date, completed_at, completed_by)
              VALUES (?, ?, ?, ?)`)
    .bind(id, date, Date.now(), c.var.user.email)
    .run();

  return c.json({ ok: true, taskId: id, date });
});

app.delete('/:id/complete', async (c) => {
  const id = c.req.param('id');
  const date = c.req.query('date') ?? new Date().toISOString().split('T')[0];

  const task = await one<{ roleId: string }>(c, `SELECT role_id FROM tasks WHERE id = ?`, id);
  if (!task) return c.json({ error: 'not_found' }, 404);
  const ids = visibleRoleIds(c.var.user);
  if (ids !== null && !ids.includes(task.roleId)) {
    return c.json({ error: 'forbidden' }, 403);
  }

  await c.env.DB
    .prepare(`DELETE FROM task_completions WHERE task_id = ? AND completion_date = ?`)
    .bind(id, date)
    .run();

  return c.json({ ok: true, taskId: id, date });
});

export default app;
