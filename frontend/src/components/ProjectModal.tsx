import { useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '../lib/i18n';
import type { Project } from '../lib/types';

// Shoot types: 内部仍用中文值(DB 里也是中文,与后端逻辑/Marketing 联动判断一致)。
// 显示文案通过 i18n key 翻译。
const SHOOT_TYPE_OPTIONS = [
  { value: '婚纱', labelKey: 'shoot_type_wedding_photo' as const },
  { value: '婚礼', labelKey: 'shoot_type_wedding' as const },
  { value: '儿童写真', labelKey: 'shoot_type_kids' as const },
  { value: '家庭写真', labelKey: 'shoot_type_family' as const },
  { value: '商业产品', labelKey: 'shoot_type_commercial' as const },
  { value: '形象写真', labelKey: 'shoot_type_portrait' as const },
  { value: '活动跟拍', labelKey: 'shoot_type_event' as const },
  { value: '其他', labelKey: 'shoot_type_other' as const },
];

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
  const t = useT();
  const [clientName, setClientName] = useState(project?.clientName || '');
  const [shootType, setShootType] = useState<string>(project?.shootType || SHOOT_TYPE_OPTIONS[0].value);
  const [shootDate, setShootDate] = useState(project?.shootDate || '');
  const [location, setLocation] = useState(project?.location || '');
  const [notes, setNotes] = useState(project?.notes || '');
  const roleId = project?.roleId || defaultRoleId || 'r1';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{project ? t('modal_edit_project') : t('modal_add_project')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('project_client')}</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm" placeholder={t('placeholder_client_example')} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('project_type')}</label>
            <select value={shootType} onChange={e => setShootType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm">
              {SHOOT_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('project_date')}</label>
            <input type="date" value={shootDate} onChange={e => setShootDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('project_location')}</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('project_notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{t('cancel')}</button>
          <button onClick={() => clientName.trim() && shootDate && onSave({ clientName, shootType, shootDate, location, notes, roleId })}
            disabled={!clientName.trim() || !shootDate} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">{t('save')}</button>
        </div>
      </div>
    </div>
  );
}
