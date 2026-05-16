-- 一次性迁移:把"临时"任务的完成记录从"按日期"改为固定哨兵 'once'。
-- 背景:临时任务是一次性的,但旧逻辑按 completion_date=当天 存,跨天会"复活"。
-- 新逻辑统一用 completion_date='once'。这里把历史已完成的临时任务合并成单条 'once' 行。
--
-- 运行:cd backend && wrangler d1 execute studio_db --remote --file=./migrations/2026-05-16-temp-task-once.sql
-- 本地同理把 --remote 换 --local。幂等:重跑无副作用(已是 'once' 的不受影响)。

-- 1) 每个临时任务取"最近一次完成"写成 'once' 行(INSERT OR REPLACE 防 PK 冲突)
INSERT OR REPLACE INTO task_completions (task_id, completion_date, completed_at, completed_by)
SELECT tc.task_id, 'once', tc.completed_at, tc.completed_by
FROM task_completions tc
JOIN tasks t ON t.id = tc.task_id AND t.frequency = '临时'
WHERE tc.completion_date <> 'once'
  AND tc.completed_at = (
    SELECT MAX(tc2.completed_at)
    FROM task_completions tc2
    WHERE tc2.task_id = tc.task_id AND tc2.completion_date <> 'once'
  );

-- 2) 删掉这些临时任务的旧"按日期"完成行,只留 'once'
DELETE FROM task_completions
WHERE completion_date <> 'once'
  AND task_id IN (SELECT id FROM tasks WHERE frequency = '临时');
