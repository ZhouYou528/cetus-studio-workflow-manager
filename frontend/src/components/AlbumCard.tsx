import { Briefcase, CalendarDays, Check, ChevronDown, ChevronRight, Edit2, Sparkles, Trash2 } from 'lucide-react';
import { useT } from '../lib/i18n';
import type { Album } from '../lib/types';

type AlbumSubTask = {
  id: string;
  name: string;
  dueDate: string;
  completionKey: string;
  daysAfterStart: number;
};

type Props = {
  album: Album;
  tasks: AlbumSubTask[];
  completions: Record<string, unknown>;
  updateCompletions: (next: Record<string, unknown>) => void;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSplit?: (task: AlbumSubTask & { name: string }) => void;
};

export default function AlbumCard({ album, tasks, completions, updateCompletions, expanded, onToggle, onEdit, onDelete, onSplit }: Props) {
  const t = useT();
  const completedCount = tasks.filter(x => completions[x.completionKey]).length;
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(album.startDate + 'T00:00:00');
  const daysSinceStart = Math.floor((new Date(today + 'T00:00:00').getTime() - startDate.getTime()) / 86400000);

  let statusLabel = '', statusColor = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  if (completedCount === tasks.length) { statusLabel = t('all_completed_status'); statusColor = 'bg-emerald-100 text-emerald-700'; }
  else if (daysSinceStart < 0) { statusLabel = t('n_days_before_start', { n: Math.abs(daysSinceStart) }); statusColor = 'bg-blue-100 text-blue-700'; }
  else { statusLabel = t('in_progress_day', { n: daysSinceStart + 1 }); statusColor = 'bg-amber-100 text-amber-700'; }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{album.clientName}</h3>
              {album.albumType && <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">{album.albumType}</span>}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor}`}>{statusLabel}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{t('started_on', { date: album.startDate })}</span>
              <span>· {t('n_tasks', { done: completedCount, total: tasks.length })}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400" title={t('edit')}><Edit2 className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500" title={t('delete')}><Trash2 className="w-4 h-4" /></button>
            {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${(completedCount/tasks.length)*100}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t('album_card_timeline')}</div>
          {album.notes && <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2.5 mb-3 text-sm text-amber-900 dark:text-amber-100">💡 {album.notes}</div>}
          <div className="space-y-2">
            {tasks.map(x => {
              const isCompleted = completions[x.completionKey];
              const isOverdue = !isCompleted && x.dueDate < today;
              const isToday = x.dueDate === today;
              const timingLabel = x.daysAfterStart === 0 ? t('design_start_day') : t('days_after_start', { n: x.daysAfterStart });
              return (
                <div key={x.id} className={`bg-white dark:bg-slate-900 rounded-lg p-2.5 flex items-center gap-2.5 ${isOverdue ? 'border border-rose-200' : isToday ? 'border border-blue-200' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); updateCompletions({ ...completions, [x.completionKey]: !isCompleted }); }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                    {isCompleted && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>{x.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{timingLabel}</span><span>·</span><span>{x.dueDate}</span>
                      {isOverdue && <span className="text-rose-600 font-medium">· {t('overdue_label')}</span>}
                      {isToday && !isCompleted && <span className="text-blue-600 font-medium">· {t('today')}</span>}
                    </div>
                  </div>
                  {import.meta.env.DEV && onSplit && (
                    <button onClick={(e) => { e.stopPropagation(); onSplit({ ...x, name: `${x.name} - ${album.clientName}` }); }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400"><Sparkles className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
