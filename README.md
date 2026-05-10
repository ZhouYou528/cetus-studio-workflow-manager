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
├── frontend/      # React SPA(Vite)
└── backend/       # Cloudflare Worker(Hono)
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

---

## 开发阶段进度

- [x] **Phase 1**:项目骨架 — Vite + React + TS + Tailwind v4;Hono + Wrangler;Artifact 代码原样接入 + localStorage shim;`/api/health` + `/api/me`
- [ ] **Phase 2**:D1 schema + seed
- [ ] **Phase 3**:后端核心 API(users / roles / tasks)
- [ ] **Phase 4**:后端进阶 API(projects / albums / trash + Marketing 联动)
- [ ] **Phase 5**:前端数据层切到 API(删 localStorage shim)
- [ ] **Phase 6**:前端补完(Modal、确认弹窗、组件拆分)
- [ ] **Phase 7**:GitHub 私有仓库
- [ ] **Phase 8**:Cloudflare Pages + Workers 部署 + Access 配置

---

## 关键设计说明

**localStorage shim(Phase 1 临时)**
Artifact 代码用 `window.storage.get/set` 整存整取一个 JSON blob。`frontend/src/lib/storage-shim.ts` 在浏览器里把 `window.storage` 接到 localStorage,业务代码不动。Phase 5 切到 API 后这个 shim 会被删掉。

**本地认证伪造**
Cloudflare Access 只在线上生效。本地 `wrangler.toml` 里设了 `DEV_USER_EMAIL`,后端 `auth.ts` 拿不到 `Cf-Access-Authenticated-User-Email` header 时会回退到这个邮箱,默认是 owner 身份。

**同域部署**
线上前后端共用一个域名 `studio.xxx.com`:Pages 托管前端,通过 Pages Functions 把 `/api/*` 路由给 Worker。本地用 Vite 的 proxy 模拟。
