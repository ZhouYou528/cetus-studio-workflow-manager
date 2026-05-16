import { useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronRight, Edit2, Paperclip, Sparkles, Trash2 } from 'lucide-react';
import SubtaskTree from '../components/SubtaskTree';
import { useT } from '../lib/i18n';
import { taskCompletionKey } from '../lib/taskKey';
import type { Role, Task } from '../lib/types';

type Props = {
  tasks: Task[];
  roles: Role[];
  completions: Record<string, unknown>;
  todayKey: string;
  updateCompletions: (next: Record<string, unknown>) => void;
  splitTask: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  taskAttachmentCounts?: Record<string, number>;
  childrenByParent?: Record<string, Task[]>;
  expandedTasks?: Set<string>;
  toggleExpand?: (id: string) => void;
  addSubtask?: (parentId: string, name: string) => void;
};

export default function WeeklyView({ tasks, roles, completions, todayKey, updateCompletions, splitTask, onEdit, onDelete, taskAttachmentCounts, childrenByParent, expandedTasks, toggleExpand, addSubtask }: Props) {
  const t = useT();
  // 当前展开的职位区域(同一时间只展开一个,与职位职责 tab 行为一致;默认全部折叠)
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  // 顶层周任务;子任务在父任务展开后通过 SubtaskTree 显示
  const weeklyTasks = tasks.filter(x => x.isWeekly && !x.parentTaskId);

  // 按职位分组
  const tasksByRole: Record<string, Task[]> = {};
  weeklyTasks.forEach(x => {
    if (!tasksByRole[x.roleId]) tasksByRole[x.roleId] = [];
    tasksByRole[x.roleId].push(x);
  });
  Object.keys(tasksByRole).forEach(roleId => {
    tasksByRole[roleId].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  });

  const completedCount = weeklyTasks.filter(x => completions[taskCompletionKey(x, todayKey)]).length;
  const totalCount = weeklyTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const today = new Date(todayKey);
  const overdueTasks = weeklyTasks.filter(x => x.dueDate && new Date(x.dueDate) < today && !completions[taskCompletionKey(x, todayKey)]);

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return t('due_today');
    if (diff === 1) return t('due_tomorrow');
    if (diff < 0) return t('overdue_n_days', { n: Math.abs(diff) });
    if (diff <= 7) return t('in_n_days', { n: diff });
    return t('due_on_date', { month: date.getMonth() + 1, day: date.getDate() });
  };

  const getDueDateColor = (dateStr: string | null, isCompleted: boolean) => {
    if (isCompleted) return 'text-emerald-600';
    if (!dateStr) return 'text-slate-500 dark:text-slate-400';
    const date = new Date(dateStr);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0 || diff === 0) return 'text-rose-600 font-semibold';
    if (diff === 1) return 'text-amber-600 font-medium';
    if (diff <= 3) return 'text-amber-600';
    return 'text-slate-500 dark:text-slate-400';
  };

  const getPriorityFromDescription = (description: string | null) => {
    if (!description) return null;
    if (description.includes('优先级:高')) return { label: t('priority_high'), color: 'bg-rose-100 text-rose-700' };
    if (description.includes('优先级:中')) return { label: t('priority_mid'), color: 'bg-amber-100 text-amber-700' };
    if (description.includes('优先级:低')) return { label: t('priority_low'), color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' };
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('tab_weekly')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('weekly_view_subtitle', { total: totalCount, done: completedCount })}</p>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('weekly_overall')}</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{progressPct}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t('completed_short')} {completedCount}</span>
            </div>
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600 font-medium">{t('overdue_short')} {overdueTasks.length}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <span>{t('pending_short')} {totalCount - completedCount - overdueTasks.length}</span>
            </div>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">{t('weekly_empty')}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{t('weekly_empty_hint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.keys(tasksByRole).map(roleId => {
            const role = roles.find(r => r.id === roleId);
            if (!role) return null;
            const roleTasks = tasksByRole[roleId];
            const roleCompleted = roleTasks.filter(x => completions[taskCompletionKey(x, todayKey)]).length;
            const isRoleExpanded = expandedRoleId === roleId;

            return (
              <div
                key={roleId}
                className={`bg-white dark:bg-slate-900 rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${isRoleExpanded ? 'md:col-span-2 border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700'}`}
              >
                <button
                  onClick={() => setExpandedRoleId(isRoleExpanded ? null : roleId)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 text-left"
                >
                  <div className={`w-8 h-8 rounded-lg ${role.color} flex items-center justify-center text-base shrink-0`}>
                    {role.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{role.name}</h3>
                      {role.isAssistant && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{t('role_assistant')}</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('n_completed_total', { done: roleCompleted, total: roleTasks.length })}</p>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                    {Math.round((roleCompleted / roleTasks.length) * 100)}%
                  </div>
                  {isRoleExpanded
                    ? <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />}
                </button>
                <div className={`collapsible ${isRoleExpanded ? 'open' : ''}`}>
                 <div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {roleTasks.map(x => {
                    const completionKey = taskCompletionKey(x, todayKey);
                    const isCompleted = !!completions[completionKey];
                    const priority = getPriorityFromDescription(x.description);
                    const attCount = taskAttachmentCounts?.[x.id] ?? 0;
                    const kids = childrenByParent?.[x.id] || [];
                    const childTotal = kids.length;
                    const childDone = kids.filter(k => completions[taskCompletionKey(k, todayKey)]).length;
                    const isExpanded = expandedTasks?.has(x.id) ?? false;

                    return (
                      <div key={x.id}>
                        <div className={`p-3 flex items-start gap-3 transition ${isCompleted ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}>
                        <button
                          onClick={() => updateCompletions({ ...completions, [completionKey]: !isCompleted })}
                          className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                            isCompleted ? 'bg-emerald-500 border-emerald-500 task-done' : 'border-slate-300 dark:border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {isCompleted && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                              {x.name}
                            </div>
                            {attCount > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded inline-flex items-center gap-0.5">
                                <Paperclip className="w-3 h-3" />{attCount}
                              </span>
                            )}
                            {toggleExpand && (
                              <button
                                onClick={() => toggleExpand(x.id)}
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
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                            {priority && (
                              <span className={`px-1.5 py-0.5 rounded font-medium ${priority.color}`}>
                                {t('priority_level', { level: priority.label })}
                              </span>
                            )}
                            <span className={getDueDateColor(x.dueDate, isCompleted)}>
                              📅 {formatDueDate(x.dueDate)}
                            </span>
                            {x.duration && <span className="text-slate-500 dark:text-slate-400">⏱ {x.duration}{t('minutes')}</span>}
                          </div>
                          {x.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{x.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {import.meta.env.DEV && (
                            <button onClick={() => splitTask(x)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400" title={t('ai_split')}>
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => onEdit(x)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400" title={t('edit')}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onDelete(x)} className="p-1.5 hover:bg-rose-50 rounded text-rose-500" title={t('delete')}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        </div>
                        {childrenByParent && addSubtask && (
                          <div className={`collapsible ${isExpanded ? 'open' : ''}`}>
                           <div>
                            {/* pl-[21px] 对齐父圆圈中心 (p-3 + w-5/2 = 22px;border 居中 = 21+1) */}
                            <div className="pl-[21px] pr-3 pb-3">
                            <SubtaskTree
                              parentTaskId={x.id}
                              childrenByParent={childrenByParent}
                              taskAttachmentCounts={taskAttachmentCounts || {}}
                              completions={completions}
                              todayKey={todayKey}
                              level={1}
                              onToggleComplete={(task) => {
                                const k = taskCompletionKey(task, todayKey);
                                updateCompletions({ ...completions, [k]: !completions[k] });
                              }}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onAddSubtask={addSubtask}
                            />
                            </div>
                           </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                 </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
