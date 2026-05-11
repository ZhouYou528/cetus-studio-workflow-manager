import { useRef, useState } from 'react';
import { Download, FileText, ImageIcon, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { api, ApiError, type Attachment, type ParentType } from '../lib/api';
import { useT } from '../lib/i18n';

type Props = {
  parentType: ParentType;
  parentId: string | null; // null 表示父实体尚未保存(新建场景)
  initial?: Attachment[];   // 来自 bootstrap 的预填,避免再发一次 list 请求
  // 上传/删除后通知父组件,让顶层 attachments 状态同步,下次打开 Modal 还能看到
  onChange?: (items: Attachment[]) => void;
};

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_PREFIXES = ['image/'];
const ALLOWED_EXACT = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'text/plain', 'text/csv', 'text/markdown', 'application/json', 'application/zip',
]);
const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.svg', '.bmp',
  '.pdf',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.md', '.json', '.zip',
]);

function isAllowed(filename: string, mime: string): boolean {
  if (mime) {
    if (ALLOWED_EXACT.has(mime)) return true;
    if (ALLOWED_PREFIXES.some((p) => mime.startsWith(p))) return true;
  }
  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  return !!ext && ALLOWED_EXT.has(ext);
}

function formatSize(bytes: number, t: ReturnType<typeof useT>): string {
  if (bytes < 1024) return t('file_size_bytes', { n: bytes });
  if (bytes < 1024 * 1024) return t('file_size_kb', { n: Math.round(bytes / 1024) });
  return t('file_size_mb', { n: (bytes / 1024 / 1024).toFixed(1) });
}

function FileIcon({ mime, className }: { mime: string | null; className?: string }) {
  if (mime?.startsWith('image/')) return <ImageIcon className={className} />;
  return <FileText className={className} />;
}

export default function AttachmentsSection({ parentType, parentId, initial, onChange }: Props) {
  const t = useT();
  const [items, setItems] = useState<Attachment[]>(initial ?? []);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateItems = (next: Attachment[]) => {
    setItems(next);
    onChange?.(next);
  };

  if (!parentId) {
    return (
      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <Paperclip className="w-4 h-4 inline mr-1" />{t('save_first_to_attach')}
      </div>
    );
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    for (const f of fileArr) {
      if (f.size > MAX_BYTES) { alert(`${t('file_too_large_alert')}\n${f.name}`); continue; }
      if (!isAllowed(f.name, f.type)) { alert(`${t('unsupported_mime_alert')}\n${f.name} (${f.type || 'unknown type'})`); continue; }
      setUploading(true);
      try {
        const created = await api.uploadAttachment(parentType, parentId, f);
        updateItems([created, ...items]);
      } catch (e) {
        if (e instanceof ApiError) {
          const body = e.body as { error?: string; got?: string; filename?: string; ext?: string; limitMb?: number } | null;
          const code = body?.error;
          if (code === 'too_many_attachments') alert(t('too_many_attachments_alert'));
          else if (code === 'file_too_large') alert(`${t('file_too_large_alert')}\n${f.name}`);
          else if (code === 'unsupported_mime') alert(`${t('unsupported_mime_alert')}\n${body?.filename || f.name} (mime: ${body?.got || '?'}, ext: ${body?.ext || '?'})`);
          else if (code === 'forbidden') alert(`${t('upload_failed')}\nNo permission`);
          else alert(`${t('upload_failed')}\nHTTP ${e.status} ${code ? '· ' + code : ''}\n${f.name}`);
        } else {
          console.error(e);
          alert(`${t('upload_failed')}\n${e instanceof Error ? e.message : String(e)}\n${f.name}`);
        }
      } finally {
        setUploading(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (att: Attachment) => {
    if (!confirm(t('confirm_delete_attachment', { name: att.filename }))) return;
    try {
      await api.deleteAttachment(att.id);
      updateItems(items.filter((x) => x.id !== att.id));
    } catch (e) {
      console.error(e);
      alert(t('delete_failed'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Paperclip className="w-4 h-4" />
          {items.length > 0 ? t('attachments_label_with_count', { n: items.length }) : t('attachments_label')}
        </label>
      </div>

      {/* 文件列表 */}
      {items.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {items.map((att) => (
            <div key={att.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <FileIcon mime={att.contentType} className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900 dark:text-slate-100 truncate">{att.filename}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{formatSize(att.sizeBytes, t)}</div>
              </div>
              <a
                href={api.attachmentDownloadUrl(att.id)}
                download={att.filename}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 shrink-0"
                title={t('download')}
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => handleDelete(att)}
                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-rose-500 shrink-0"
                title={t('delete_attachment')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上传区(拖拽 + 点击) */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={`flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed rounded-lg text-sm cursor-pointer transition ${
          dragOver
            ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800'
            : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('uploading')}</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>{t('drag_drop_hint')}</span>
          </>
        )}
      </label>
    </div>
  );
}
