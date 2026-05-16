// 递归子任务树。竖线对齐父任务圆圈中心:
//   - 第一层 SubtaskTree 的 border-l 由挂载位置的 pl-[19px]/pl-[21px] 控制
//   - 递归层用 SubtaskRow 内 ml-[7px] 把下一层挪到当前圆圈中心 (w-4 中心 8px,border 居中 -1)
// 深度限制:与后端 MAX_NESTING_DEPTH 同步。叶子层(数据 level 5)隐藏 ▶ 箭头和"+ 添加子任务"。
// 移动端:操作按钮触摸目标更大;指示文字字号在小屏下不变(本身已 text-xs,可读)。

import { useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, ChevronRight, Edit2, Paperclip, Plus, Trash2 } from 'lucide-react';
import { useT } from '../lib/i18n';
import { taskCompletionKey } from '../lib/taskKey';
import type { Task } from '../lib/types';

// 数据 level 1 = 顶层任务;最深允许 level 5。
// SubtaskRow.level 对应数据 level - 1(顶层挂载传 level=1,渲染的是数据 level 2)。
const MAX_DEPTH = 5;

type Props = {
  parentTaskId: string;
  childrenByParent: Record<string, Task[]>;
  taskAttachmentCounts: Record<string, number>;
  completions: Record<string, unknown>;
  todayKey: string;
  level: number;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubtask: (parentId: string, name: string) => void;
};

export default function SubtaskTree(props: Props) {
  const t = useT();
  const { parentTaskId, childrenByParent, onAddSubtask, level } = props;
  const children = childrenByParent[parentTaskId] || [];
  const [addingMode, setAddingMode] = useState(false);
  const [newName, setNewName] = useState('');

  // SubtaskTree.level=N 创建的子任务是数据 level N+1。允许最大 N+1=MAX_DEPTH → N<MAX_DEPTH。
  const canAddChild = level < MAX_DEPTH;

  const submit = () => {
    const name = newName.trim();
    if (!name) { setAddingMode(false); return; }
    onAddSubtask(parentTaskId, name);
    setNewName('');
    setAddingMode(false);
  };

  return (
    <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5 py-1">
      {children.map((child) => (
        <SubtaskRow key={child.id} task={child} {...props} />
      ))}

      {canAddChild && (
        addingMode ? (
          <div className="flex items-center gap-2 pr-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') { e.preventDefault(); submit(); }
                if (e.key === 'Escape') { setAddingMode(false); setNewName(''); }
              }}
              onBlur={submit}
              placeholder={t('add_subtask_placeholder')}
              className="flex-1 min-w-0 px-2 py-1.5 sm:py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded"
            />
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setAddingMode(true); }}
            className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 py-1.5 sm:py-0.5"
          >
            <Plus className="w-3 h-3" />{t('add_subtask')}
          </button>
        )
      )}
    </div>
  );
}

function SubtaskRow({ task, childrenByParent, taskAttachmentCounts, completions, todayKey, level, onToggleComplete, onEdit, onDelete, onAddSubtask }: Props & { task: Task }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const grandchildren = childrenByParent[task.id] || [];
  // 完成态 key 必须走共享 taskCompletionKey,否则与写入/计数侧不一致:
  // 临时子任务用 ${id}|once、联动任务用自带 completionKey、其余按当天。
  const isVirtual = !!(task as { completionKey?: string }).completionKey || task.frequency === '项目联动';
  const completionKey = taskCompletionKey(task, todayKey);
  const isCompleted = !!completions[completionKey];
  const attCount = taskAttachmentCounts[task.id] ?? 0;

  const childDone = grandchildren.filter((g) => completions[taskCompletionKey(g, todayKey)]).length;
  const childTotal = grandchildren.length;

  // 虚拟任务(联动)不能再嵌子任务/编辑/删除。普通任务到叶子层(数据 level == MAX_DEPTH)
  // 也隐藏 ▶ 箭头(不会有子任务,也不能再加)。
  const isLeaf = isVirtual || level + 1 >= MAX_DEPTH;

  return (
    <div>
      <div className="flex items-start gap-2 min-w-0">
        <button
          onClick={() => onToggleComplete(task)}
          className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isCompleted ? 'bg-emerald-500 border-emerald-500 task-done' : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          {isCompleted && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'} break-words`}>
              {task.name}
            </span>
            {attCount > 0 && (
              <span className="text-[10px] px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded inline-flex items-center gap-0.5">
                <Paperclip className="w-2.5 h-2.5" />{attCount}
              </span>
            )}
            {!isLeaf && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-0.5 px-1 py-0.5 -my-0.5"
                title={childTotal > 0 ? '' : t('add_subtask')}
              >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {childTotal > 0 && (
                  <span>{t('subtasks_progress', { done: childDone, total: childTotal })}</span>
                )}
              </button>
            )}
          </div>
          {task.description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{task.description}</p>
          )}
        </div>
        {!isVirtual && (
          <div className="flex gap-0.5 shrink-0">
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400"
              title={t('edit')}
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(task)}
              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-rose-500"
              title={t('delete')}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {expanded && !isLeaf && (
        // ml-[7px] 把下一层的竖线对齐当前圆圈(w-4)中心 = 8px - 1px(border 居中)
        <div className="ml-[7px]">
          <SubtaskTree
            parentTaskId={task.id}
            childrenByParent={childrenByParent}
            taskAttachmentCounts={taskAttachmentCounts}
            completions={completions}
            todayKey={todayKey}
            level={level + 1}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddSubtask={onAddSubtask}
          />
        </div>
      )}
    </div>
  );
}
