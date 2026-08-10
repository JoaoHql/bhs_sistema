import React from 'react';
import { Loader2, Server, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

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

  const getStage = (pct: number): { key: 'inicio' | 'meio' | 'fim'; label: string; badgeColor: string } => {
    if (pct < 35) {
      return { key: 'inicio', label: 'Fase 1: Início', badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-200' };
    }
    if (pct < 80) {
      return { key: 'meio', label: 'Fase 2: Meio', badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-200' };
    }
    return { key: 'fim', label: 'Fase 3: Fim', badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
  };

  const stage = getStage(currentProgress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-2xl transition-all">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-6 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <Zap className="h-40 w-40 text-white" />
          </div>
          <div className="relative z-10 flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">BHS Soluções Inteligentes</h2>
              <p className="text-xs text-blue-100/90 font-medium">Inicializando ambiente do painel</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Status and Percentage header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${stage.badgeColor}`}>
                {stage.label}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-800">
                {Math.round(currentProgress)}%
              </span>
            </div>
          </div>

          {/* Dynamic Progress Bar with Start/Middle/End checkpoints */}
          <div className="space-y-2">
            <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200 p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300 ease-out shadow-sm"
                style={{ width: `${currentProgress}%` }}
              />
            </div>

            {/* Checkpoint Indicators (Start, Middle, End) */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1 pt-1">
              <div className={`flex items-center space-x-1 ${currentProgress >= 0 ? 'text-blue-600 font-bold' : ''}`}>
                <Server className="h-3 w-3" />
                <span>Início (0-30%)</span>
              </div>
              <div className={`flex items-center space-x-1 ${currentProgress >= 35 ? 'text-amber-600 font-bold' : ''}`}>
                <Zap className="h-3 w-3" />
                <span>Meio (35-75%)</span>
              </div>
              <div className={`flex items-center space-x-1 ${currentProgress >= 80 ? 'text-emerald-600 font-bold' : ''}`}>
                <CheckCircle2 className="h-3 w-3" />
                <span>Fim (80-100%)</span>
              </div>
            </div>
          </div>

          {/* Current Action / Retry Box */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-2 text-center">
            <p className="text-sm font-semibold text-slate-700 leading-snug">{label}</p>

            {retryMessage ? (
              <div className="inline-flex items-center space-x-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200/80 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                <span>{retryMessage}</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium">
                Conectando aos serviços VPS e validando manifestos de telas...
              </p>
            )}
          </div>

          {/* Bottom Security Note */}
          <div className="flex items-center justify-center space-x-1.5 text-[11px] font-semibold text-slate-400 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Conexão segura · BHS Multi-Tenant Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
};
