import { Archive, Check, Trash2, X } from 'lucide-react';
import type { ConfirmPayload, Role, TrashItem } from '../lib/types';

type Props = {
  trash: TrashItem[];
  roles: Role[];
  onRestore: (trashId: string) => void;
  onPermanentDelete: (trashId: string) => void;
  onEmptyTrash: () => void;
  setConfirmDialog: (p: ConfirmPayload | null) => void;
};

export default function TrashView({ trash, roles, onRestore, onPermanentDelete, onEmptyTrash, setConfirmDialog }: Props) {
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (days > 0) return `${days}天前删除`;
    if (hours > 0) return `${hours}小时前删除`;
    if (minutes > 0) return `${minutes}分钟前删除`;
    return '刚刚删除';
  };

  const getDaysUntilExpiry = (timestamp: number) => {
    const expiryTime = timestamp + 30 * 24 * 60 * 60 * 1000;
    return Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getItemDescription = (trashItem: TrashItem) => {
    const item = trashItem.item as Record<string, unknown> | null;
    if (!item) {
      return { icon: '?', title: '损坏的数据', subtitle: '该回收项数据异常,建议永久删除', color: 'bg-slate-100 text-slate-700' };
    }
    if (trashItem.type === 'task') {
      const role = (roles || []).find(r => r.id === (item.roleId as string));
      return { icon: '📝', title: (item.name as string) || '未命名任务', subtitle: `日常任务 · ${role?.name || '未知职位'} · ${(item.frequency as string) || ''}`, color: 'bg-slate-100 text-slate-700' };
    }
    if (trashItem.type === 'project') {
      return { icon: '📸', title: `${(item.clientName as string) || '未命名'} - ${(item.shootType as string) || ''}`, subtitle: `拍摄项目 · ${(item.shootDate as string) || ''}${item.location ? ` · ${item.location}` : ''}`, color: 'bg-blue-100 text-blue-700' };
    }
    if (trashItem.type === 'album') {
      return { icon: '📔', title: (item.clientName as string) || '未命名', subtitle: `相册设计 · ${(item.albumType as string) || '相册'} · 开始 ${(item.startDate as string) || ''}`, color: 'bg-amber-100 text-amber-700' };
    }
    if (trashItem.type === 'role') {
      const role = (item.role as Record<string, unknown>) || {};
      const tasksArr = item.tasks as unknown[] | undefined;
      return { icon: (role.icon as string) || '👤', title: (role.name as string) || '未知职位', subtitle: `职位 · 含 ${tasksArr?.length || 0} 个相关任务`, color: 'bg-purple-100 text-purple-700' };
    }
    return { icon: '?', title: '未知项目', subtitle: '', color: 'bg-slate-100 text-slate-700' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Archive className="w-5 h-5 text-slate-600" />回收站
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">删除的项目会保留30天,之后自动永久清除</p>
        </div>
        {trash.length > 0 && (
          <button onClick={() => {
            setConfirmDialog({
              title: `清空回收站?`,
              message: `这将永久删除全部 ${trash.length} 个项目,无法恢复。`,
              onConfirm: () => { onEmptyTrash(); setConfirmDialog(null); },
              danger: true,
            });
          }} className="text-sm text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" />清空回收站
          </button>
        )}
      </div>

      {trash.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">回收站是空的</p>
          <p className="text-sm text-slate-400 mt-1">删除的任务、项目和相册会出现在这里</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...trash].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)).map(trashItem => {
            const desc = getItemDescription(trashItem);
            const daysLeft = getDaysUntilExpiry(trashItem.deletedAt || Date.now());
            return (
              <div key={trashItem.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg shrink-0">{desc.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{desc.title}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${desc.color}`}>
                      {trashItem.type === 'task' ? '任务' : trashItem.type === 'project' ? '拍摄项目' : trashItem.type === 'album' ? '相册' : '职位'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{desc.subtitle}</p>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{formatTime(trashItem.deletedAt || Date.now())}</span>
                    <span>·</span>
                    <span className={daysLeft <= 7 ? 'text-amber-600 font-medium' : ''}>{daysLeft <= 0 ? '即将清除' : `${daysLeft}天后自动清除`}</span>
                  </div>
                </div>
                <button onClick={() => onRestore(trashItem.id)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium flex items-center gap-1 shrink-0">
                  <Check className="w-3.5 h-3.5" />恢复
                </button>
                <button onClick={() => {
                  setConfirmDialog({
                    title: `永久删除"${desc.title}"?`,
                    message: `此操作无法撤销,该项目将被彻底清除。`,
                    onConfirm: () => { onPermanentDelete(trashItem.id); setConfirmDialog(null); },
                    danger: true,
                  });
                }} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
