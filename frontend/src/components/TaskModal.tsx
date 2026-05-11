import { useState } from 'react';
import { X } from 'lucide-react';
import type { Attachment } from '../lib/api';
import { useT } from '../lib/i18n';
import type { Frequency, Role, Task } from '../lib/types';
import AttachmentsSection from './AttachmentsSection';

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
  parentId?: string | null;
  attachments?: Attachment[];
  onAttachmentsChange?: (items: Attachment[]) => void;
  onClose: () => void;
  onSave: (patch: TaskPatch) => void;
};

export default function TaskModal({ task, roles, defaultRoleId, parentId, attachments, onAttachmentsChange, onClose, onSave }: Props) {
  const t = useT();
  const [name, setName] = useState(task?.name || '');
  const [roleId, setRoleId] = useState(task?.roleId || defaultRoleId || roles[0]?.id || '');
  const [frequency, setFrequency] = useState<Frequency>((task?.frequency as Frequency) || '每日');
  const [duration, setDuration] = useState(task?.duration != null ? String(task.duration) : '');
  const [description, setDescription] = useState(task?.description || '');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{task ? t('modal_edit_task') : t('modal_add_task')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('task_name')}</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('role_field')}</label>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm">
              {roles.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('frequency_field')}</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm">
                <option value="每日">{t('freq_daily')}</option>
                <option value="每周">{t('freq_weekly')}</option>
                <option value="每月">{t('freq_monthly')}</option>
                <option value="临时">{t('freq_onetime')}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('duration_field')}</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm" />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('tip_project_task')}</p>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('description_field')}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm resize-none" />
          </div>
          <AttachmentsSection parentType="task" parentId={parentId ?? null} initial={attachments} onChange={onAttachmentsChange} />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{t('cancel')}</button>
          <button onClick={() => name.trim() && roleId && onSave({ name, roleId, frequency, duration, description })}
            disabled={!name.trim() || !roleId} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">{t('save')}</button>
        </div>
      </div>
    </div>
  );
}
