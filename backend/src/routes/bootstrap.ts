// GET /api/bootstrap — 一次拿全应用初始数据。
//
// 设计意图:前端原 Artifact 的 useEffect 一次性读全部 JSON。Phase 5 用一个 endpoint 模拟同样的形状,
// 让 useEffect 改动最小。后续(Phase 6)如有性能问题再拆分。
//
// completion 键格式:用 '|' 分隔(项目 ID 自身含 '_',用 '_' 会有歧义)
//   - daily task:   `${taskId}|${YYYY-MM-DD}`(今日日期)
//   - linked Marketing:`linked|${templateId}|${projectId}`
//   - project sub:  `${projectId}|${roleId}|${templateId}`
//   - album sub:    `album|${albumId}|${templateId}`

import { Hono } from 'hono';
import type { Bindings } from '../index';
import type { AuthUser } from '../db';
import { all } from '../db';

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const user = c.var.user;
  // 前端可以传 ?date=YYYY-MM-DD 覆盖,处理时区差异(Worker 跑在 UTC)
  const queryDate = c.req.query('date');
  const todayKey = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)
    ? queryDate
    : new Date().toISOString().slice(0, 10);

  // ── 主表 ────────────────────────────────────────
  // roles 和 tasks 都按用户权限过滤:
  //   - owner 全部可见
  //   - assistant 只见 assignedRoles 里的(没分配 → 空数组)
  // 这样"职位职责" tab 自动只展示用户能管的卡片。
  let roles: unknown[] = [];
  let tasks: unknown[] = [];
  if (user.role === 'owner') {
    roles = await all(c, `SELECT * FROM roles ORDER BY display_order`);
    tasks = await all(c, `SELECT * FROM tasks ORDER BY role_id, id`);
  } else if (user.assignedRoles.length > 0) {
    const placeholders = user.assignedRoles.map(() => '?').join(',');
    roles = await all(c, `SELECT * FROM roles WHERE id IN (${placeholders}) ORDER BY display_order`, ...user.assignedRoles);
    tasks = await all(c, `SELECT * FROM tasks WHERE role_id IN (${placeholders}) ORDER BY role_id, id`, ...user.assignedRoles);
  }
  const projects = await all(c, `SELECT * FROM projects ORDER BY shoot_date DESC`);
  const albumDesigns = await all(c, `SELECT * FROM album_designs ORDER BY start_date DESC`);

  // trash:owner 看全部;assistant 看自己删除的(by deleted_by)
  const trash = user.role === 'owner'
    ? await all(c, `SELECT id, type, item_data, related_data, deleted_at, deleted_by FROM trash ORDER BY deleted_at DESC`)
    : await all(c, `SELECT id, type, item_data, related_data, deleted_at, deleted_by FROM trash WHERE deleted_by = ? ORDER BY deleted_at DESC`, user.email);

  // ── 三种 completion 字典 ──────────────────────────
  // completions: 今天的日常任务完成 + Marketing 联动完成(后者无日期)
  const dailyRows = await all<{ taskId: string; completedAt: number }>(
    c,
    `SELECT task_id, completed_at FROM task_completions WHERE completion_date = ?`,
    todayKey,
  );
  const completions: Record<string, number> = {};
  for (const r of dailyRows) {
    completions[`${r.taskId}|${todayKey}`] = r.completedAt;
  }
  // Marketing 联动完成放进同一 `completions` 字典(前端原行为一致)
  const linkedRows = await all<{ projectId: string; taskTemplateId: string; completedAt: number }>(
    c,
    `SELECT project_id, task_template_id, completed_at FROM project_completions WHERE role_id = 'r7'`,
  );
  for (const r of linkedRows) {
    completions[`linked|${r.taskTemplateId}|${r.projectId}`] = r.completedAt;
  }

  // projectCompletions: 排除 Marketing(r7),那部分已放进 completions
  const projCompRows = await all<{ projectId: string; roleId: string; taskTemplateId: string; completedAt: number }>(
    c,
    `SELECT project_id, role_id, task_template_id, completed_at FROM project_completions WHERE role_id != 'r7'`,
  );
  const projectCompletions: Record<string, number> = {};
  for (const r of projCompRows) {
    projectCompletions[`${r.projectId}|${r.roleId}|${r.taskTemplateId}`] = r.completedAt;
  }

  // albumCompletions
  const albCompRows = await all<{ albumId: string; taskTemplateId: string; completedAt: number }>(
    c,
    `SELECT album_id, task_template_id, completed_at FROM album_completions`,
  );
  const albumCompletions: Record<string, number> = {};
  for (const r of albCompRows) {
    albumCompletions[`album|${r.albumId}|${r.taskTemplateId}`] = r.completedAt;
  }

  // 附件:用 Map 按 parent 分组,前端按需读取
  // 不做权限过滤(可见 parent 列表已过滤,因此查到的 attachments 自然只属于可见 parent)
  // 注:任务对 assistant 已过滤,所以 attachments 表里那些 parent_type='task' 的也要按可见 task ids 过滤
  const visibleTaskIds = (tasks as { id: string }[]).map((t) => t.id);
  const visibleProjectIds = (projects as { id: string }[]).map((p) => p.id);
  const visibleAlbumIds = (albumDesigns as { id: string }[]).map((a) => a.id);

  type AttRow = { id: string; parentType: string; parentId: string; filename: string; contentType: string | null; sizeBytes: number; uploadedAt: number; uploadedBy: string | null };
  let attachments: AttRow[] = [];
  if (visibleTaskIds.length || visibleProjectIds.length || visibleAlbumIds.length) {
    const clauses: string[] = [];
    const binds: unknown[] = [];
    if (visibleTaskIds.length) {
      clauses.push(`(parent_type = 'task' AND parent_id IN (${visibleTaskIds.map(() => '?').join(',')}))`);
      binds.push(...visibleTaskIds);
    }
    if (visibleProjectIds.length) {
      clauses.push(`(parent_type = 'project' AND parent_id IN (${visibleProjectIds.map(() => '?').join(',')}))`);
      binds.push(...visibleProjectIds);
    }
    if (visibleAlbumIds.length) {
      clauses.push(`(parent_type = 'album' AND parent_id IN (${visibleAlbumIds.map(() => '?').join(',')}))`);
      binds.push(...visibleAlbumIds);
    }
    attachments = await all<AttRow>(
      c,
      `SELECT id, parent_type, parent_id, filename, content_type, size_bytes, uploaded_at, uploaded_by
       FROM attachments WHERE ${clauses.join(' OR ')} ORDER BY uploaded_at DESC`,
      ...binds,
    );
  }

  return c.json({
    user,
    today: todayKey,
    roles,
    tasks,
    projects,
    albumDesigns,
    trash,
    completions,
    projectCompletions,
    albumCompletions,
    attachments,
  });
});

export default app;
