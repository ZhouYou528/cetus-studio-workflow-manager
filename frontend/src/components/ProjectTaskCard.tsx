import { Check, Sparkles } from 'lucide-react';
import { useT } from '../lib/i18n';
import type { Role } from '../lib/types';

type ProjectSubTask = {
  id: string;
  name: string;
  duration: number | string;
  description: string;
  roleId: string;
  dueDate: string;
  completionKey: string;
  isAlbum?: boolean;
  daysBeforeShoot?: number;
  daysAfterStart?: number;
  project?: { clientName: string; shootType: string; shootDate: string };
  album?: { clientName: string; startDate: string };
};

type Props = {
  task: ProjectSubTask;
  roles: Role[];
  isOverdue?: boolean;
  isCompleted: boolean;
  onToggle: () => void;
  onSplit: (task: ProjectSubTask) => void;
};

export default function ProjectTaskCard({ task, roles, isOverdue, isCompleted, onToggle, onSplit }: Props) {
  const t = useT();
  const role = roles.find(r => r.id === task.roleId);
  const today = new Date().toISOString().split('T')[0];
  const daysOverdue = isOverdue ? Math.floor((new Date(today).getTime() - new Date(task.dueDate).getTime()) / 86400000) : 0;
  const isAlbum = task.isAlbum;

  let timingLabel = '';
  if (isAlbum) {
    timingLabel = task.daysAfterStart === 0 ? t('design_start_day') : t('days_after_start', { n: task.daysAfterStart ?? 0 });
  } else {
    if ((task.daysBeforeShoot ?? 0) > 0) timingLabel = t('days_before_shoot', { n: task.daysBeforeShoot ?? 0 });
    else if (task.daysBeforeShoot === 0) timingLabel = t('on_shoot_day');
    else timingLabel = t('days_after_shoot', { n: Math.abs(task.daysBeforeShoot ?? 0) });
  }
  const contextLabel = isAlbum
    ? `📔 ${task.album?.clientName} ${t('album_design_suffix')}`
    : `📸 ${task.project?.clientName} · ${task.project?.shootType}`;
  const dateLabel = isAlbum
    ? t('started_short', { date: task.album?.startDate ?? '' })
    : t('shoot_day_label', { date: task.project?.shootDate ?? '' });

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border p-4 transition ${
      isCompleted ? 'border-emerald-200 bg-emerald-50/30' :
      isOverdue ? 'border-rose-200 bg-rose-50/30' :
      isAlbum ? 'border-amber-200 bg-amber-50/20' : 'border-blue-200 bg-blue-50/20'
    }`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
          {isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
        <div className={`w-8 h-8 rounded-lg ${role?.color || 'bg-slate-400'} flex items-center justify-center text-sm shrink-0`}>{role?.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`font-medium text-sm ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>{task.name}</div>
            {isOverdue && !isCompleted && <span className="text-xs px-1.5 py-0.5 bg-rose-500 text-white rounded font-medium">{t('days_overdue', { n: daysOverdue })}</span>}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-700 dark:text-slate-300">{contextLabel}</span><span>·</span><span>{timingLabel}</span><span>·</span><span>{dateLabel}</span>
          </div>
        </div>
        {import.meta.env.DEV && (
          <button onClick={() => onSplit({ ...task, name: task.name + ` (${isAlbum ? task.album?.clientName : task.project?.clientName})` })}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
            <Sparkles className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
