import { Hono } from 'hono';
import type { Bindings } from '../index';
import { all, genId, moveToTrash, one } from '../db';
import type { AuthUser } from '../db';
import { addDays, ALBUM_TEMPLATES_R5 } from '../templates';

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const albums = await all(c, `SELECT * FROM album_designs ORDER BY start_date DESC`);
  return c.json({ albums });
});

app.post('/', async (c) => {
  const body = await c.req.json<{
    clientName: string;
    albumType?: string;
    startDate: string;
    notes?: string;
  }>();
  if (!body.clientName || !body.startDate) {
    return c.json({ error: 'missing_fields' }, 400);
  }
  const id = genId('a');
  await c.env.DB
    .prepare(`INSERT INTO album_designs (id, client_name, album_type, start_date, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, body.clientName, body.albumType ?? null, body.startDate, body.notes ?? null, Date.now())
    .run();
  const created = await one(c, `SELECT * FROM album_designs WHERE id = ?`, id);
  return c.json(created, 201);
});

app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<{
    clientName: string;
    albumType: string | null;
    startDate: string;
    notes: string | null;
  }>>();
  const exists = await one(c, `SELECT id FROM album_designs WHERE id = ?`, id);
  if (!exists) return c.json({ error: 'not_found' }, 404);

  const map: Record<string, string> = {
    clientName: 'client_name',
    albumType: 'album_type',
    startDate: 'start_date',
    notes: 'notes',
  };
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (!(k in body)) continue;
    sets.push(`${col} = ?`);
    binds.push((body as Record<string, unknown>)[k] ?? null);
  }
  if (sets.length === 0) return c.json({ error: 'no_fields' }, 400);
  binds.push(id);
  await c.env.DB.prepare(`UPDATE album_designs SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  const updated = await one(c, `SELECT * FROM album_designs WHERE id = ?`, id);
  return c.json(updated);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const album = await one(c, `SELECT * FROM album_designs WHERE id = ?`, id);
  if (!album) return c.json({ error: 'not_found' }, 404);

  const compls = await all(c, `SELECT * FROM album_completions WHERE album_id = ?`, id);
  const trashId = await moveToTrash(c, 'album', album, { album_completions: compls });

  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM album_completions WHERE album_id = ?`).bind(id),
    c.env.DB.prepare(`DELETE FROM album_designs WHERE id = ?`).bind(id),
  ]);
  return c.json({ ok: true, trashId });
});

// ── 相册子任务 ─────────────────────────────────────────
// 从 ALBUM_TEMPLATES_R5 正向推进生成,start_date + daysAfterStart
app.get('/:id/tasks', async (c) => {
  const id = c.req.param('id');
  const album = await one<{ id: string; startDate: string; clientName: string }>(
    c,
    `SELECT id, start_date, client_name FROM album_designs WHERE id = ?`,
    id,
  );
  if (!album) return c.json({ error: 'not_found' }, 404);

  const compls = await all<{ taskTemplateId: string }>(
    c,
    `SELECT task_template_id FROM album_completions WHERE album_id = ?`,
    id,
  );
  const done = new Set(compls.map((r) => r.taskTemplateId));

  const tasks = ALBUM_TEMPLATES_R5.map((t) => ({
    id: t.id,
    name: t.name,
    duration: t.duration,
    description: t.description,
    roleId: 'r5',
    albumId: id,
    daysAfterStart: t.daysAfterStart,
    dueDate: addDays(album.startDate, t.daysAfterStart),
    completionKey: `album_${id}_${t.id}`,
    completed: done.has(t.id),
  }));

  return c.json({ tasks });
});

app.post('/:id/tasks/:templateId/complete', async (c) => {
  const id = c.req.param('id');
  const templateId = c.req.param('templateId');

  const album = await one(c, `SELECT id FROM album_designs WHERE id = ?`, id);
  if (!album) return c.json({ error: 'not_found' }, 404);

  await c.env.DB
    .prepare(`INSERT OR REPLACE INTO album_completions (album_id, task_template_id, completed_at, completed_by)
              VALUES (?, ?, ?, ?)`)
    .bind(id, templateId, Date.now(), c.var.user.email)
    .run();
  return c.json({ ok: true });
});

app.delete('/:id/tasks/:templateId/complete', async (c) => {
  const id = c.req.param('id');
  const templateId = c.req.param('templateId');
  await c.env.DB
    .prepare(`DELETE FROM album_completions WHERE album_id = ? AND task_template_id = ?`)
    .bind(id, templateId)
    .run();
  return c.json({ ok: true });
});

export default app;
