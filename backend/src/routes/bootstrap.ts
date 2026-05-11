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
  const roles = await all(c, `SELECT * FROM roles ORDER BY display_order`);
  // tasks 按用户权限过滤
  let tasks: unknown[] = [];
  if (user.role === 'owner') {
    tasks = await all(c, `SELECT * FROM tasks ORDER BY role_id, id`);
  } else if (user.assignedRoles.length > 0) {
    const placeholders = user.assignedRoles.map(() => '?').join(',');
    tasks = await all(c, `SELECT * FROM tasks WHERE role_id IN (${placeholders}) ORDER BY role_id, id`, ...user.assignedRoles);
  }
  const projects = await all(c, `SELECT * FROM projects ORDER BY shoot_date DESC`);
  const albumDesigns = await all(c, `SELECT * FROM album_designs ORDER BY start_date DESC`);

  // trash 只 owner 看;assistant 给空数组(权限 UI 上隐藏 tab 即可)
  const trash =
    user.role === 'owner'
      ? await all(c, `SELECT id, type, item_data, related_data, deleted_at, deleted_by FROM trash ORDER BY deleted_at DESC`)
      : [];

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
  });
});

export default app;
