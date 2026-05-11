import { useState } from 'react';
import { X } from 'lucide-react';
import type { User } from '../lib/api';
import { useT } from '../lib/i18n';
import type { Role } from '../lib/types';

type Props = {
  user: User;
  roles: Role[];
  selfEdit?: boolean;
  onClose: () => void;
  onSave: (patch: { name?: string | null; role?: 'owner' | 'assistant'; assignedRoles?: string[] }) => Promise<void>;
};

export default function UserEditModal({ user, roles, selfEdit, onClose, onSave }: Props) {
  const t = useT();
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState<'owner' | 'assistant'>(user.role);
  const [assigned, setAssigned] = useState<string[]>(user.assignedRoles);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setAssigned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selfEdit) {
        await onSave({ name: name.trim() || null });
      } else {
        await onSave({ name: name.trim() || null, role, assignedRoles: assigned });
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert(t('save_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selfEdit ? t('modal_edit_me') : t('modal_edit_user')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('email_immutable')}</div>
            <div className="mt-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-mono text-slate-800 dark:text-slate-200 break-all">{user.email}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('name_field')} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">{t('name_optional_hint')}</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              placeholder={selfEdit ? t('placeholder_name_self') : t('placeholder_name_other')}
              className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {!selfEdit && (
            <>
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('user_role_field')}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRole('owner')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${role === 'owner' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    {t('role_owner_full')}
                  </button>
                  <button
                    onClick={() => setRole('assistant')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${role === 'assistant' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    {t('role_assistant_full')}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  {role === 'owner' ? t('owner_can_see_all') : t('assistant_sees_only_assigned')}
                </p>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('assigned_roles_count', { n: assigned.length })}
                  {role === 'owner' && <span className="text-slate-400 dark:text-slate-500 font-normal">{t('owner_role_assignment_hint')}</span>}
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  {roles.map(r => (
                    <label key={r.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${assigned.includes(r.id) ? 'bg-slate-50 dark:bg-slate-800' : ''}`}>
                      <input
                        type="checkbox"
                        checked={assigned.includes(r.id)}
                        onChange={() => toggle(r.id)}
                        className="rounded"
                      />
                      <div className={`w-6 h-6 rounded ${r.color || 'bg-slate-400'} flex items-center justify-center text-sm shrink-0`}>{r.icon}</div>
                      <span className="text-sm flex-1 text-slate-900 dark:text-slate-100">{r.name}</span>
                      {r.isAssistant && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{t('is_assistant_badge')}</span>}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">{t('cancel')}</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
