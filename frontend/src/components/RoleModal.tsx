import { useState } from 'react';
import { X } from 'lucide-react';
import type { Role } from '../lib/types';

type Props = {
  role: Role | null;
  onClose: () => void;
  onSave: (patch: Pick<Role, 'name' | 'icon' | 'duties' | 'isAssistant' | 'color'>) => void;
};

const COLORS = [
  'bg-blue-500', 'bg-cyan-500', 'bg-purple-500', 'bg-pink-500',
  'bg-amber-500', 'bg-green-500', 'bg-rose-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-emerald-500', 'bg-orange-500',
];

export default function RoleModal({ role, onClose, onSave }: Props) {
  const [name, setName] = useState(role?.name || '');
  const [icon, setIcon] = useState(role?.icon || '👤');
  const [duties, setDuties] = useState(role?.duties || '');
  const [isAssistant, setIsAssistant] = useState(role?.isAssistant || false);
  const [color, setColor] = useState(role?.color || 'bg-slate-500');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{role ? '编辑职位' : '添加职位'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">职位名称</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">图标(emoji)</label>
            <input value={icon} onChange={e => setIcon(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" maxLength={2} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">颜色</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg ${c} ${color === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">基本职责</label>
            <textarea value={duties} onChange={e => setDuties(e.target.value)} rows={3}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAssistant} onChange={e => setIsAssistant(e.target.checked)} className="rounded" />
            <span>由助理负责</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">取消</button>
          <button onClick={() => name.trim() && onSave({ name, icon, duties, isAssistant, color })}
            disabled={!name.trim()} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}
