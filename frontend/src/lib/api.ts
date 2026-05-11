// API 调用封装。所有请求走 /api/*,Vite dev 代理转给后端 Worker,线上同域 Pages Functions → Worker。
// 任何 4xx/5xx 都抛 ApiError;调用方可以 catch 后展示提示。

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `API ${status}`);
  }
}

async function call<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: 'include', // 让 Cloudflare Access cookie 跟着请求
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(path, init);
  const text = await res.text();
  const parsed: unknown = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, parsed, `${method} ${path} → ${res.status}`);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

// ── 类型(尽量松,Artifact 代码本身是无类型 JSX) ──
export type Role = {
  id: string; name: string; icon: string | null; duties: string | null;
  color: string | null; isAssistant: boolean; supportsProjects: boolean; displayOrder: number;
};
export type Task = {
  id: string; roleId: string; name: string; frequency: string;
  duration: number | null; description: string | null;
  dueDate: string | null; isWeekly: boolean; createdAt: number;
  parentTaskId?: string | null;
};
export type Project = {
  id: string; clientName: string; shootType: string; shootDate: string;
  location: string | null; notes: string | null; createdAt: number;
};
export type Album = {
  id: string; clientName: string; albumType: string | null; startDate: string;
  notes: string | null; createdAt: number;
};
export type TrashItem = {
  id: string; type: 'task' | 'project' | 'album' | 'role';
  itemData: unknown; relatedData: unknown; deletedAt: number; deletedBy: string | null;
};
export type ParentType = 'task' | 'project' | 'album';
export type Attachment = {
  id: string;
  parentType: ParentType;
  parentId: string;
  filename: string;
  contentType: string | null;
  sizeBytes: number;
  uploadedAt: number;
  uploadedBy: string | null;
};
export type User = {
  email: string;
  name: string | null;
  role: 'owner' | 'assistant';
  assignedRoles: string[];
  createdAt?: number; // 仅 GET /api/users 返回
};
export type Bootstrap = {
  user: User;
  today: string;
  roles: Role[];
  tasks: Task[];
  projects: Project[];
  albumDesigns: Album[];
  trash: TrashItem[];
  completions: Record<string, number>;
  projectCompletions: Record<string, number>;
  albumCompletions: Record<string, number>;
  attachments: Attachment[];
};

// 用户本地时区下的"今天"。后端 Worker 跑在 UTC,前端需要把本机的
// date / 星期几 / 月日 一起带过去,避免跨日边界出现"今天"对不上。
function localDateParams(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;
  return `date=${date}&dow=${d.getDay()}&dom=${d.getDate()}`;
}

// ── endpoints ────────────────────────────────────────────
export const api = {
  bootstrap: () => call<Bootstrap>('GET', `/api/bootstrap?${localDateParams()}`),
  me: () => call<User>('GET', '/api/me'),

  // users
  // 自己改自己的名字(任何登录用户都能)
  updateMe: (body: { name: string | null }) => call<User>('PATCH', '/api/users/me', body),
  // owner-only
  listUsers: () => call<{ users: User[] }>('GET', '/api/users'),
  updateUser: (email: string, body: Partial<Pick<User, 'role' | 'assignedRoles' | 'name'>>) =>
    call<User>('PATCH', `/api/users/${encodeURIComponent(email)}`, body),
  deleteUser: (email: string) =>
    call<{ ok: true }>('DELETE', `/api/users/${encodeURIComponent(email)}`),

  // roles
  createRole: (body: Partial<Role>) => call<Role>('POST', '/api/roles', body),
  updateRole: (id: string, body: Partial<Role>) => call<Role>('PATCH', `/api/roles/${id}`, body),
  deleteRole: (id: string) => call<{ ok: true; trashId: string }>('DELETE', `/api/roles/${id}`),

  // tasks
  createTask: (body: Partial<Task>) => call<Task>('POST', '/api/tasks', body),
  updateTask: (id: string, body: Partial<Task>) => call<Task>('PATCH', `/api/tasks/${id}`, body),
  deleteTask: (id: string) => call<{ ok: true; trashId: string }>('DELETE', `/api/tasks/${id}`),
  completeTask: (id: string, date: string) =>
    call<{ ok: true }>('POST', `/api/tasks/${id}/complete`, { date }),
  uncompleteTask: (id: string, date: string) =>
    call<{ ok: true }>('DELETE', `/api/tasks/${id}/complete?date=${encodeURIComponent(date)}`),

  // projects
  createProject: (body: Partial<Project>) => call<Project>('POST', '/api/projects', body),
  updateProject: (id: string, body: Partial<Project>) => call<Project>('PATCH', `/api/projects/${id}`, body),
  deleteProject: (id: string) => call<{ ok: true; trashId: string }>('DELETE', `/api/projects/${id}`),
  completeProjectTask: (projectId: string, templateId: string, roleId: string) =>
    call<{ ok: true }>('POST', `/api/projects/${projectId}/tasks/${templateId}/complete`, { roleId }),
  uncompleteProjectTask: (projectId: string, templateId: string, roleId: string) =>
    call<{ ok: true }>('DELETE', `/api/projects/${projectId}/tasks/${templateId}/complete?role_id=${roleId}`),

  // albums
  createAlbum: (body: Partial<Album>) => call<Album>('POST', '/api/albums', body),
  updateAlbum: (id: string, body: Partial<Album>) => call<Album>('PATCH', `/api/albums/${id}`, body),
  deleteAlbum: (id: string) => call<{ ok: true; trashId: string }>('DELETE', `/api/albums/${id}`),
  completeAlbumTask: (albumId: string, templateId: string) =>
    call<{ ok: true }>('POST', `/api/albums/${albumId}/tasks/${templateId}/complete`, {}),
  uncompleteAlbumTask: (albumId: string, templateId: string) =>
    call<{ ok: true }>('DELETE', `/api/albums/${albumId}/tasks/${templateId}/complete`),

  // trash
  listTrash: () => call<{ items: TrashItem[] }>('GET', '/api/trash'),
  restoreTrash: (id: string) => call<{ ok: true }>('POST', `/api/trash/${id}/restore`),
  deleteTrash: (id: string) => call<{ ok: true }>('DELETE', `/api/trash/${id}`),
  emptyTrash: () => call<{ ok: true }>('DELETE', `/api/trash`),

  // attachments
  listAttachments: (type: ParentType, id: string) =>
    call<{ items: Attachment[] }>('GET', `/api/attachments/${type}/${encodeURIComponent(id)}`),
  uploadAttachment: async (type: ParentType, id: string, file: File): Promise<Attachment> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/attachments/${type}/${encodeURIComponent(id)}`, {
      method: 'POST',
      credentials: 'include',
      body: fd, // 不设 Content-Type,浏览器自动加 multipart boundary
    });
    const text = await res.text();
    const parsed = text ? safeJson(text) : null;
    if (!res.ok) throw new ApiError(res.status, parsed, `upload → ${res.status}`);
    return parsed as Attachment;
  },
  deleteAttachment: (id: string) =>
    call<{ ok: true }>('DELETE', `/api/attachments/${encodeURIComponent(id)}`),
  attachmentDownloadUrl: (id: string) => `/api/attachments/${encodeURIComponent(id)}/download`,
};
