import { useEffect, useState } from 'react';
import { Edit2, Loader2, RefreshCw, UserPlus, Users as UsersIcon } from 'lucide-react';
import { api, type User } from '../lib/api';
import type { Role } from '../lib/types';
import UserEditModal from '../components/UserEditModal';

type Props = {
  roles: Role[];
  currentEmail: string;
  onSelfUpdate?: (u: User) => void;
};

export default function UsersView({ roles, currentEmail, onSelfUpdate }: Props) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  const load = async () => {
    setError(null);
    try {
      const { users } = await api.listUsers();
      setUsers(users);
    } catch (e) {
      console.error(e);
      setError('加载用户列表失败');
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (patch: { name?: string | null; role?: 'owner' | 'assistant'; assignedRoles?: string[] }) => {
    if (!editing) return;
    // 自编辑只能改 name(后端 PATCH /:email 是 owner-only,自己改自己走 PATCH /api/me)
    if (editing.email === currentEmail && patch.role === undefined && patch.assignedRoles === undefined) {
      const updated = await api.updateMe({ name: patch.name ?? null });
      onSelfUpdate?.(updated);
    } else {
      await api.updateUser(editing.email, patch);
    }
    await load();
  };

  if (users === null) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <Loader2 className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" />
        <p className="text-sm text-slate-500">加载用户列表…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-slate-600" />团队成员
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">所有登录过的用户。新成员首次访问后自动出现,你给他们分配职位即可</p>
        </div>
        <button onClick={load} className="text-sm text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" />刷新
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-sm text-blue-900">
        <div className="font-medium mb-1">📩 邀请新队友的流程</div>
        <ol className="list-decimal pl-5 space-y-0.5 text-xs text-blue-800">
          <li>在 Cloudflare Zero Trust → Access controls → Applications → 这个 app → Policies 添加他们的邮箱</li>
          <li>队友访问 https://studio-workflow-manager.pages.dev,收 OTP 邮件登录</li>
          <li>回到本页面点刷新,看到他们后点编辑分配职位</li>
        </ol>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 text-sm text-rose-700">{error}</div>
      )}

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">还没有用户</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const isMe = u.email === currentEmail;
            const userRoleObjs = u.assignedRoles
              .map(id => roles.find(r => r.id === id))
              .filter((r): r is Role => !!r);

            return (
              <div key={u.email} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 ${u.role === 'owner' ? 'bg-slate-900' : 'bg-amber-500'}`}>
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{u.name || u.email}</h3>
                    {isMe && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">你</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${u.role === 'owner' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'}`}>
                      {u.role === 'owner' ? 'Owner' : 'Assistant'}
                    </span>
                  </div>
                  {u.name && <p className="text-xs text-slate-500 mt-0.5 truncate">{u.email}</p>}
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    {u.role === 'owner' ? (
                      <span className="text-xs text-slate-500">看全部职位</span>
                    ) : userRoleObjs.length === 0 ? (
                      <span className="text-xs text-rose-600">⚠️ 未分配任何职位,登录后看到的是空页面</span>
                    ) : (
                      userRoleObjs.map(r => (
                        <span key={r.id} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded inline-flex items-center gap-1">
                          {r.icon} {r.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(u)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 shrink-0"
                  title={isMe ? '编辑我的显示名' : '编辑权限'}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <UserEditModal
          user={editing}
          roles={roles}
          selfEdit={editing.email === currentEmail}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
