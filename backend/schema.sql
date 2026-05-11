-- 摄影工作室管理台 — D1 schema
-- 用法:
--   本地:cd backend && npm run db:apply
--   线上:cd backend && npm run db:apply:remote

PRAGMA foreign_keys = ON;

-- ── 用户 ─────────────────────────────────────────────
-- 邮箱来自 Cloudflare Access。owner 由你手动升级,其他人首次登录默认 assistant。
-- assigned_roles 是 JSON 数组(SQLite 没有原生 JSON 列,用 TEXT 存),例如 '["r4","r7"]'
CREATE TABLE IF NOT EXISTS users (
  email          TEXT PRIMARY KEY,
  name           TEXT,
  role           TEXT NOT NULL DEFAULT 'assistant',  -- 'owner' / 'assistant'
  assigned_roles TEXT NOT NULL DEFAULT '[]',
  created_at     INTEGER NOT NULL
);

-- ── 职位 ─────────────────────────────────────────────
-- SQLite 没有布尔类型,用 INTEGER 0/1
CREATE TABLE IF NOT EXISTS roles (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  icon              TEXT,
  duties            TEXT,
  color             TEXT,
  is_assistant      INTEGER NOT NULL DEFAULT 0,
  supports_projects INTEGER NOT NULL DEFAULT 0,
  display_order     INTEGER NOT NULL DEFAULT 0
);

-- ── 日常任务 ─────────────────────────────────────────
-- frequency: '每日' / '每周' / '每月' / '临时'
-- due_date: 只在 frequency='临时' 时填,格式 'YYYY-MM-DD'
-- is_weekly: 在本周待办视图显示
CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  role_id        TEXT NOT NULL,
  name           TEXT NOT NULL,
  frequency      TEXT NOT NULL,
  duration       INTEGER,
  description    TEXT,
  due_date       TEXT,
  is_weekly      INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  parent_task_id TEXT,                       -- 自引用:子任务指向父;顶层任务为 NULL
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ── 任务完成记录(按日期独立) ───────────────────────
-- 每个 (task_id, completion_date) 一行 — 同一个任务每天都能独立完成,支持每日重置
CREATE TABLE IF NOT EXISTS task_completions (
  task_id         TEXT NOT NULL,
  completion_date TEXT NOT NULL,   -- 'YYYY-MM-DD'
  completed_at    INTEGER NOT NULL,
  completed_by    TEXT,
  PRIMARY KEY (task_id, completion_date),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- ── 拍摄项目 ─────────────────────────────────────────
-- shoot_type: '婚纱'/'婚礼'/'儿童写真'/'家庭写真'/'商业产品'/'形象写真'/'活动跟拍'/'其他'
-- 子任务不存表,而是基于 PROJECT_TASK_TEMPLATES + shoot_date 动态计算
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  shoot_type  TEXT NOT NULL,
  shoot_date  TEXT NOT NULL,        -- 'YYYY-MM-DD'
  location    TEXT,
  notes       TEXT,
  created_at  INTEGER NOT NULL
);

-- ── 项目任务完成(主摄/二摄/修图师) ─────────────────
-- 子任务由模板生成,这里只存哪个 (project, template, role) 完成了
CREATE TABLE IF NOT EXISTS project_completions (
  project_id       TEXT NOT NULL,
  task_template_id TEXT NOT NULL,   -- e.g. 'pt1_3'(主摄模板第 3 步)
  role_id          TEXT NOT NULL,
  completed_at     INTEGER NOT NULL,
  completed_by     TEXT,
  PRIMARY KEY (project_id, task_template_id, role_id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- ── 相册设计(独立,不与拍摄项目联动) ───────────────
CREATE TABLE IF NOT EXISTS album_designs (
  id          TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  album_type  TEXT,
  start_date  TEXT NOT NULL,        -- 'YYYY-MM-DD'(正向推进的起点)
  notes       TEXT,
  created_at  INTEGER NOT NULL
);

-- ── 相册任务完成 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS album_completions (
  album_id         TEXT NOT NULL,
  task_template_id TEXT NOT NULL,   -- e.g. 'pt5_2'
  completed_at     INTEGER NOT NULL,
  completed_by     TEXT,
  PRIMARY KEY (album_id, task_template_id),
  FOREIGN KEY (album_id) REFERENCES album_designs(id)
);

-- ── 附件 ────────────────────────────────────────────
-- 单表 polymorphic:一个 attachment 可挂在 task / project / album 上。
-- 文件本身存在 R2(env.BUCKET),这里只存元数据。r2_key 是桶内的对象键。
-- 删除父实体时由路由层 cascade 清理(物理删父 → 同时清 R2 + 此表;trash 软删时保留)。
CREATE TABLE IF NOT EXISTS attachments (
  id           TEXT PRIMARY KEY,
  parent_type  TEXT NOT NULL,              -- 'task' / 'project' / 'album'
  parent_id    TEXT NOT NULL,
  r2_key       TEXT NOT NULL,              -- '<type>s/<parent_id>/<att_id>-<filename>'
  filename     TEXT NOT NULL,              -- 用户上传时的原文件名
  content_type TEXT,                       -- MIME
  size_bytes   INTEGER NOT NULL,
  uploaded_at  INTEGER NOT NULL,
  uploaded_by  TEXT                        -- email
);

-- ── 回收站(30 天恢复期) ──────────────────────────
-- type: 'task' / 'project' / 'album' / 'role'
-- item_data: 被删项目的完整 JSON(恢复时直接 INSERT 回原表)
-- related_data: 相关完成记录 JSON(例如删任务连带删的 task_completions)
CREATE TABLE IF NOT EXISTS trash (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  item_data    TEXT NOT NULL,
  related_data TEXT,
  deleted_at   INTEGER NOT NULL,
  deleted_by   TEXT
);

-- ── 索引 ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_role         ON tasks(role_id);
CREATE INDEX IF NOT EXISTS idx_tasks_weekly       ON tasks(is_weekly) WHERE is_weekly = 1;
CREATE INDEX IF NOT EXISTS idx_completions_date   ON task_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_projects_date      ON projects(shoot_date);
CREATE INDEX IF NOT EXISTS idx_albums_start       ON album_designs(start_date);
CREATE INDEX IF NOT EXISTS idx_trash_deleted      ON trash(deleted_at);
CREATE INDEX IF NOT EXISTS idx_proj_compl_project ON project_completions(project_id);
CREATE INDEX IF NOT EXISTS idx_attachments_parent ON attachments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
