import { Hono } from 'hono';
import type { Bindings } from '../index';
import type { AuthUser } from '../db';
import { all, one } from '../db';
import { requireOwner } from '../auth';

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>();

// 当前登录用户
app.get('/me', (c) => c.json(c.var.user));

// 用户自己改自己的 name(其他字段不允许 — role/assignedRoles 走 PATCH /:email,owner-only)
app.patch('/me', async (c) => {
  const body = await c.req.json<{ name?: string | null }>().catch(() => ({} as { name?: string | null }));
  if (body.name === undefined) return c.json({ error: 'no_fields' }, 400);
  const name = typeof body.name === 'string' ? body.name.trim() : null;
  await c.env.DB
    .prepare(`UPDATE users SET name = ? WHERE email = ?`)
    .bind(name || null, c.var.user.email)
    .run();
  const updated = await one(c, `SELECT email, name, role, assigned_roles, created_at FROM users WHERE email = ?`, c.var.user.email);
  return c.json(updated);
});

// 所有用户(仅 owner)
app.get('/', requireOwner, async (c) => {
  const users = await all(c, `SELECT email, name, role, assigned_roles, created_at FROM users ORDER BY created_at DESC`);
  return c.json({ users });
});

// 修改某用户的 role 或 assignedRoles(仅 owner)
app.patch('/:email', requireOwner, async (c) => {
  const email = c.req.param('email');
  const body = await c.req.json<{ role?: 'owner' | 'assistant'; assignedRoles?: string[]; name?: string }>();

  const existing = await one(c, `SELECT email FROM users WHERE email = ?`, email);
  if (!existing) return c.json({ error: 'not_found' }, 404);

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (body.role !== undefined) {
    if (body.role !== 'owner' && body.role !== 'assistant') {
      return c.json({ error: 'invalid_role' }, 400);
    }
    sets.push('role = ?');
    binds.push(body.role);
  }
  if (body.assignedRoles !== undefined) {
    sets.push('assigned_roles = ?');
    binds.push(JSON.stringify(body.assignedRoles));
  }
  if (body.name !== undefined) {
    sets.push('name = ?');
    binds.push(body.name);
  }
  if (sets.length === 0) return c.json({ error: 'no_fields' }, 400);

  binds.push(email);
  await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE email = ?`).bind(...binds).run();

  const updated = await one(c, `SELECT email, name, role, assigned_roles, created_at FROM users WHERE email = ?`, email);
  return c.json(updated);
});

export default app;
