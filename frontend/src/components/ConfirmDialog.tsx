import { AlertCircle } from 'lucide-react';
import { useT } from '../lib/i18n';

type Props = {
  title: string;
  message?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ title, message, danger, onConfirm, onCancel }: Props) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-rose-100' : 'bg-amber-100'}`}>
            <AlertCircle className={`w-5 h-5 ${danger ? 'text-rose-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">{title}</h3>
            {message && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {danger ? t('permanent_delete') : t('confirm_delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
