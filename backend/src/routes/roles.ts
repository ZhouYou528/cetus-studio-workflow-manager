import { Hono } from 'hono';
import type { Bindings } from '../index';
import { all, genId, moveToTrash, one } from '../db';
import type { AuthUser } from '../db';
import { requireOwner } from '../auth';

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>();

// 列出职位。assistant 只看到自己 assignedRoles 里的
app.get('/', async (c) => {
  const user = c.var.user;
  if (user.role === 'owner') {
    const roles = await all(c, `SELECT * FROM roles ORDER BY display_order`);
    return c.json({ roles });
  }
  if (user.assignedRoles.length === 0) return c.json({ roles: [] });
  const placeholders = user.assignedRoles.map(() => '?').join(',');
  const roles = await all(
    c,
    `SELECT * FROM roles WHERE id IN (${placeholders}) ORDER BY display_order`,
    ...user.assignedRoles,
  );
  return c.json({ roles });
});

app.post('/', requireOwner, async (c) => {
  const body = await c.req.json<{
    name: string;
    icon?: string;
    duties?: string;
    color?: string;
    isAssistant?: boolean;
    supportsProjects?: boolean;
    displayOrder?: number;
  }>();
  if (!body.name) return c.json({ error: 'name_required' }, 400);

  const id = genId('r');
  // 默认 displayOrder 放最后
  const maxOrder = await c.env.DB
    .prepare(`SELECT COALESCE(MAX(display_order), 0) AS m FROM roles`)
    .first<{ m: number }>();
  const order = body.displayOrder ?? (maxOrder?.m ?? 0) + 1;

  await c.env.DB
    .prepare(`INSERT INTO roles (id, name, icon, duties, color, is_assistant, supports_projects, display_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id,
      body.name,
      body.icon ?? null,
      body.duties ?? null,
      body.color ?? 'bg-slate-500',
      body.isAssistant ? 1 : 0,
      body.supportsProjects ? 1 : 0,
      order,
    )
    .run();

  const created = await one(c, `SELECT * FROM roles WHERE id = ?`, id);
  return c.json(created, 201);
});

app.patch('/:id', requireOwner, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<{
    name: string;
    icon: string;
    duties: string;
    color: string;
    isAssistant: boolean;
    supportsProjects: boolean;
    displayOrder: number;
  }>>();

  const existing = await one(c, `SELECT id FROM roles WHERE id = ?`, id);
  if (!existing) return c.json({ error: 'not_found' }, 404);

  const map: Record<string, string> = {
    name: 'name',
    icon: 'icon',
    duties: 'duties',
    color: 'color',
    isAssistant: 'is_assistant',
    supportsProjects: 'supports_projects',
    displayOrder: 'display_order',
  };
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    const v = (body as Record<string, unknown>)[k];
    if (v === undefined) continue;
    sets.push(`${col} = ?`);
    if (typeof v === 'boolean') binds.push(v ? 1 : 0);
    else binds.push(v);
  }
  if (sets.length === 0) return c.json({ error: 'no_fields' }, 400);
  binds.push(id);
  await c.env.DB.prepare(`UPDATE roles SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  const updated = await one(c, `SELECT * FROM roles WHERE id = ?`, id);
  return c.json(updated);
});

// 软删:连同该职位下所有 tasks 一起进回收站,可恢复
app.delete('/:id', requireOwner, async (c) => {
  const id = c.req.param('id');
  const role = await one(c, `SELECT * FROM roles WHERE id = ?`, id);
  if (!role) return c.json({ error: 'not_found' }, 404);

  const tasks = await all(c, `SELECT * FROM tasks WHERE role_id = ?`, id);
  const trashId = await moveToTrash(c, 'role', { role, tasks }, null);

  // 物理删除(回收站里 item_data 保留了 JSON)
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM task_completions WHERE task_id IN (SELECT id FROM tasks WHERE role_id = ?)`).bind(id),
    c.env.DB.prepare(`DELETE FROM tasks WHERE role_id = ?`).bind(id),
    c.env.DB.prepare(`DELETE FROM roles WHERE id = ?`).bind(id),
  ]);
  return c.json({ ok: true, trashId });
});

export default app;
