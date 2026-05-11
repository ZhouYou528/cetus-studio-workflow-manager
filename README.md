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

---

## 已知技术债(等收尾)

- `frontend/src/StudioWorkflowManager.tsx` 顶部仍有 `@ts-nocheck`;主组件的 helpers(`getProjectTasks/getAlbumTasks/getMarketingTasksForProject`)和 updateXxx 闭包还没加类型。Phase 7+ 单独清理
- `lib/api.ts` 和 `lib/types.ts` 里 `Role / Task / Project / Album` 等类型有重复定义(字段一致),待合并
- AI 任务拆分(✨ 按钮)仍直接 `fetch("api.anthropic.com")`,Cloudflare 部署前要走后端代理免暴露 API key
