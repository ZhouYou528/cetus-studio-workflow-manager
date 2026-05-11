import { useState } from 'react';
import { X } from 'lucide-react';
import type { Frequency, Role, Task } from '../lib/types';

type TaskPatch = {
  name: string;
  roleId: string;
  frequency: Frequency;
  duration: string;
  description: string;
};

type Props = {
  task: Task | null;
  roles: Role[];
  defaultRoleId?: string;
  onClose: () => void;
  onSave: (patch: TaskPatch) => void;
};

export default function TaskModal({ task, roles, defaultRoleId, onClose, onSave }: Props) {
  const [name, setName] = useState(task?.name || '');
  const [roleId, setRoleId] = useState(task?.roleId || defaultRoleId || roles[0]?.id || '');
  const [frequency, setFrequency] = useState<Frequency>((task?.frequency as Frequency) || '每日');
  const [duration, setDuration] = useState(task?.duration != null ? String(task.duration) : '');
  const [description, setDescription] = useState(task?.description || '');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{task ? '编辑任务' : '添加任务'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">任务名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">所属职位</label>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
              {roles.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">频率</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option>每日</option><option>每周</option><option>每月</option><option>临时</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">耗时(分钟)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <p className="text-xs text-slate-500">💡 项目制任务请在「拍摄项目」中管理</p>
          <div>
            <label className="text-sm font-medium text-slate-700">任务描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">取消</button>
          <button onClick={() => name.trim() && roleId && onSave({ name, roleId, frequency, duration, description })}
            disabled={!name.trim() || !roleId} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}
