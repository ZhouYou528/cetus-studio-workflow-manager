import { Hono } from 'hono';
import type { Bindings } from '../index';
import { all, genId, moveToTrash, one } from '../db';
import type { AuthUser } from '../db';
import {
  addDays,
  getProjectTemplate,
  isWeddingType,
  MARKETING_TEMPLATES,
  PROJECT_TEMPLATES_R1,
} from '../templates';

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>();

// ── 列表 / 创建 / 修改 / 软删 ──────────────────────────────
app.get('/', async (c) => {
  const projects = await all(c, `SELECT * FROM projects ORDER BY shoot_date DESC`);
  return c.json({ projects });
});

app.post('/', async (c) => {
  const body = await c.req.json<{
    clientName: string;
    shootType: string;
    shootDate: string;
    location?: string;
    notes?: string;
  }>();
  if (!body.clientName || !body.shootType || !body.shootDate) {
    return c.json({ error: 'missing_fields' }, 400);
  }
  const id = genId('p');
  await c.env.DB
    .prepare(`INSERT INTO projects (id, client_name, shoot_type, shoot_date, location, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.clientName, body.shootType, body.shootDate, body.location ?? null, body.notes ?? null, Date.now())
    .run();
  const created = await one(c, `SELECT * FROM projects WHERE id = ?`, id);
  return c.json(created, 201);
});

app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<{
    clientName: string;
    shootType: string;
    shootDate: string;
    location: string | null;
    notes: string | null;
  }>>();
  const exists = await one(c, `SELECT id FROM projects WHERE id = ?`, id);
  if (!exists) return c.json({ error: 'not_found' }, 404);

  const map: Record<string, string> = {
    clientName: 'client_name',
    shootType: 'shoot_type',
    shootDate: 'shoot_date',
    location: 'location',
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
  await c.env.DB.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  const updated = await one(c, `SELECT * FROM projects WHERE id = ?`, id);
  return c.json(updated);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const project = await one(c, `SELECT * FROM projects WHERE id = ?`, id);
  if (!project) return c.json({ error: 'not_found' }, 404);

  const compls = await all(c, `SELECT * FROM project_completions WHERE project_id = ?`, id);
  const trashId = await moveToTrash(c, 'project', project, { project_completions: compls });

  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM project_completions WHERE project_id = ?`).bind(id),
    c.env.DB.prepare(`DELETE FROM projects WHERE id = ?`).bind(id),
  ]);
  return c.json({ ok: true, trashId });
});

// ── 项目子任务 ──────────────────────────────────────────
// GET /api/projects/:id/tasks?role_id=r1|r2|r3
// 动态从模板生成,带 due_date 和 completed 状态。
// r2 只在 婚礼 项目下返回;r3 在主摄全部完成前返回空数组(项目还没到修图阶段)。
app.get('/:id/tasks', async (c) => {
  const id = c.req.param('id');
  const roleId = c.req.query('role_id') ?? 'r1';

  const project = await one<{ id: string; shootType: string; shootDate: string; clientName: string }>(
    c,
    `SELECT id, shoot_type, shoot_date, client_name FROM projects WHERE id = ?`,
    id,
  );
  if (!project) return c.json({ error: 'project_not_found' }, 404);

  // r2 只支持婚礼项目
  if (roleId === 'r2' && project.shootType !== '婚礼') {
    return c.json({ tasks: [] });
  }
  // r3 需要主摄全部完成
  if (roleId === 'r3') {
    const r1Done = await isR1Completed(c, id);
    if (!r1Done) return c.json({ tasks: [], waiting: 'r1_incomplete' });
  }

  const template = getProjectTemplate(roleId);
  if (template.length === 0) return c.json({ tasks: [] });

  const compls = await all<{ taskTemplateId: string }>(
    c,
    `SELECT task_template_id FROM project_completions WHERE project_id = ? AND role_id = ?`,
    id,
    roleId,
  );
  const done = new Set(compls.map((r) => r.taskTemplateId));

  const tasks = template.map((t) => ({
    id: t.id,
    name: t.name,
    duration: t.duration,
    description: t.description,
    roleId,
    projectId: id,
    daysBeforeShoot: t.daysBeforeShoot,
    dueDate: addDays(project.shootDate, -t.daysBeforeShoot),
    completionKey: `${id}_${roleId}_${t.id}`,
    completed: done.has(t.id),
  }));

  return c.json({ tasks });
});

// 完成 / 取消完成项目子任务
app.post('/:id/tasks/:templateId/complete', async (c) => {
  const id = c.req.param('id');
  const templateId = c.req.param('templateId');
  const body = await c.req.json<{ roleId: string }>().catch(() => ({ roleId: '' }));
  const roleId = body.roleId;
  if (!roleId) return c.json({ error: 'role_id_required' }, 400);

  const project = await one(c, `SELECT id FROM projects WHERE id = ?`, id);
  if (!project) return c.json({ error: 'project_not_found' }, 404);

  await c.env.DB
    .prepare(`INSERT OR REPLACE INTO project_completions (project_id, task_template_id, role_id, completed_at, completed_by)
              VALUES (?, ?, ?, ?, ?)`)
    .bind(id, templateId, roleId, Date.now(), c.var.user.email)
    .run();
  return c.json({ ok: true });
});

app.delete('/:id/tasks/:templateId/complete', async (c) => {
  const id = c.req.param('id');
  const templateId = c.req.param('templateId');
  const roleId = c.req.query('role_id');
  if (!roleId) return c.json({ error: 'role_id_required' }, 400);

  await c.env.DB
    .prepare(`DELETE FROM project_completions WHERE project_id = ? AND task_template_id = ? AND role_id = ?`)
    .bind(id, templateId, roleId)
    .run();
  return c.json({ ok: true });
});

// ── Marketing 联动 ─────────────────────────────────────
// GET /api/projects/marketing/linked-tasks
// 返回所有"已完成拍摄的 婚礼/婚纱 项目"对应的 r7 联动任务(博客/IG/小红书),
// 带各自完成态。前端 TodayView 把这些和普通 r7 任务合并展示。
app.get('/marketing/linked-tasks', async (c) => {
  const projects = await all<{ id: string; clientName: string; shootType: string; shootDate: string }>(
    c,
    `SELECT id, client_name, shoot_type, shoot_date FROM projects WHERE shoot_type IN ('婚礼', '婚纱')`,
  );
  if (projects.length === 0) return c.json({ tasks: [] });

  // 判断哪些项目的 r1 已全部完成
  const eligibleProjects: typeof projects = [];
  for (const p of projects) {
    if (await isR1Completed(c, p.id)) eligibleProjects.push(p);
  }
  if (eligibleProjects.length === 0) return c.json({ tasks: [] });

  // 取这些项目的 r7 完成记录
  const placeholders = eligibleProjects.map(() => '?').join(',');
  const compls = await all<{ projectId: string; taskTemplateId: string }>(
    c,
    `SELECT project_id, task_template_id FROM project_completions
     WHERE role_id = 'r7' AND project_id IN (${placeholders})`,
    ...eligibleProjects.map((p) => p.id),
  );
  const doneSet = new Set(compls.map((r) => `${r.projectId}_${r.taskTemplateId}`));

  const tasks = [];
  for (const p of eligibleProjects) {
    for (const tpl of MARKETING_TEMPLATES) {
      tasks.push({
        id: `${tpl.id}_${p.id}`,
        name: tpl.nameFmt.replace('{client}', p.clientName).replace('{type}', p.shootType),
        description: tpl.descFmt.replace('{client}', p.clientName).replace('{type}', p.shootType),
        duration: tpl.duration,
        frequency: '项目联动',
        roleId: 'r7',
        projectId: p.id,
        templateId: tpl.id,
        completionKey: `linked_${tpl.id}_${p.id}`,
        completed: doneSet.has(`${p.id}_${tpl.id}`),
      });
    }
  }

  return c.json({ tasks });
});

// 内部:r1 模板是否全部已完成?
async function isR1Completed(c: { env: Bindings }, projectId: string): Promise<boolean> {
  const row = await c.env.DB
    .prepare(`SELECT COUNT(*) AS n FROM project_completions WHERE project_id = ? AND role_id = 'r1'`)
    .bind(projectId)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= PROJECT_TEMPLATES_R1.length;
}

export default app;
