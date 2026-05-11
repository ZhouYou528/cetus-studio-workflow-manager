import { AlertCircle, Check, CheckCircle2, Clock, ListTodo, Sparkles } from 'lucide-react';
import ProjectTaskCard from '../components/ProjectTaskCard';
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
};

const TIME_SLOTS = [
  { id: 'morning',        label: '早上 8:00 - 9:00',   icon: '🌅', desc: '邮件 & 客服回复',          bgColor: 'bg-orange-50',  borderColor: 'border-orange-200', iconBg: 'bg-orange-100', roleIds: ['r6'] },
  { id: 'late_morning',   label: '上午 10:00 - 12:00', icon: '☕', desc: '修图工作',                  bgColor: 'bg-purple-50',  borderColor: 'border-purple-200', iconBg: 'bg-purple-100', roleIds: ['r3'] },
  { id: 'afternoon',      label: '下午 12:00 - 14:00', icon: '🌞', desc: '广告设计 & 相册设计',       bgColor: 'bg-amber-50',   borderColor: 'border-amber-200',  iconBg: 'bg-amber-100',  roleIds: ['r4', 'r5'] },
  { id: 'late_afternoon', label: '下午 15:00 - 16:00', icon: '🍵', desc: 'Marketing 运营对接(与助理)', bgColor: 'bg-rose-50',  borderColor: 'border-rose-200',   iconBg: 'bg-rose-100',   roleIds: ['r7'] },
] as const;

export default function TodayView({
  todayTasks, roles, completions, todayKey, updateCompletions, splitTask,
  projectTasks, projectCompletions, updateProjectCompletions, albumCompletions, updateAlbumCompletions,
}: Props) {
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = projectTasks.filter(t => t.dueDate < today);
  const todayDueTasks = projectTasks.filter(t => t.dueDate === today);

  const toggleProjectOrAlbum = (t: AnyProjectTask) => {
    if (t.isAlbum) updateAlbumCompletions({ ...albumCompletions, [t.completionKey]: !albumCompletions[t.completionKey] });
    else updateProjectCompletions({ ...projectCompletions, [t.completionKey]: !projectCompletions[t.completionKey] });
  };

  const isTaskCompleted = (t: AnyProjectTask) =>
    t.isAlbum ? !!albumCompletions[t.completionKey] : !!projectCompletions[t.completionKey];

  // 把日常任务按时间段分组
  const otherDailyTasks: Task[] = [];
  const slotDailyTasks: Record<string, Task[]> = {};
  TIME_SLOTS.forEach(slot => (slotDailyTasks[slot.id] = []));
  todayTasks.forEach(task => {
    const slot = TIME_SLOTS.find(s => s.roleIds.includes(task.roleId as never));
    if (slot) slotDailyTasks[slot.id].push(task);
    else otherDailyTasks.push(task);
  });

  // 把项目任务按时间段分组
  const slotProjectTasks: Record<string, AnyProjectTask[]> = {};
  const otherProjectTasks: AnyProjectTask[] = [];
  TIME_SLOTS.forEach(slot => (slotProjectTasks[slot.id] = []));
  todayDueTasks.forEach(task => {
    const slot = TIME_SLOTS.find(s => s.roleIds.includes(task.roleId as never));
    if (slot) slotProjectTasks[slot.id].push(task);
    else otherProjectTasks.push(task);
  });

  const renderDailyTask = (task: Task & { completionKey?: string }) => {
    const role = roles.find(r => r.id === task.roleId);
    const isLinked = task.frequency === '项目联动';
    const completionKey = isLinked ? (task.completionKey as string) : `${task.id}|${todayKey}`;
    const isCompleted = !!completions[completionKey];
    return (
      <div key={task.id} className={`bg-white rounded-xl border p-3 flex items-center gap-3 transition ${
        isCompleted ? 'border-emerald-200 bg-emerald-50/30' : isLinked ? 'border-rose-200' : 'border-slate-200'
      }`}>
        <button onClick={() => updateCompletions({ ...completions, [completionKey]: !isCompleted })}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-slate-500'}`}>
          {isCompleted && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className={`w-7 h-7 rounded-lg ${role?.color || 'bg-slate-400'} flex items-center justify-center text-sm shrink-0`}>{role?.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'} truncate`}>{task.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{role?.name}</span>
            {isLinked ? <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-medium text-xs">🔗 项目联动</span> : <span>· {task.frequency}</span>}
            {task.duration != null && task.duration !== '' && <span>· {task.duration}分钟</span>}
          </div>
        </div>
        <button onClick={() => splitTask(task)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="AI拆分">
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderProjectTask = (t: AnyProjectTask) => (
    <ProjectTaskCard key={t.completionKey} task={t as never} roles={roles}
      isCompleted={isTaskCompleted(t)} onToggle={() => toggleProjectOrAlbum(t)} onSplit={splitTask as never} />
  );

  const hasAnyTasks = todayTasks.length > 0 || projectTasks.length > 0;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">今日待办</h2>
        <p className="text-sm text-slate-500 mt-0.5">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
      </div>

      {overdueTasks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-rose-600">⚠️ 逾期任务 ({overdueTasks.length})</h3>
          </div>
          <div className="space-y-2">
            {overdueTasks.map(t => (
              <ProjectTaskCard key={t.completionKey} task={t as never} roles={roles} isOverdue
                isCompleted={isTaskCompleted(t)} onToggle={() => toggleProjectOrAlbum(t)} onSplit={splitTask as never} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">今日工作时间表</h3>
        </div>
        <div className="space-y-3">
          {TIME_SLOTS.map(slot => {
            const dailyInSlot = slotDailyTasks[slot.id] || [];
            const projectsInSlot = slotProjectTasks[slot.id] || [];
            const totalInSlot = dailyInSlot.length + projectsInSlot.length;
            const completedInSlot =
              dailyInSlot.filter(t => completions[t.frequency === '项目联动' ? ((t as Task & { completionKey?: string }).completionKey as string) : `${t.id}|${todayKey}`]).length +
              projectsInSlot.filter(t => isTaskCompleted(t)).length;

            return (
              <div key={slot.id} className={`rounded-xl border-2 ${slot.borderColor} ${slot.bgColor} overflow-hidden`}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${slot.iconBg} flex items-center justify-center text-xl shrink-0`}>
                    {slot.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900 text-sm">{slot.label}</h4>
                      {totalInSlot > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-white/80 text-slate-700 rounded-full font-medium">
                          {completedInSlot}/{totalInSlot}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{slot.desc}</p>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  {totalInSlot === 0 ? (
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">此时段暂无待办</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectsInSlot.map(t => renderProjectTask(t))}
                      {dailyInSlot.map(t => renderDailyTask(t))}
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
            <ListTodo className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">📋 灵活时间任务({otherDailyTasks.length + otherProjectTasks.length})</h3>
            <span className="text-xs text-slate-400">— 可在空闲时间完成</span>
          </div>
          <div className="space-y-2">
            {otherProjectTasks.map(t => renderProjectTask(t))}
            {otherDailyTasks.map(t => renderDailyTask(t))}
          </div>
        </div>
      )}

      {!hasAnyTasks && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">今日没有待办任务</p>
        </div>
      )}
    </div>
  );
}
