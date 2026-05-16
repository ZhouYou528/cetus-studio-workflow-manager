import { useState, type ReactNode } from 'react';
import { AlertCircle, Check, CheckCircle2, ChevronDown, ChevronRight, ListTodo, Paperclip, Sparkles } from 'lucide-react';
import ProjectTaskCard from '../components/ProjectTaskCard';
import SubtaskTree from '../components/SubtaskTree';
import { useT } from '../lib/i18n';
import { useLocale } from '../lib/prefs';
import { taskCompletionKey } from '../lib/taskKey';
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
  childrenByParent?: Record<string, Task[]>;
  expandedTasks?: Set<string>;
  toggleExpand?: (id: string) => void;
  addSubtask?: (parentId: string, name: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
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
  childrenByParent, expandedTasks, toggleExpand, addSubtask, onEditTask, onDeleteTask,
}: Props) {
  const t = useT();
  const [locale] = useLocale();
  // 当前展开的区域(同一时间只展开一个,与职位职责 tab 行为一致;默认全部折叠)
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
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
    const completionKey = taskCompletionKey(task, todayKey);
    const isCompleted = !!completions[completionKey];
    const attCount = taskAttachmentCounts?.[task.id] ?? 0;
    const kids = childrenByParent?.[task.id] || [];
    const childTotal = kids.length;
    const childDone = kids.filter(k => completions[taskCompletionKey(k, todayKey)]).length;
    const isExpanded = expandedTasks?.has(task.id) ?? false;
    const canExpand = !isLinked && toggleExpand && childrenByParent && addSubtask;
    return (
      <div key={task.id} className={`bg-white dark:bg-slate-900 rounded-xl border transition ${
        isCompleted ? 'border-emerald-200 bg-emerald-50/30' : isLinked ? 'border-rose-200' : 'border-slate-200 dark:border-slate-700'
      }`}>
        <div className="p-3 flex items-start gap-3">
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
              {canExpand && (
                <button
                  onClick={() => toggleExpand!(task.id)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-0.5 px-1.5 py-1 sm:py-0.5 -my-1 sm:-my-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  title={childTotal > 0 ? '' : t('add_subtask')}
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {childTotal > 0 && (
                    <span>{t('subtasks_progress', { done: childDone, total: childTotal })}</span>
                  )}
                </button>
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
        {isExpanded && canExpand && (
          // pl-[21px] 对齐父圆圈中心 (p-3 + w-5/2 = 22px;border 居中 = 21+1)
          <div className="pl-[21px] pr-3 pb-3 -mt-1">
            <SubtaskTree
              parentTaskId={task.id}
              childrenByParent={childrenByParent!}
              taskAttachmentCounts={taskAttachmentCounts || {}}
              completions={completions}
              todayKey={todayKey}
              level={1}
              onToggleComplete={(sub) => {
                const k = taskCompletionKey(sub, todayKey);
                updateCompletions({ ...completions, [k]: !completions[k] });
              }}
              onEdit={(sub) => onEditTask?.(sub)}
              onDelete={(sub) => onDeleteTask?.(sub)}
              onAddSubtask={addSubtask!}
            />
          </div>
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

  // 每个"区域"做成可折叠卡片;折叠时网格每行两个,展开时占满整行(UX 对齐职位职责 tab)。
  type Section = {
    id: string;
    icon: ReactNode;
    iconBg: string;
    cardAccent: string;
    title: string;
    titleClass?: string;
    desc?: string;
    done: number;
    total: number;
    body: ReactNode;
  };
  const sections: Section[] = [];

  if (overdueTasks.length > 0) {
    sections.push({
      id: 'overdue',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      iconBg: 'bg-rose-100 dark:bg-rose-900/60',
      cardAccent: 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20',
      title: t('today_overdue_with_count', { n: overdueTasks.length }),
      titleClass: 'text-rose-700 dark:text-rose-300',
      done: overdueTasks.filter(task => isTaskCompleted(task)).length,
      total: overdueTasks.length,
      body: (
        <div className="space-y-2">
          {overdueTasks.map(task => (
            <ProjectTaskCard key={task.completionKey} task={task as never} roles={roles} isOverdue
              isCompleted={isTaskCompleted(task)} onToggle={() => toggleProjectOrAlbum(task)} onSplit={splitTask as never} />
          ))}
        </div>
      ),
    });
  }

  TIME_SLOTS.forEach(slot => {
    const dailyInSlot = slotDailyTasks[slot.id] || [];
    const projectsInSlot = slotProjectTasks[slot.id] || [];
    const totalInSlot = dailyInSlot.length + projectsInSlot.length;
    const completedInSlot =
      dailyInSlot.filter(task => completions[taskCompletionKey(task, todayKey)]).length +
      projectsInSlot.filter(task => isTaskCompleted(task)).length;
    sections.push({
      id: slot.id,
      icon: <span className="text-xl">{slot.icon}</span>,
      iconBg: slot.iconBg,
      cardAccent: `${slot.borderColor} ${slot.bgColor}`,
      title: t(slot.labelKey),
      desc: t(slot.descKey),
      done: completedInSlot,
      total: totalInSlot,
      body: totalInSlot === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('no_tasks_in_slot')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projectsInSlot.map(task => renderProjectTask(task))}
          {dailyInSlot.map(task => renderDailyTask(task))}
        </div>
      ),
    });
  });

  if (otherDailyTasks.length > 0 || otherProjectTasks.length > 0) {
    const flexDone =
      otherDailyTasks.filter(task => completions[taskCompletionKey(task, todayKey)]).length +
      otherProjectTasks.filter(task => isTaskCompleted(task)).length;
    sections.push({
      id: 'flex',
      icon: <ListTodo className="w-5 h-5 text-slate-600 dark:text-slate-300" />,
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      cardAccent: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
      title: t('today_flex_label_with_count', { n: otherDailyTasks.length + otherProjectTasks.length }),
      desc: t('today_flex_hint'),
      done: flexDone,
      total: otherDailyTasks.length + otherProjectTasks.length,
      body: (
        <div className="space-y-2">
          {otherProjectTasks.map(task => renderProjectTask(task))}
          {otherDailyTasks.map(task => renderDailyTask(task))}
        </div>
      ),
    });
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('today_title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{dateStr}</p>
      </div>

      {!hasAnyTasks ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">{t('today_empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map(s => {
            const isExpanded = expandedSection === s.id;
            return (
              <div
                key={s.id}
                className={`rounded-xl border-2 ${s.cardAccent} overflow-hidden hover:shadow-md transition-shadow ${isExpanded ? 'md:col-span-2' : ''}`}
              >
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : s.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-semibold text-sm ${s.titleClass ?? 'text-slate-900 dark:text-slate-100'}`}>{s.title}</h4>
                      {s.total > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-full font-medium">
                          {s.done}/{s.total}
                        </span>
                      )}
                    </div>
                    {s.desc && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">{s.desc}</p>}
                  </div>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />}
                </button>
                {isExpanded && <div className="px-3 pb-3">{s.body}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
