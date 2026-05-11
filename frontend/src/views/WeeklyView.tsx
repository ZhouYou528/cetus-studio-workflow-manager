import { CalendarDays, Check, Edit2, Sparkles, Trash2 } from 'lucide-react';
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
};

export default function WeeklyView({ tasks, roles, completions, todayKey, updateCompletions, splitTask, onEdit, onDelete }: Props) {
  const weeklyTasks = tasks.filter(t => t.isWeekly);

  // 按职位分组
  const tasksByRole: Record<string, Task[]> = {};
  weeklyTasks.forEach(t => {
    if (!tasksByRole[t.roleId]) tasksByRole[t.roleId] = [];
    tasksByRole[t.roleId].push(t);
  });
  Object.keys(tasksByRole).forEach(roleId => {
    tasksByRole[roleId].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  });

  const completedCount = weeklyTasks.filter(t => completions[`${t.id}|${todayKey}`]).length;
  const totalCount = weeklyTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const today = new Date(todayKey);
  const overdueTasks = weeklyTasks.filter(t => t.dueDate && new Date(t.dueDate) < today && !completions[`${t.id}|${todayKey}`]);

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今天截止';
    if (diff === 1) return '明天截止';
    if (diff < 0) return `逾期${Math.abs(diff)}天`;
    if (diff <= 7) return `还有${diff}天`;
    return `${date.getMonth() + 1}月${date.getDate()}日截止`;
  };

  const getDueDateColor = (dateStr: string | null, isCompleted: boolean) => {
    if (isCompleted) return 'text-emerald-600';
    if (!dateStr) return 'text-slate-500';
    const date = new Date(dateStr);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0 || diff === 0) return 'text-rose-600 font-semibold';
    if (diff === 1) return 'text-amber-600 font-medium';
    if (diff <= 3) return 'text-amber-600';
    return 'text-slate-500';
  };

  const getPriorityFromDescription = (description: string | null) => {
    if (!description) return null;
    if (description.includes('优先级:高')) return { label: '高', color: 'bg-rose-100 text-rose-700' };
    if (description.includes('优先级:中')) return { label: '中', color: 'bg-amber-100 text-amber-700' };
    if (description.includes('优先级:低')) return { label: '低', color: 'bg-slate-100 text-slate-600' };
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">本周待办</h2>
          <p className="text-sm text-slate-500 mt-0.5">按职位分类的本周重点任务 · 共 {totalCount} 项 · 已完成 {completedCount} 项</p>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">本周整体进度</span>
            <span className="text-sm font-semibold text-slate-900">{progressPct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>已完成 {completedCount}</span>
            </div>
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600 font-medium">逾期 {overdueTasks.length}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <span>待办 {totalCount - completedCount - overdueTasks.length}</span>
            </div>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">本周暂无安排</p>
          <p className="text-sm text-slate-400 mt-1">需要添加本周任务,可以在 Claude 对话里告诉我</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(tasksByRole).map(roleId => {
            const role = roles.find(r => r.id === roleId);
            if (!role) return null;
            const roleTasks = tasksByRole[roleId];
            const roleCompleted = roleTasks.filter(t => completions[`${t.id}|${todayKey}`]).length;

            return (
              <div key={roleId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${role.color} flex items-center justify-center text-base shrink-0`}>
                    {role.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm">{role.name}</h3>
                      {role.isAssistant && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">助理</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{roleCompleted}/{roleTasks.length} 已完成</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {Math.round((roleCompleted / roleTasks.length) * 100)}%
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {roleTasks.map(t => {
                    const completionKey = `${t.id}|${todayKey}`;
                    const isCompleted = !!completions[completionKey];
                    const priority = getPriorityFromDescription(t.description);

                    return (
                      <div key={t.id} className={`p-3 flex items-start gap-3 transition ${isCompleted ? 'bg-emerald-50/40' : ''}`}>
                        <button
                          onClick={() => updateCompletions({ ...completions, [completionKey]: !isCompleted })}
                          className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                            isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {isCompleted && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {t.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                            {priority && (
                              <span className={`px-1.5 py-0.5 rounded font-medium ${priority.color}`}>
                                优先级 {priority.label}
                              </span>
                            )}
                            <span className={getDueDateColor(t.dueDate, isCompleted)}>
                              📅 {formatDueDate(t.dueDate)}
                            </span>
                            {t.duration && <span className="text-slate-500">⏱ {t.duration}分钟</span>}
                          </div>
                          {t.description && (
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{t.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => splitTask(t)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="AI拆分">
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="编辑">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onDelete(t)} className="p-1.5 hover:bg-rose-50 rounded text-rose-500" title="删除">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
