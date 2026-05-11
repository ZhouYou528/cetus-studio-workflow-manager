import { useState } from 'react';
import { X } from 'lucide-react';
import type { Album } from '../lib/types';

type AlbumPatch = {
  clientName: string;
  albumType: string;
  startDate: string;
  notes: string;
};

type Props = {
  album: Album | null;
  onClose: () => void;
  onSave: (patch: AlbumPatch) => void;
};

export default function AlbumModal({ album, onClose, onSave }: Props) {
  const [clientName, setClientName] = useState(album?.clientName || '');
  const [albumType, setAlbumType] = useState(album?.albumType || '婚礼相册');
  const [startDate, setStartDate] = useState(album?.startDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(album?.notes || '');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{album ? '编辑相册设计' : '新增相册设计'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">客户姓名</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">相册类型</label>
            <select value={albumType} onChange={e => setAlbumType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option>婚礼相册</option><option>婚纱相册</option><option>儿童相册</option><option>家庭相册</option><option>个人写真相册</option><option>其他</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">设计开始日期</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">备注</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">取消</button>
          <button onClick={() => clientName.trim() && startDate && onSave({ clientName, albumType, startDate, notes })}
            disabled={!clientName.trim() || !startDate} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}
