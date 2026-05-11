import { Hono } from 'hono';
import { requireAuth } from './auth';
import type { AuthUser } from './db';
import usersRoute from './routes/users';
import rolesRoute from './routes/roles';
import tasksRoute from './routes/tasks';
import projectsRoute from './routes/projects';
import albumsRoute from './routes/albums';
import trashRoute from './routes/trash';
import bootstrapRoute from './routes/bootstrap';

export type Bindings = {
  DEV_USER_EMAIL: string;
  OWNER_EMAILS: string;
  DB: D1Database;
};

export type AppVars = { user: AuthUser };

const app = new Hono<{ Bindings: Bindings; Variables: AppVars }>();

// 公开端点(挡在 auth 之前)
app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'studio-workflow-manager-api', ts: Date.now() })
);

// 所有 /api/* 走 auth(/api/health 已经在上面命中,不会再进这里)
app.use('/api/*', requireAuth);

app.route('/api/users', usersRoute);
app.route('/api/roles', rolesRoute);
app.route('/api/tasks', tasksRoute);
app.route('/api/projects', projectsRoute);
app.route('/api/albums', albumsRoute);
app.route('/api/trash', trashRoute);
app.route('/api/bootstrap', bootstrapRoute);

// 兼容老路径 /api/me → /api/users/me(前端原 Artifact 用的是 /api/me)
app.get('/api/me', (c) => c.json(c.var.user));

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));
app.onError((err, c) => {
  console.error('API error:', err);
  return c.json({ error: 'internal', message: err.message }, 500);
});

export default app;
