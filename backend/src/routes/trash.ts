import { Hono } from 'hono';
import type { Bindings } from '../index';
import { all, one } from '../db';
import type { AuthUser } from '../db';

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// 权限模型:
//   - owner 看到/操作所有 trash 行
//   - assistant 只能看到/操作自己 deleted_by=email 的行
// 共用 helper:对 owner 不加 scope,对其他人加 `AND deleted_by = ?`。
function scopeWhere(user: AuthUser): { sql: string; binds: unknown[] } {
  if (user.role === 'owner') return { sql: '', binds: [] };
  return { sql: ' AND deleted_by = ?', binds: [user.email] };
}

// 列出回收站(自己的或全部)。顺手做 lazy 清理:30 天以上的物理删除。
app.get('/', async (c) => {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  await c.env.DB.prepare(`DELETE FROM trash WHERE deleted_at < ?`).bind(cutoff).run();

  const { sql, binds } = scopeWhere(c.var.user);
  const items = await all(
    c,
    `SELECT id, type, item_data, related_data, deleted_at, deleted_by FROM trash WHERE 1=1${sql} ORDER BY deleted_at DESC`,
    ...binds,
  );
  return c.json({ items });
});

// 恢复:assistant 只能恢复自己删的
app.post('/:id/restore', async (c) => {
  const id = c.req.param('id');
  const { sql, binds } = scopeWhere(c.var.user);
  const item = await one<{
    type: 'task' | 'project' | 'album' | 'role';
    itemData: Record<string, unknown>;
    relatedData: Record<string, unknown> | null;
  }>(c, `SELECT type, item_data, related_data FROM trash WHERE id = ?${sql}`, id, ...binds);
  if (!item) return c.json({ error: 'not_found' }, 404);

  const conflict = await checkRestoreConflict(c, item.type, item.itemData);
  if (conflict) return c.json({ error: 'id_conflict', detail: conflict }, 409);

  try {
    await restoreItem(c, item.type, item.itemData, item.relatedData);
    await c.env.DB.prepare(`DELETE FROM trash WHERE id = ?`).bind(id).run();
    return c.json({ ok: true, type: item.type });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: 'restore_failed', message: msg }, 500);
  }
});

// 永久删除单条:assistant 只能删自己的
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { sql, binds } = scopeWhere(c.var.user);
  const res = await c.env.DB
    .prepare(`DELETE FROM trash WHERE id = ?${sql}`)
    .bind(id, ...binds)
    .run();
  if (!res.success || res.meta?.changes === 0) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

// 清空:owner 清全部;assistant 清自己的
app.delete('/', async (c) => {
  const { sql, binds } = scopeWhere(c.var.user);
  await c.env.DB.prepare(`DELETE FROM trash WHERE 1=1${sql}`).bind(...binds).run();
  return c.json({ ok: true });
});

// ── 辅助 ──────────────────────────────────────────────
async function checkRestoreConflict(
  c: { env: Bindings },
  type: string,
  itemData: Record<string, unknown>,
): Promise<string | null> {
  if (type === 'role') {
    // role 的 itemData 是 { role, tasks }
    const role = itemData.role as { id: string } | undefined;
    if (!role) return 'malformed_role_payload';
    const exists = await c.env.DB.prepare(`SELECT 1 FROM roles WHERE id = ?`).bind(role.id).first();
    return exists ? `role ${role.id} already exists` : null;
  }
  const id = itemData.id as string | undefined;
  if (!id) return 'missing_id_in_payload';
  let table: string;
  if (type === 'task') table = 'tasks';
  else if (type === 'project') table = 'projects';
  else if (type === 'album') table = 'album_designs';
  else return `unknown_type:${type}`;
  const exists = await c.env.DB.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).bind(id).first();
  return exists ? `${type} ${id} already exists` : null;
}

async function restoreItem(
  c: { env: Bindings },
  type: string,
  itemData: Record<string, unknown>,
  relatedData: Record<string, unknown> | null,
): Promise<void> {
  if (type === 'task') {
    const t = itemData as {
      id: string; roleId: string; name: string; frequency: string;
      duration: number | null; description: string | null;
      dueDate: string | null; isWeekly: boolean | number; createdAt: number;
    };
    await c.env.DB
      .prepare(`INSERT INTO tasks (id, role_id, name, frequency, duration, description, due_date, is_weekly, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(t.id, t.roleId, t.name, t.frequency, t.duration, t.description, t.dueDate, t.isWeekly ? 1 : 0, t.createdAt)
      .run();
    const compls = (relatedData?.task_completions as Array<{ taskId: string; completionDate: string; completedAt: number; completedBy: string | null }>) ?? [];
    for (const r of compls) {
      await c.env.DB
        .prepare(`INSERT OR REPLACE INTO task_completions (task_id, completion_date, completed_at, completed_by) VALUES (?, ?, ?, ?)`)
        .bind(r.taskId, r.completionDate, r.completedAt, r.completedBy ?? null)
        .run();
    }
    return;
  }

  if (type === 'project') {
    const p = itemData as {
      id: string; clientName: string; shootType: string; shootDate: string;
      location: string | null; notes: string | null; createdAt: number;
    };
    await c.env.DB
      .prepare(`INSERT INTO projects (id, client_name, shoot_type, shoot_date, location, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(p.id, p.clientName, p.shootType, p.shootDate, p.location, p.notes, p.createdAt)
      .run();
    const compls = (relatedData?.project_completions as Array<{ projectId: string; taskTemplateId: string; roleId: string; completedAt: number; completedBy: string | null }>) ?? [];
    for (const r of compls) {
      await c.env.DB
        .prepare(`INSERT OR REPLACE INTO project_completions (project_id, task_template_id, role_id, completed_at, completed_by) VALUES (?, ?, ?, ?, ?)`)
        .bind(r.projectId, r.taskTemplateId, r.roleId, r.completedAt, r.completedBy ?? null)
        .run();
    }
    return;
  }

  if (type === 'album') {
    const a = itemData as {
      id: string; clientName: string; albumType: string | null; startDate: string;
      notes: string | null; createdAt: number;
    };
    await c.env.DB
      .prepare(`INSERT INTO album_designs (id, client_name, album_type, start_date, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(a.id, a.clientName, a.albumType, a.startDate, a.notes, a.createdAt)
      .run();
    const compls = (relatedData?.album_completions as Array<{ albumId: string; taskTemplateId: string; completedAt: number; completedBy: string | null }>) ?? [];
    for (const r of compls) {
      await c.env.DB
        .prepare(`INSERT OR REPLACE INTO album_completions (album_id, task_template_id, completed_at, completed_by) VALUES (?, ?, ?, ?)`)
        .bind(r.albumId, r.taskTemplateId, r.completedAt, r.completedBy ?? null)
        .run();
    }
    return;
  }

  if (type === 'role') {
    const payload = itemData as {
      role: { id: string; name: string; icon: string | null; duties: string | null; color: string | null; isAssistant: boolean | number; supportsProjects: boolean | number; displayOrder: number };
      tasks?: Array<{ id: string; roleId: string; name: string; frequency: string; duration: number | null; description: string | null; dueDate: string | null; isWeekly: boolean | number; createdAt: number }>;
    };
    const r = payload.role;
    await c.env.DB
      .prepare(`INSERT INTO roles (id, name, icon, duties, color, is_assistant, supports_projects, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(r.id, r.name, r.icon, r.duties, r.color, r.isAssistant ? 1 : 0, r.supportsProjects ? 1 : 0, r.displayOrder)
      .run();
    for (const t of payload.tasks ?? []) {
      await c.env.DB
        .prepare(`INSERT OR REPLACE INTO tasks (id, role_id, name, frequency, duration, description, due_date, is_weekly, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(t.id, t.roleId, t.name, t.frequency, t.duration, t.description, t.dueDate, t.isWeekly ? 1 : 0, t.createdAt)
        .run();
    }
    return;
  }

  throw new Error(`unknown trash type: ${type}`);
}

export default app;
