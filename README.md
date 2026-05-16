# 摄影工作室管理台

把 Claude Artifact 里的摄影工作室管理 React app 迁移成可自部署的 SaaS。

**技术栈**
- **前端**:React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + lucide-react → Cloudflare Pages
- **后端**:Cloudflare Workers + Hono 4 + TypeScript
- **数据库**:Cloudflare D1(SQLite)
- **认证**:Cloudflare Access(邮箱验证码 / 零信任,免费版)

---

## 目录结构

```
studio-workflow-manager/
├── frontend/                      # React SPA(Vite)
│   └── src/
│       ├── StudioWorkflowManager.tsx   # 主组件:state + 数据层 + tab 路由
│       ├── main.tsx
│       ├── index.css                   # 仅 @import "tailwindcss"
│       ├── lib/
│       │   ├── api.ts                  # 所有 endpoint 的 typed fetch 封装
│       │   └── types.ts                # 共享业务类型
│       ├── components/                 # 9 个独立可复用组件
│       │   ├── ConfirmDialog.tsx
│       │   ├── RoleModal.tsx
│       │   ├── TaskModal.tsx
│       │   ├── ProjectModal.tsx
│       │   ├── AlbumModal.tsx
│       │   ├── SplitModal.tsx
│       │   ├── ProjectTaskCard.tsx
│       │   ├── ProjectCard.tsx
│       │   └── AlbumCard.tsx
│       └── views/                      # 3 个 tab 视图
│           ├── TodayView.tsx
│           ├── WeeklyView.tsx
│           └── TrashView.tsx
│
└── backend/                       # Cloudflare Worker(Hono)
    └── src/
        ├── index.ts                    # Hono app + 路由挂载
        ├── auth.ts                     # Access header → c.var.user 中间件
        ├── db.ts                       # D1 查询助手、snake↔camel、moveToTrash、ID 生成
        ├── templates.ts                # 项目/相册任务模板 + 日期推算
        └── routes/
            ├── bootstrap.ts            # GET /api/bootstrap 一次返全部初始数据
            ├── users.ts                # GET/PATCH 用户
            ├── roles.ts                # 职位 CRUD
            ├── tasks.ts                # 日常任务 CRUD + today/weekly + 完成态
            ├── projects.ts             # 拍摄项目 CRUD + 动态子任务 + Marketing 联动
            ├── albums.ts               # 相册设计 CRUD + 正向推进子任务
            └── trash.ts                # 回收站:列表 / 恢复 / 永删 / 清空
        # schema.sql, seed.sql, wrangler.toml 在 backend/ 根目录
```

---

## 本地开发

需要 Node.js ≥ 20 和 npm。

### 启动前端

```bash
cd frontend
npm install          # 首次
npm run dev          # http://localhost:5173
```

Vite 配置了把 `/api/*` 反向代理到 `127.0.0.1:8787`(后端 Worker),所以前后端在浏览器里看起来是同域。

### 启动后端

```bash
cd backend
npm install          # 首次
npm run dev          # http://127.0.0.1:8787
```

冒烟测试:
```bash
curl http://127.0.0.1:8787/api/health
curl http://127.0.0.1:8787/api/me
```

### 数据库

本地 D1 是 `.wrangler/state/v3/d1/` 下一个真实的 SQLite 文件,数据跨重启持久化。

```bash
cd backend
npm run db:apply     # 建表
npm run db:seed      # 灌默认数据(10 职位 + 36 默认任务)

# 想清空重来
rm -rf .wrangler/state && npm run db:apply && npm run db:seed

# 直接看数据库
npx wrangler d1 execute studio_db --local --command "SELECT id, name FROM roles;"
```

---

## 开发阶段进度

- [x] **Phase 1**:项目骨架 — Vite + React + TS + Tailwind v4;Hono + Wrangler;Artifact 代码原样接入 + localStorage shim;`/api/health` + `/api/me`
- [x] **Phase 2**:D1 schema(9 张表 + 索引)+ seed(10 职位 + 36 默认任务);本地 SQLite 自动建库
- [x] **Phase 3**:后端核心 API — auth 中间件(Access header + 自动建用户 + OWNER_EMAILS 白名单);users / roles / tasks 全套 CRUD + 完成态(`POST /:id/complete?date=`)+ 权限过滤(assistant 仅见 assignedRoles)
- [x] **Phase 4**:后端进阶 API — projects / albums / trash;项目动态子任务(r1/r2/r3 倒推 + r5 正推);Marketing 联动(婚礼/婚纱 + r1 全部完成时自动生成 3 任务);trash 30 天 lazy 清理 + 恢复时回写完成记录
- [x] **Phase 5**:前端数据层切到 API — `lib/api.ts` typed 封装;9 个 `updateXxx` 内部改 diff + API(签名不变);`useEffect` → `api.bootstrap()` 一次拉全部;completionKey 分隔符 `_` → `|`;删 `storage-shim.ts`
- [x] **Phase 6a**:Phase 5 技术债修复 — 6 处 `startsWith` 残留分隔符;级联删除走 `setXxx` 消除 404 噪音;时区:前端按本地 TZ 拼 `?date=&dow=&dom=` 传给后端,服务器默认 UTC 兜底;DELETE 路由返回 `trashId` 让删除后立刻能恢复
- [x] **Phase 6b**:拆组件 + 加类型 — 主文件 2050 → 1122 行;抽出 6 个 Modal/Dialog、3 个 Card、3 个 View 到独立文件;每个组件加 props 类型;共享类型在 `lib/types.ts`
- [x] **Phase 7**:GitHub 私有仓库,持续 push
- [x] **Phase 8**:Cloudflare 部署 — 远程 D1 + Worker + Pages + 服务绑定 + Cloudflare Access(邮箱 OTP 登录,team domain `cetus-studio.cloudflareaccess.com`)+ Users 管理 tab(owner 给队友分配 assignedRoles)+ 顶栏 Sign Out + 用户名(name)字段:`PATCH /api/me` 任何用户自改 name,顶栏点击邮箱区域弹自编辑;assistant 在职位职责 tab 只能看到自己 assignedRoles 里的职位卡片
- [x] **Phase 9**:嵌套子任务 — `tasks` 表加 `parent_task_id` + 索引;任务可拆解成子任务,子任务再可拆解(后端限制最多 5 层);子任务继承父任务的 `roleId`(避免跨职位污染);删除父任务时 BFS 收集所有后代一起进回收站,恢复时整树重建;前端通用 `SubtaskTree` 递归组件 — 顶层任务行加 ▶/▼ 展开按钮 + `N/M` 完成度徽章,展开后行内输入框「+ 添加子任务」直接 Enter 提交;3 处任务渲染(职位职责 tab、TodayView、WeeklyView)统一过滤 `!parentTaskId` 只显示顶层,子任务嵌在父任务展开里
- [x] **Phase 10**:杂项 UX/逻辑修复 — ①Marketing 联动触发条件由「主摄 r1 完成」改为「修图师 r3 完成」;②联动 blog/IG/小红书 任务做成「更新blog/更新Instagram/更新婚礼小红书」三个周任务的显示层子任务(不写 DB,完成走 `linked|` key);③每个 tab 独立 URL(History API + Pages `_redirects` SPA 兜底),刷新不回今日待办;④今日待办/本周待办区域改可折叠卡片网格(对齐职位职责 UX);⑤**临时任务加截止日**:`TaskModal` 仅「临时」显示日期选择器,自动 `isWeekly=true` 进本周待办,职位职责行按紧急程度标色徽章;⑥**修临时任务完成语义**:完成 key 统一走 `lib/taskKey.ts`,临时任务用 `|once` 哨兵替代日期 → 完成一次永久完成(跨天不复活),配套一次性迁移 `migrations/2026-05-16-temp-task-once.sql`;⑦修 SubtaskTree 内部 `ckey` 未走共享 `taskCompletionKey` 导致「临时子任务勾不上但计数会变」的读写 key 不一致;⑧**今日待办按用户职位过滤**:`todayTasks` 加 `isVisibleRole(t.roleId)` 过滤(原来只靠 bootstrap 过滤,assistant 看到的今日待办仍可能混入非自己职位的任务),owner 不受影响(`isVisibleRole` 对 owner 恒真)

---

## 关键设计说明

**Cloudflare 全家桶速记**
- **Worker**:边缘函数,跑 Hono 路由,启动 0ms,免费层够用
- **D1**:Workers 自带的 SQLite,跑在边缘节点;本地 `wrangler dev` 自动镜像到磁盘
- **Pages**:静态前端托管 + 全球 CDN;通过 Pages Functions 把 `/api/*` 同域转发给 Worker
- **Access**:零信任登录代理,挡在 Worker 前用邮箱验证码登录,自动在每个请求头里塞 `Cf-Access-Authenticated-User-Email`,后端读这个 header 识别用户

**认证 + 用户自举**
- 本地:`wrangler.toml` 里设 `DEV_USER_EMAIL`,`auth.ts` 拿不到 Access header 时回退到这个邮箱
- 首次登录的邮箱:若在 `OWNER_EMAILS` 白名单内 → `role='owner'`,否则 `'assistant'`(`assignedRoles=[]`,需 owner 手动升级)
- assistant 只看到 `assignedRoles` 内的职位/任务;owner 看全部

**数据形态边界**
- DB 列是 snake_case(`role_id` / `is_assistant`),API 响应是 camelCase(`roleId` / `isAssistant`)
- `backend/src/db.ts` 的 `rowToCamel` / `rowsToCamel` 在边界自动转;布尔列 0/1 自动转 bool;JSON 列(`assigned_roles`、`item_data`、`related_data`)自动解析

**Bootstrap 模式**
- `GET /api/bootstrap` 一次返回所有应用状态(roles/tasks/projects/albumDesigns/trash + 3 个 completion 字典),形状对齐前端 9 个 state slot,使 `useEffect` 极简
- bootstrap 按用户权限过滤:owner 全部可见;assistant 只见 `assignedRoles` 里的 roles + tasks(职位职责 tab 自动只展示能管的卡片);trash 也只 owner 看到
- 前端 9 个 `updateXxx` 函数签名保持原样,内部 diff 当前 state vs 新值,触发增/删/改 API。组件代码完全不知道有 API

**完成态键格式**(全用 `|` 分隔,避免 `p_abc_r1_pt1_3` 这种含 `_` 的 ID 解析歧义)
- 日常任务:`${taskId}|${YYYY-MM-DD}` (`task_completions` 表)
- 项目子任务:`${projectId}|${roleId}|${templateId}` (`project_completions` 表)
- 相册子任务:`album|${albumId}|${templateId}` (`album_completions` 表)
- Marketing 联动:`linked|${templateId}|${projectId}`(后端实际存 `project_completions` 的 r7 行)

**时区**
- Worker 永远跑 UTC。前端 `localDateParams()` 拼出本地 TZ 的 `date=YYYY-MM-DD&dow=N&dom=N` 传给 bootstrap / tasks/today / tasks/weekly,后端识别这些参数后用它们,缺省时 fallback UTC

**修 bug:项目任务按角色过滤**
- `getTodayProjectTasks()` 之前对所有 project 硬循环 `r1/r3/r2`,无视当前用户角色
- 现在加 `isVisibleRole(roleId)`:owner 全可见;assistant 仅 `assignedRoles` 里的
- 副作用:主摄建项目后,只有主摄/owner 在「今日待办」看到 r1 任务;二摄/修图/广告设计等队友看不到不该看到的

**附件 cascade 清理**
- **进回收站时附件保留**(支持 30 天内恢复时附件随同回来)
- **永久删除 / 清空回收站 / 30 天自动清理**:同步清掉 R2 对象 + `attachments` DB 行
- role 类型的 trash:级联到该 role 下所有 task 的附件
- `cleanAttachmentsFor()` helper 集中处理:先 SELECT 出 r2_key,并行 `BUCKET.delete()`,再批 `DELETE FROM attachments`

**任务行细节展示**
- 任务行的右侧加 `📎 N` 小徽章(只在有附件时显示)
- 任务行下方追加一行 `text-xs line-clamp-2` 显示 description 预览
- 3 处任务渲染:TodayView 日常任务、WeeklyView 周任务、职位职责 tab 任务清单
- 主文件 `useMemo` 算 `taskAttachmentCounts` map,自动跟着 attachments 状态变化

**嵌套子任务**
- DB:`tasks` 表加 `parent_task_id TEXT`(自引用 FK)+ `idx_tasks_parent` 索引;为空 = 顶层任务,非空 = 子任务
- 后端规则:POST `/api/tasks` 接受 `parentTaskId`;**强制继承父的 `roleId`**(避免跨职位污染);写入前往上走父链最多 5 层,超过 5 层返回 `max_depth_exceeded`
- 后端级联删除:DELETE 时 BFS 收集所有后代,把根+后代一起 INSERT 进 `trash.related_data.descendants`,再批量 `DELETE` 任务行 + 关联完成记录;**恢复**时整树重建(根+所有后代)
- 前端组件:`SubtaskTree` 递归组件 — 父组件传 `childrenByParent` map(`useMemo` 派生),自己管展开状态;子行有 checkbox / 编辑 / 删除按钮;末端节点显示 ▶ 加号触发行内输入,Enter 提交,Esc 取消
- 顶层任务行加 `▶/▼ {done}/{total}` 徽章(数字只算直接子级,不深递归);展开后下面挂 `<SubtaskTree>` 显示所有后代树
- 3 处统一过滤 `!parentTaskId`:职位职责 tab `roleTasks.filter` / TodayView 的 `todayTasks` 在主文件 filter 时排除 / WeeklyView 的 `weeklyTasks` 内部 filter
- 完成度只看顶层任务,子任务自成进度(防止 N/M 受嵌套层级影响)

**任务完成态 key(`lib/taskKey.ts`,唯一构造点)**
- 这是个 load-bearing 不变量:勾选/统计/逾期判定**都必须**走 `taskCompletionKey(task, todayKey)`,否则同一任务"写入 key"与"读取 key"会对不上
- 规则:项目联动 → 自带 `completionKey`;**临时任务 → `${id}|once`**(一次性,跨天不复活);每日/每周/每月 → `${id}|${todayKey}`(每天独立)
- `bootstrap.ts` 除了查当天 `completion_date=todayKey`,**还要单独查 `completion_date='once'`** 把临时任务的一次性完成读回来
- 历史数据迁移:`migrations/2026-05-16-temp-task-once.sql` 把临时任务旧的"按日期"完成行合并成单条 `'once'` 行(取最近一次完成),幂等可重跑

**临时任务截止日(deadline)**
- `due_date` 列早已存在,后端 POST/PATCH 已读写;本期补齐前端:`TaskModal` 仅当 `frequency==='临时'` 显示日期选择器
- 保存临时任务时**强制 `isWeekly=true`**(进「本周待办」复用既有管线 + 颜色逻辑);切回非临时则清空 `dueDate` 并 `isWeekly=false`
- 不进「今日待办」(产品决策);职位职责行显示按紧急度标色徽章(逾期/今天 红、≤3 天 橙、其余灰),复用 `due_*`/`overdue_n_days`/`in_n_days` i18n key
- 每日/每周/每月**不支持** deadline(对循环任务无意义)

**附件功能(任务/项目/相册)**
- 存储:**Cloudflare R2** 桶 `studio-attachments`(免费 10 GB,零出站流量费),桶私有所有读写经 Worker
- D1 `attachments` 表 polymorphic(`parent_type` ∈ task/project/album),`r2_key` 是桶内对象键
- 后端:`POST/GET/DELETE /api/attachments/:type/:id` + `GET /api/attachments/:id/download`(Worker 流式返回,带 RFC 5987 中文文件名)
- 限制:**单文件 ≤ 25 MB**;**每父实体 ≤ 20 个**;MIME 白名单(images + PDF + Office + txt/csv/json/zip)
- 权限:task 按 assignedRoles;project/album 任何登录用户可访问
- 前端:`AttachmentsSection` 通用组件(拖拽 + 点击 + 多文件 + 实时进度)嵌入 Task/Project/Album 三个 Modal
- 新建场景禁用上传,提示"保存后才能添加附件"
- bootstrap 同时返回所有 attachments,Modal 不需要额外 fetch

**手机端响应式**
- 顶栏在 `< sm`(< 640px,即手机宽度)自动简化:隐藏副标题 / 隐藏「今日进度 0/3」文本(只留进度环)/ 邮箱用户区折叠成头像式圆形按钮(点击改名)/ 内边距和字体整体缩小
- Tab 栏在窄屏自动横向滚动,字号/padding 缩小
- 主内容区 `px-3 sm:px-4 py-4 sm:py-6` 在小屏紧凑
- Modal 已经是 `w-full max-w-md`,自动占满手机宽度
- 进度环 SVG 用 `pathLength={100}` + 百分比半径,可缩放(`w-10 sm:w-12`)
- 触控目标全部 ≥ 32px (`p-2` 包裹的 icon)

**Dark mode + i18n**
- Tailwind v4 `@custom-variant dark` 启用 class 策略,顶栏右上 🌙 / ☀️ 切换;localStorage 持久化 + 首次访问读 `prefers-color-scheme`
- 所有 slate-* / hover:slate-* 颜色都加了 `dark:` 变体(批量 perl 脚本);五彩状态色(蓝/绿/玫)保持不变
- `lib/i18n.ts` 简易字典(zh/en),`useT()` hook,顶栏 中/EN toggle;**全站 UI 覆盖**(~200 个 key):tabs / headers / 按钮 / 表单 label / Modal 标题 / Confirm Dialog 文案 / Toast 错误 / 空态提示 / Today TIME_SLOTS / Weekly priority labels / Trash 时间段说明 / Users 邀请流程
- 用户数据(role 名、task 名、客户名、项目备注)保留原文 — 这些是 DB 数据,owner 可自行编辑成英文
- 状态共享:`prefs.ts` 用 `useSyncExternalStore` 模块级 store,所有组件同步响应 locale / theme 切换

**`is_assistant` 标志**
- `roles.is_assistant` 表示"这是个一般委派给助理负责的职位"(默认 r4 广告设计 / r7 Marketing / r10 财务)
- 视觉效果:职位职责 tab 自动把核心职位排在前、助理职位归到下方"助理职位"分组;UserEditModal 选择职位时助理标签可见
- 它不影响访问控制(那是 `users.role` + `users.assigned_roles` 的事)

**软删 + 30 天回收站**
- 所有 DELETE 走 `moveToTrash()`:把完整 JSON 存 `trash.item_data`,关联完成记录存 `related_data`,30 天后 `GET /api/trash` lazy 清理
- 恢复:`POST /api/trash/:id/restore` 反向 INSERT 回原表 + 完成记录回写;客户端 setState 直接读 `itemData`,不再走 `updateXxx` diff(避免重复 API 调用)
- 权限:owner 看/操作所有 trash 行;assistant 看/操作自己 `deleted_by=email` 的行 — 每个用户都能撤销自己的误删

**同域部署**
线上前后端共用一个域名 `studio.xxx.com`:Pages 托管前端,通过 Pages Functions 把 `/api/*` 路由给 Worker。本地用 Vite 的 proxy 模拟同域行为。

---

## 线上 URL(Phase 8)

| 资源 | URL | 状态 |
|---|---|---|
| 前端 Pages | https://studio-workflow-manager.pages.dev | ✅ 上线(待 Access 接管) |
| 后端 Worker | https://studio-workflow-manager-api.zy420806143.workers.dev | ✅ 部署,无 Access header 401 |
| 远程 D1 | `studio_db` (UUID `55240b34-7bc1-4fd9-bf12-30c0e4af8dc3`,WNAM 区域) | ✅ 10 职位 + 36 默认任务 |
| Cloudflare Access | team domain `cetus-studio.cloudflareaccess.com`,Policy `Owners only` | ✅ 拦在 Pages 前面 |

**部署命令**(以后改动 push 上线):
```bash
# 后端
cd backend && npm run deploy

# 前端
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=studio-workflow-manager --commit-dirty=true
```

**远程 D1 改表**(schema 改了之后):
```bash
cd backend && npm run db:apply:remote
```

**邀请新队友:**
1. Cloudflare Zero Trust → Access controls → Applications → 这个 app → Policies → 添加他们邮箱
2. 队友访问 https://studio-workflow-manager.pages.dev → 收 OTP 登录
3. 你打开「团队」tab(右上 owner-only),刷新 → 看到新成员 → 点编辑 → 勾选他能管的职位 → 保存

**移除队友:**
- 团队 tab 里点用户旁的🗑️按钮(owner-only,不能删自己)— 从应用 DB 移除用户
- ⚠️ 这**不**阻止他登录;若要彻底拒绝,需去 Access 控制台从 Policy 邮箱白名单移除
- 否则他下次登录会重新被建为 assistant(`assignedRoles=[]`,看不到任何内容)

---

## 已知技术债(等收尾)

- `frontend/src/StudioWorkflowManager.tsx` 顶部仍有 `@ts-nocheck`;主组件的 helpers(`getProjectTasks/getAlbumTasks/getMarketingTasksForProject`)和 updateXxx 闭包还没加类型。Phase 7+ 单独清理
- `lib/api.ts` 和 `lib/types.ts` 里 `Role / Task / Project / Album` 等类型有重复定义(字段一致),待合并
- AI 任务拆分(✨ 按钮)仍直接 `fetch("api.anthropic.com")`,Cloudflare 部署前要走后端代理免暴露 API key
