import { Camera, CalendarDays, Check, ChevronDown, ChevronRight, Edit2, MapPin, Sparkles, Trash2 } from 'lucide-react';
import type { Project } from '../lib/types';

type ProjectSubTask = {
  id: string;
  name: string;
  dueDate: string;
  completionKey: string;
  daysBeforeShoot?: number;
};

type Props = {
  project: Project;
  tasks: ProjectSubTask[];
  completions: Record<string, unknown>;
  updateCompletions: (next: Record<string, unknown>) => void;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPast: boolean;
  onSplit?: (task: ProjectSubTask & { name: string }) => void;
};

export default function ProjectCard({ project, tasks, completions, updateCompletions, expanded, onToggle, onEdit, onDelete, isPast, onSplit }: Props) {
  const completedCount = tasks.filter(t => completions[t.completionKey]).length;
  const today = new Date().toISOString().split('T')[0];
  const shootDate = new Date(project.shootDate + 'T00:00:00');
  const daysUntil = Math.ceil((shootDate.getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);

  let urgencyLabel = '', urgencyColor = 'bg-slate-100 text-slate-600';
  if (daysUntil < 0) { urgencyLabel = '已结束'; urgencyColor = 'bg-slate-100 text-slate-500'; }
  else if (daysUntil === 0) { urgencyLabel = '今天拍摄'; urgencyColor = 'bg-rose-100 text-rose-700'; }
  else if (daysUntil === 1) { urgencyLabel = '明天拍摄'; urgencyColor = 'bg-amber-100 text-amber-700'; }
  else if (daysUntil <= 3) { urgencyLabel = `还有${daysUntil}天`; urgencyColor = 'bg-amber-100 text-amber-700'; }
  else if (daysUntil <= 7) { urgencyLabel = `还有${daysUntil}天`; urgencyColor = 'bg-blue-100 text-blue-700'; }
  else { urgencyLabel = `还有${daysUntil}天`; }

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition ${isPast ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:shadow-md'}`}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900">{project.clientName}</h3>
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">{project.shootType}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${urgencyColor}`}>{urgencyLabel}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{project.shootDate}</span>
              {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
              <span>· {completedCount}/{tasks.length} 任务完成</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="编辑"><Edit2 className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500" title="删除"><Trash2 className="w-4 h-4" /></button>
            {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(completedCount/tasks.length)*100}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">任务时间表</div>
          {project.notes && <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-sm text-amber-900">💡 {project.notes}</div>}
          <div className="space-y-2">
            {tasks.map(t => {
              const isCompleted = completions[t.completionKey];
              const isOverdue = !isCompleted && t.dueDate < today;
              const isToday = t.dueDate === today;
              let timingLabel = '';
              if ((t.daysBeforeShoot ?? 0) > 0) timingLabel = `拍摄前${t.daysBeforeShoot}天`;
              else if (t.daysBeforeShoot === 0) timingLabel = '拍摄当天';
              else timingLabel = `拍摄后${Math.abs(t.daysBeforeShoot ?? 0)}天`;
              return (
                <div key={t.id} className={`bg-white rounded-lg p-2.5 flex items-center gap-2.5 ${isOverdue ? 'border border-rose-200' : isToday ? 'border border-blue-200' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); updateCompletions({ ...completions, [t.completionKey]: !isCompleted }); }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {isCompleted && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{timingLabel}</span><span>·</span><span>{t.dueDate}</span>
                      {isOverdue && <span className="text-rose-600 font-medium">· 逾期</span>}
                      {isToday && !isCompleted && <span className="text-blue-600 font-medium">· 今日</span>}
                    </div>
                  </div>
                  {onSplit && (
                    <button onClick={(e) => { e.stopPropagation(); onSplit({ ...t, name: `${t.name} - ${project.clientName}${project.shootType}` }); }}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Sparkles className="w-3.5 h-3.5" /></button>
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
