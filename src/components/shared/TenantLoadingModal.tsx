import React from 'react';
import { Loader2 } from 'lucide-react';

interface TenantLoadingModalProps {
  label: string;
  progress?: number; // 0 to 100
  retryMessage?: string | null;
}

export const TenantLoadingModal: React.FC<TenantLoadingModalProps> = ({
  label,
  progress = 0,
  retryMessage = null,
}) => {
  const currentProgress = Math.min(100, Math.max(0, progress));

  const getStageLabel = (pct: number) => {
    if (pct < 35) return 'Início';
    if (pct < 80) return 'Meio';
    return 'Fim';
  };

  const activeStage = getStageLabel(currentProgress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 text-center">
        {/* Minimalist Spinner */}
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>

        {/* Dynamic Label */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {retryMessage && (
            <p className="text-xs font-medium text-amber-600 animate-pulse">{retryMessage}</p>
          )}
        </div>

        {/* Minimalist Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${currentProgress}%` }}
            />
          </div>

          {/* Clean Stage & Percentage Row */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-0.5">
            <div className="flex items-center space-x-2">
              <span className={activeStage === 'Início' ? 'text-blue-600 font-bold' : ''}>Início</span>
              <span>·</span>
              <span className={activeStage === 'Meio' ? 'text-blue-600 font-bold' : ''}>Meio</span>
              <span>·</span>
              <span className={activeStage === 'Fim' ? 'text-blue-600 font-bold' : ''}>Fim</span>
            </div>
            <span className="font-mono text-slate-600 font-bold">{Math.round(currentProgress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
