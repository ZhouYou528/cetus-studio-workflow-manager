import { Archive, Check, Trash2, X } from 'lucide-react';
import { useT } from '../lib/i18n';
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
  const t = useT();
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (days > 0) return t('n_days_ago', { n: days });
    if (hours > 0) return t('n_hours_ago', { n: hours });
    if (minutes > 0) return t('n_minutes_ago', { n: minutes });
    return t('just_deleted');
  };

  const getDaysUntilExpiry = (timestamp: number) => {
    const expiryTime = timestamp + 30 * 24 * 60 * 60 * 1000;
    return Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getItemDescription = (trashItem: TrashItem) => {
    const item = trashItem.item as Record<string, unknown> | null;
    if (!item) {
      return { icon: '?', title: t('trash_corrupt_title'), subtitle: t('trash_corrupt_subtitle'), color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
    }
    if (trashItem.type === 'task') {
      const role = (roles || []).find(r => r.id === (item.roleId as string));
      return {
        icon: '📝',
        title: (item.name as string) || t('unnamed_task'),
        subtitle: t('daily_task_subtitle', { role: role?.name || t('unnamed_role'), freq: (item.frequency as string) || '' }),
        color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      };
    }
    if (trashItem.type === 'project') {
      const subtitle = item.location
        ? t('shoot_project_subtitle_with_location', { date: (item.shootDate as string) || '', location: String(item.location) })
        : t('shoot_project_subtitle', { date: (item.shootDate as string) || '' });
      return {
        icon: '📸',
        title: `${(item.clientName as string) || t('unnamed')} - ${(item.shootType as string) || ''}`,
        subtitle,
        color: 'bg-blue-100 text-blue-700',
      };
    }
    if (trashItem.type === 'album') {
      return {
        icon: '📔',
        title: (item.clientName as string) || t('unnamed'),
        subtitle: t('album_subtitle', { type: (item.albumType as string) || t('album_name'), date: (item.startDate as string) || '' }),
        color: 'bg-amber-100 text-amber-700',
      };
    }
    if (trashItem.type === 'role') {
      const role = (item.role as Record<string, unknown>) || {};
      const tasksArr = item.tasks as unknown[] | undefined;
      return {
        icon: (role.icon as string) || '👤',
        title: (role.name as string) || t('unnamed_role'),
        subtitle: t('role_subtitle', { n: tasksArr?.length || 0 }),
        color: 'bg-purple-100 text-purple-700',
      };
    }
    return { icon: '?', title: t('unknown_item'), subtitle: '', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
  };

  const typeLabel = (type: string) =>
    type === 'task' ? t('type_task') : type === 'project' ? t('type_project') : type === 'album' ? t('type_album') : t('type_role');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Archive className="w-5 h-5 text-slate-600 dark:text-slate-400" />{t('trash_title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('trash_subtitle')}</p>
        </div>
        {trash.length > 0 && (
          <button onClick={() => {
            setConfirmDialog({
              title: t('confirm_empty_trash'),
              message: t('confirm_dialog_msg_empty_trash', { n: trash.length }),
              onConfirm: () => { onEmptyTrash(); setConfirmDialog(null); },
              danger: true,
            });
          }} className="text-sm text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" />{t('empty_trash')}
          </button>
        )}
      </div>

      {trash.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
          <Archive className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">{t('trash_empty')}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{t('trash_empty_hint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...trash].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)).map(trashItem => {
            const desc = getItemDescription(trashItem);
            const daysLeft = getDaysUntilExpiry(trashItem.deletedAt || Date.now());
            return (
              <div key={trashItem.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-lg shrink-0">{desc.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{desc.title}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${desc.color}`}>{typeLabel(trashItem.type)}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{desc.subtitle}</p>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{formatTime(trashItem.deletedAt || Date.now())}</span>
                    <span>·</span>
                    <span className={daysLeft <= 7 ? 'text-amber-600 font-medium' : ''}>{daysLeft <= 0 ? t('expires_soon') : t('expires_in_n_days', { n: daysLeft })}</span>
                  </div>
                </div>
                <button onClick={() => onRestore(trashItem.id)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium flex items-center gap-1 shrink-0">
                  <Check className="w-3.5 h-3.5" />{t('restore')}
                </button>
                <button onClick={() => {
                  setConfirmDialog({
                    title: t('confirm_title_permanent_delete', { name: desc.title }),
                    message: t('confirm_dialog_msg_permanent_delete'),
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
