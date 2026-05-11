// Cloudflare Pages Function — 把 Pages 收到的 /api/* 转发给 Worker。
//
// 用 service binding(env.BACKEND.fetch)而不是 fetch 外部 URL,
// 这样 Cloudflare Access 加上的 `Cf-Access-Authenticated-User-Email` header
// 不会被边缘剥掉(外部 fetch 会;service binding 是 worker-to-worker 直连)。
//
// service binding 名 BACKEND 在 frontend/wrangler.toml 里声明。

interface Env {
  BACKEND: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  return ctx.env.BACKEND.fetch(ctx.request);
};
