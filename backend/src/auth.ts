// Auth 中间件。
//
// 线上:Cloudflare Access 已经验证过邮箱(挡在 Worker 前的零信任登录),
//       会在每个请求头里塞 `Cf-Access-Authenticated-User-Email`。我们信任它。
// 本地:wrangler dev 拿不到这个 header,回退到 env.DEV_USER_EMAIL。
//
// 首次见到的邮箱自动建 user 行:
//   - 在 env.OWNER_EMAILS 白名单(逗号分隔)里 → role='owner'
//   - 否则 → role='assistant',`assigned_roles='[]'`,owner 之后手动升级。

import type { MiddlewareHandler } from 'hono';
import type { Bindings } from './index';
import type { AuthUser } from './db';
import { rowToCamel } from './db';

export const requireAuth: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: { user: AuthUser };
}> = async (c, next) => {
  const accessEmail = c.req.header('Cf-Access-Authenticated-User-Email');
  const email = accessEmail ?? c.env.DEV_USER_EMAIL;
  if (!email) {
    return c.json({ error: 'unauthenticated' }, 401);
  }

  // 已存在 → 直接返回
  const existing = await c.env.DB
    .prepare(`SELECT email, name, role, assigned_roles FROM users WHERE email = ?`)
    .bind(email)
    .first<Record<string, unknown>>();

  let user: AuthUser;
  if (existing) {
    const camel = rowToCamel<{
      email: string;
      name: string | null;
      role: 'owner' | 'assistant';
      assignedRoles: string[];
    }>(existing)!;
    user = camel;
  } else {
    // 首次登录:决定 owner 还是 assistant
    const ownerEmails = (c.env.OWNER_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const role: 'owner' | 'assistant' = ownerEmails.includes(email.toLowerCase())
      ? 'owner'
      : 'assistant';
    await c.env.DB
      .prepare(`INSERT INTO users (email, name, role, assigned_roles, created_at)
                VALUES (?, NULL, ?, '[]', ?)`)
      .bind(email, role, Date.now())
      .run();
    user = { email, name: null, role, assignedRoles: [] };
  }

  c.set('user', user);
  await next();
};

// 简便守卫:只允许 owner 访问
export const requireOwner: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: { user: AuthUser };
}> = async (c, next) => {
  if (c.var.user.role !== 'owner') {
    return c.json({ error: 'forbidden', reason: 'owner-only' }, 403);
  }
  await next();
};
