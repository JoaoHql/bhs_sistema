import React from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { X, Undo, Check } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { activeToast, clearToast } = useDashboard();

  if (!activeToast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#0f172a] text-slate-100 border border-slate-900 px-4 py-3 rounded-xl shadow-2xl z-[9999] flex items-center space-x-3.5 select-none animate-slide-up text-xs font-semibold max-w-sm sm:max-w-md w-auto">
      <div className="h-5 w-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shrink-0">
        <Check className="w-3 h-3" />
      </div>
      
      <span className="flex-1 truncate pr-1">{activeToast.message}</span>
      
      {activeToast.actionText && activeToast.onAction && (
        <button
          onClick={() => {
            activeToast.onAction?.();
            clearToast();
          }}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors cursor-pointer shrink-0 border-none"
        >
          <Undo className="w-3 h-3" />
          <span>{activeToast.actionText}</span>
        </button>
      )}

      <button
        onClick={clearToast}
        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer shrink-0 border-none bg-transparent"
        title="Dispensar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
