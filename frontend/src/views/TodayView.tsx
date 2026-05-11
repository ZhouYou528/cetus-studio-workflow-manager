import { AlertCircle, Check, CheckCircle2, Clock, ListTodo, Paperclip, Sparkles } from 'lucide-react';
import ProjectTaskCard from '../components/ProjectTaskCard';
import { useT } from '../lib/i18n';
import { useLocale } from '../lib/prefs';
import type { Role, Task } from '../lib/types';

// 'project task' 在这里指 ProjectCard / AlbumCard 衍生出来的可完成项,形状由
// getProjectTasks / getAlbumTasks 在主文件里拼出。
type AnyProjectTask = {
  id: string;
  completionKey: string;
  dueDate: string;
  roleId: string;
  isAlbum?: boolean;
  [key: string]: unknown;
};

type Props = {
  todayTasks: Task[];
  roles: Role[];
  completions: Record<string, unknown>;
  todayKey: string;
  updateCompletions: (next: Record<string, unknown>) => void;
  splitTask: (t: { id: string; name: string }) => void;
  projectTasks: AnyProjectTask[];
  projectCompletions: Record<string, unknown>;
  updateProjectCompletions: (next: Record<string, unknown>) => void;
  albumCompletions: Record<string, unknown>;
  updateAlbumCompletions: (next: Record<string, unknown>) => void;
  taskAttachmentCounts?: Record<string, number>;
};

// 时段元数据用 i18n key 表示标签和描述(渲染时再调 t());颜色/角色 ID 保留为 const。
const TIME_SLOTS = [
  { id: 'morning',        labelKey: 'slot_morning'        as const, descKey: 'slot_morning_desc'        as const, icon: '🌅', bgColor: 'bg-orange-50 dark:bg-orange-950/30',  borderColor: 'border-orange-200 dark:border-orange-900/60', iconBg: 'bg-orange-100 dark:bg-orange-900/60', roleIds: ['r6'] as readonly string[] },
  { id: 'late_morning',   labelKey: 'slot_late_morning'   as const, descKey: 'slot_late_morning_desc'   as const, icon: '☕', bgColor: 'bg-purple-50 dark:bg-purple-950/30',  borderColor: 'border-purple-200 dark:border-purple-900/60', iconBg: 'bg-purple-100 dark:bg-purple-900/60', roleIds: ['r3'] as readonly string[] },
  { id: 'afternoon',      labelKey: 'slot_afternoon'      as const, descKey: 'slot_afternoon_desc'      as const, icon: '🌞', bgColor: 'bg-amber-50 dark:bg-amber-950/30',   borderColor: 'border-amber-200 dark:border-amber-900/60',  iconBg: 'bg-amber-100 dark:bg-amber-900/60',  roleIds: ['r4', 'r5'] as readonly string[] },
  { id: 'late_afternoon', labelKey: 'slot_late_afternoon' as const, descKey: 'slot_late_afternoon_desc' as const, icon: '🍵', bgColor: 'bg-rose-50 dark:bg-rose-950/30',     borderColor: 'border-rose-200 dark:border-rose-900/60',     iconBg: 'bg-rose-100 dark:bg-rose-900/60',    roleIds: ['r7'] as readonly string[] },
];

export default function TodayView({
  todayTasks, roles, completions, todayKey, updateCompletions, splitTask,
  projectTasks, projectCompletions, updateProjectCompletions, albumCompletions, updateAlbumCompletions,
  taskAttachmentCounts,
}: Props) {
  const t = useT();
  const [locale] = useLocale();
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = projectTasks.filter(t => t.dueDate < today);
  const todayDueTasks = projectTasks.filter(t => t.dueDate === today);

  const toggleProjectOrAlbum = (t: AnyProjectTask) => {
    if (t.isAlbum) updateAlbumCompletions({ ...albumCompletions, [t.completionKey]: !albumCompletions[t.completionKey] });
    else updateProjectCompletions({ ...projectCompletions, [t.completionKey]: !projectCompletions[t.completionKey] });
  };

  const isTaskCompleted = (task: AnyProjectTask) =>
    task.isAlbum ? !!albumCompletions[task.completionKey] : !!projectCompletions[task.completionKey];

  // 把日常任务按时间段分组
  const otherDailyTasks: Task[] = [];
  const slotDailyTasks: Record<string, Task[]> = {};
  TIME_SLOTS.forEach(slot => (slotDailyTasks[slot.id] = []));
  todayTasks.forEach(task => {
    const slot = TIME_SLOTS.find(s => s.roleIds.includes(task.roleId));
    if (slot) slotDailyTasks[slot.id].push(task);
    else otherDailyTasks.push(task);
  });

  // 把项目任务按时间段分组
  const slotProjectTasks: Record<string, AnyProjectTask[]> = {};
  const otherProjectTasks: AnyProjectTask[] = [];
  TIME_SLOTS.forEach(slot => (slotProjectTasks[slot.id] = []));
  todayDueTasks.forEach(task => {
    const slot = TIME_SLOTS.find(s => s.roleIds.includes(task.roleId));
    if (slot) slotProjectTasks[slot.id].push(task);
    else otherProjectTasks.push(task);
  });

  const renderDailyTask = (task: Task & { completionKey?: string }) => {
    const role = roles.find(r => r.id === task.roleId);
    const isLinked = task.frequency === '项目联动';
    const completionKey = isLinked ? (task.completionKey as string) : `${task.id}|${todayKey}`;
    const isCompleted = !!completions[completionKey];
    const attCount = taskAttachmentCounts?.[task.id] ?? 0;
    return (
      <div key={task.id} className={`bg-white dark:bg-slate-900 rounded-xl border p-3 flex items-start gap-3 transition ${
        isCompleted ? 'border-emerald-200 bg-emerald-50/30' : isLinked ? 'border-rose-200' : 'border-slate-200 dark:border-slate-700'
      }`}>
        <button onClick={() => updateCompletions({ ...completions, [completionKey]: !isCompleted })}
          className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-500'}`}>
          {isCompleted && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className={`w-7 h-7 rounded-lg ${role?.color || 'bg-slate-400'} flex items-center justify-center text-sm shrink-0 mt-0.5`}>{role?.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'} truncate`}>{task.name}</div>
            {attCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded inline-flex items-center gap-0.5">
                <Paperclip className="w-3 h-3" />{attCount}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{role?.name}</span>
            {isLinked ? <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-medium text-xs">{t('project_linked')}</span> : <span>· {task.frequency}</span>}
            {task.duration != null && task.duration !== '' && <span>· {task.duration}{t('minutes')}</span>}
          </div>
          {task.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
          )}
        </div>
        {import.meta.env.DEV && (
          <button onClick={() => splitTask(task)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400" title={t('ai_split')}>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  const renderProjectTask = (t: AnyProjectTask) => (
    <ProjectTaskCard key={t.completionKey} task={t as never} roles={roles}
      isCompleted={isTaskCompleted(t)} onToggle={() => toggleProjectOrAlbum(t)} onSplit={splitTask as never} />
  );

  const hasAnyTasks = todayTasks.length > 0 || projectTasks.length > 0;
  const dateStr = new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('today_title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{dateStr}</p>
      </div>

      {overdueTasks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-rose-600">{t('today_overdue_with_count', { n: overdueTasks.length })}</h3>
          </div>
          <div className="space-y-2">
            {overdueTasks.map(task => (
              <ProjectTaskCard key={task.completionKey} task={task as never} roles={roles} isOverdue
                isCompleted={isTaskCompleted(task)} onToggle={() => toggleProjectOrAlbum(task)} onSplit={splitTask as never} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('today_timeline')}</h3>
        </div>
        <div className="space-y-3">
          {TIME_SLOTS.map(slot => {
            const dailyInSlot = slotDailyTasks[slot.id] || [];
            const projectsInSlot = slotProjectTasks[slot.id] || [];
            const totalInSlot = dailyInSlot.length + projectsInSlot.length;
            const completedInSlot =
              dailyInSlot.filter(task => completions[task.frequency === '项目联动' ? ((task as Task & { completionKey?: string }).completionKey as string) : `${task.id}|${todayKey}`]).length +
              projectsInSlot.filter(task => isTaskCompleted(task)).length;

            return (
              <div key={slot.id} className={`rounded-xl border-2 ${slot.borderColor} ${slot.bgColor} overflow-hidden`}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${slot.iconBg} flex items-center justify-center text-xl shrink-0`}>
                    {slot.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t(slot.labelKey)}</h4>
                      {totalInSlot > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-full font-medium">
                          {completedInSlot}/{totalInSlot}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{t(slot.descKey)}</p>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  {totalInSlot === 0 ? (
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('no_tasks_in_slot')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectsInSlot.map(task => renderProjectTask(task))}
                      {dailyInSlot.map(task => renderDailyTask(task))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(otherDailyTasks.length > 0 || otherProjectTasks.length > 0) && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <ListTodo className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('today_flex_label_with_count', { n: otherDailyTasks.length + otherProjectTasks.length })}</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">— {t('today_flex_hint')}</span>
          </div>
          <div className="space-y-2">
            {otherProjectTasks.map(task => renderProjectTask(task))}
            {otherDailyTasks.map(task => renderDailyTask(task))}
          </div>
        </div>
      )}

      {!hasAnyTasks && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">{t('today_empty')}</p>
        </div>
      )}
    </div>
  );
}
