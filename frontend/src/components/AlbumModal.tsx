import { useState } from 'react';
import { X } from 'lucide-react';
import type { Attachment } from '../lib/api';
import { useT } from '../lib/i18n';
import type { Album } from '../lib/types';
import AttachmentsSection from './AttachmentsSection';

const ALBUM_TYPE_OPTIONS = [
  { value: '婚礼相册',    labelKey: 'album_type_wedding'       as const },
  { value: '婚纱相册',    labelKey: 'album_type_wedding_photo' as const },
  { value: '儿童相册',    labelKey: 'album_type_kids'          as const },
  { value: '家庭相册',    labelKey: 'album_type_family'        as const },
  { value: '个人写真相册', labelKey: 'album_type_portrait'      as const },
  { value: '其他',        labelKey: 'album_type_other'         as const },
];

type AlbumPatch = {
  clientName: string;
  albumType: string;
  startDate: string;
  notes: string;
};

type Props = {
  album: Album | null;
  parentId?: string | null;
  attachments?: Attachment[];
  onAttachmentsChange?: (items: Attachment[]) => void;
  onClose: () => void;
  onSave: (patch: AlbumPatch) => void;
};

export default function AlbumModal({ album, parentId, attachments, onAttachmentsChange, onClose, onSave }: Props) {
  const t = useT();
  const [clientName, setClientName] = useState(album?.clientName || '');
  const [albumType, setAlbumType] = useState(album?.albumType || ALBUM_TYPE_OPTIONS[0].value);
  const [startDate, setStartDate] = useState(album?.startDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(album?.notes || '');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{album ? t('modal_edit_album') : t('modal_add_album')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('project_client')}</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('album_type')}</label>
            <select value={albumType} onChange={e => setAlbumType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm">
              {ALBUM_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('album_start')}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('project_notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm resize-none" />
          </div>
          <AttachmentsSection parentType="album" parentId={parentId ?? null} initial={attachments} onChange={onAttachmentsChange} />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{t('cancel')}</button>
          <button onClick={() => clientName.trim() && startDate && onSave({ clientName, albumType, startDate, notes })}
            disabled={!clientName.trim() || !startDate} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">{t('save')}</button>
        </div>
      </div>
    </div>
  );
}
