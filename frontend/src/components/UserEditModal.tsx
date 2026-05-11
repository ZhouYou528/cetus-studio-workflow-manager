import { useState } from 'react';
import { X } from 'lucide-react';
import type { User } from '../lib/api';
import type { Role } from '../lib/types';

type Props = {
  user: User;
  roles: Role[];
  onClose: () => void;
  onSave: (patch: { role: 'owner' | 'assistant'; assignedRoles: string[] }) => Promise<void>;
};

export default function UserEditModal({ user, roles, onClose, onSave }: Props) {
  const [role, setRole] = useState<'owner' | 'assistant'>(user.role);
  const [assigned, setAssigned] = useState<string[]>(user.assignedRoles);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setAssigned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ role, assignedRoles: assigned });
      onClose();
    } catch (e) {
      console.error(e);
      alert('保存失败,请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">编辑用户权限</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-700">邮箱</div>
            <div className="mt-1 px-3 py-2 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all">{user.email}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1.5">用户角色</div>
            <div className="flex gap-2">
              <button
                onClick={() => setRole('owner')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${role === 'owner' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Owner(管理员)
              </button>
              <button
                onClick={() => setRole('assistant')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${role === 'assistant' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Assistant(助理)
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {role === 'owner' ? 'Owner 看全部职位与任务、可管理用户' : 'Assistant 只看分配到的职位下的任务'}
            </p>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1.5">分配职位({assigned.length} 个){role === 'owner' && <span className="text-slate-400 font-normal"> · owner 可看全部,这里仅作记录</span>}</div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {roles.map(r => (
                <label key={r.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-50 ${assigned.includes(r.id) ? 'bg-slate-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={assigned.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    className="rounded"
                  />
                  <div className={`w-6 h-6 rounded ${r.color || 'bg-slate-400'} flex items-center justify-center text-sm shrink-0`}>{r.icon}</div>
                  <span className="text-sm flex-1">{r.name}</span>
                  {r.isAssistant && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">助理职位</span>}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">取消</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
