import { AlertCircle, Clock, Loader2, Sparkles, X } from 'lucide-react';

type SplitStep = { name: string; duration: number; note?: string };

type SplitResult = {
  steps?: SplitStep[];
  totalTime?: number;
  tips?: string;
  error?: string;
};

type Props = {
  task: { name: string };
  result: SplitResult | null;
  loading: boolean;
  onClose: () => void;
};

export default function SplitModal({ task, result, loading, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /><h3 className="text-lg font-semibold">任务拆分</h3></div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-500 mb-1">任务名称</div>
          <div className="font-medium text-slate-900">{task.name}</div>
        </div>
        {loading && (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">AI正在分析并拆分任务...</p>
          </div>
        )}
        {!loading && result?.error && (
          <div className="py-8 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">{result.error}</p>
          </div>
        )}
        {!loading && result?.steps && (
          <div>
            <div className="flex items-center gap-3 mb-3 text-sm">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-4 h-4" /><span>预计总耗时:<strong className="text-slate-900">{result.totalTime}分钟</strong></span>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {result.steps.map((step, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-slate-900 text-sm">{step.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{step.duration}分钟</div>
                      </div>
                      {step.note && <div className="text-xs text-slate-600 mt-1">💡 {step.note}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {result.tips && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs font-medium text-amber-900 mb-1">执行建议</div>
                <div className="text-sm text-amber-800">{result.tips}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
