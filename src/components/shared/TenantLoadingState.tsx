import React from 'react';
import { Loader2 } from 'lucide-react';

interface TenantLoadingStateProps {
  label: string;
  compact?: boolean;
  progress?: number;
}

export const TenantLoadingState: React.FC<TenantLoadingStateProps> = ({
  label,
  compact = false,
  progress,
}) => {
  const hasProgress = typeof progress === 'number';
  const currentProgress = hasProgress ? Math.min(100, Math.max(0, progress)) : 50;

  const getStageLabel = (pct: number) => {
    if (pct < 35) return 'Início (0-30%)';
    if (pct < 80) return 'Meio (35-75%)';
    return 'Fim (80-100%)';
  };

  return (
    <div className={`${compact ? 'min-h-24' : 'min-h-[360px]'} flex items-center justify-center p-4`}>
      <div className="w-full max-w-sm space-y-4 text-center" role="status" aria-live="polite">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 border border-slate-200/80 p-0.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300 ${
                !hasProgress ? 'tenant-loading-bar w-2/5' : ''
              }`}
              style={hasProgress ? { width: `${currentProgress}%` } : undefined}
            />
          </div>
          {hasProgress && (
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>{getStageLabel(currentProgress)}</span>
              <span className="font-mono text-slate-600 font-bold">{Math.round(currentProgress)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
