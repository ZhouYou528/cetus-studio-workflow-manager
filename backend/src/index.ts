import { Hono } from 'hono';

// Cloudflare Workers 把绑定(DB、KV、Vars)放在 c.env 里 — 这里声明类型让 IDE 补全。
// Phase 2 加上 DB: D1Database 后,routes 里就能 c.env.DB.prepare(...) 直接查。
export type Bindings = {
  DEV_USER_EMAIL: string;
  // DB: D1Database;  // Phase 2 启用
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'studio-workflow-manager-api', ts: Date.now() })
);

app.get('/api/me', (c) => {
  // Phase 3 改为完整的 Access JWT 解析 + DB 读用户。这里先返回伪造身份用于本地冒烟。
  const accessEmail = c.req.header('Cf-Access-Authenticated-User-Email');
  const email = accessEmail ?? c.env.DEV_USER_EMAIL;
  return c.json({ email, role: 'owner', source: accessEmail ? 'access' : 'dev-env' });
});

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

export default app;
