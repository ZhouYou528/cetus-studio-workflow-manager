import { useEffect, useState } from 'react';
import { Edit2, Loader2, RefreshCw, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react';
import { api, type User } from '../lib/api';
import { useT } from '../lib/i18n';
import type { ConfirmPayload, Role } from '../lib/types';
import UserEditModal from '../components/UserEditModal';

type Props = {
  roles: Role[];
  currentEmail: string;
  currentRole: 'owner' | 'assistant';
  onSelfUpdate?: (u: User) => void;
  setConfirmDialog: (p: ConfirmPayload | null) => void;
};

export default function UsersView({ roles, currentEmail, currentRole, onSelfUpdate, setConfirmDialog }: Props) {
  const t = useT();
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
      setError(t('load_users_failed'));
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (patch: { name?: string | null; role?: 'owner' | 'assistant'; assignedRoles?: string[] }) => {
    if (!editing) return;
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
        <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading_users')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />{t('users_title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('users_subtitle')}</p>
        </div>
        <button onClick={load} className="text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" />{t('refresh')}
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mb-5 text-sm text-blue-900 dark:text-blue-100">
        <div className="font-medium mb-1">{t('invite_hint_title')}</div>
        <ol className="list-decimal pl-5 space-y-0.5 text-xs text-blue-800 dark:text-blue-200">
          <li>{t('invite_step_1')}</li>
          <li>{t('invite_step_2')}</li>
          <li>{t('invite_step_3')}</li>
        </ol>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 text-sm text-rose-700">{error}</div>
      )}

      {users.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
          <UserPlus className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">{t('no_users')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const isMe = u.email === currentEmail;
            const userRoleObjs = u.assignedRoles
              .map(id => roles.find(r => r.id === id))
              .filter((r): r is Role => !!r);

            return (
              <div key={u.email} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 ${u.role === 'owner' ? 'bg-slate-900' : 'bg-amber-500'}`}>
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{u.name || u.email}</h3>
                    {isMe && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{t('user_you')}</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${u.role === 'owner' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-amber-100 text-amber-700'}`}>
                      {u.role === 'owner' ? t('user_owner') : t('user_assistant')}
                    </span>
                  </div>
                  {u.name && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{u.email}</p>}
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    {u.role === 'owner' ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t('sees_all_roles')}</span>
                    ) : userRoleObjs.length === 0 ? (
                      <span className="text-xs text-rose-600">{t('no_roles_warning')}</span>
                    ) : (
                      userRoleObjs.map(r => (
                        <span key={r.id} className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded inline-flex items-center gap-1">
                          {r.icon} {r.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(u)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 shrink-0"
                  title={isMe ? t('edit_my_profile') : t('edit_user')}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {currentRole === 'owner' && !isMe && (
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        title: t('confirm_title_delete_user', { name: u.name || u.email }),
                        message: t('confirm_dialog_msg_delete_user'),
                        danger: true,
                        onConfirm: async () => {
                          setConfirmDialog(null);
                          try {
                            await api.deleteUser(u.email);
                            await load();
                          } catch (e) {
                            console.error(e);
                            alert(t('delete_failed'));
                          }
                        },
                      });
                    }}
                    className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 shrink-0"
                    title={t('delete_user')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
