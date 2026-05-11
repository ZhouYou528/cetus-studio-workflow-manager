import { useState } from 'react';
import { X } from 'lucide-react';
import type { Project } from '../lib/types';

const SHOOT_TYPES = ['婚纱', '婚礼', '儿童写真', '家庭写真', '商业产品', '形象写真', '活动跟拍', '其他'] as const;

type ProjectPatch = {
  clientName: string;
  shootType: string;
  shootDate: string;
  location: string;
  notes: string;
  roleId: string;
};

type Props = {
  project: (Project & { roleId?: string }) | null;
  defaultRoleId?: string;
  onClose: () => void;
  onSave: (patch: ProjectPatch) => void;
};

export default function ProjectModal({ project, defaultRoleId, onClose, onSave }: Props) {
  const [clientName, setClientName] = useState(project?.clientName || '');
  const [shootType, setShootType] = useState<string>(project?.shootType || SHOOT_TYPES[0]);
  const [shootDate, setShootDate] = useState(project?.shootDate || '');
  const [location, setLocation] = useState(project?.location || '');
  const [notes, setNotes] = useState(project?.notes || '');
  const roleId = project?.roleId || defaultRoleId || 'r1';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{project ? '编辑拍摄项目' : '新增拍摄项目'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">客户姓名</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="如:王女士" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">拍摄类型</label>
            <select value={shootType} onChange={e => setShootType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
              {SHOOT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">拍摄日期</label>
            <input type="date" value={shootDate} onChange={e => setShootDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">拍摄地点</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">备注</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">取消</button>
          <button onClick={() => clientName.trim() && shootDate && onSave({ clientName, shootType, shootDate, location, notes, roleId })}
            disabled={!clientName.trim() || !shootDate} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}
