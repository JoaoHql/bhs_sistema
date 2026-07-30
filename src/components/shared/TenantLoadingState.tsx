import React from 'react';
import { Loader2 } from 'lucide-react';

interface TenantLoadingStateProps {
  label: string;
  compact?: boolean;
}

export const TenantLoadingState: React.FC<TenantLoadingStateProps> = ({ label, compact = false }) => (
  <div className={`${compact ? 'min-h-24' : 'min-h-[360px]'} flex items-center justify-center`}>
    <div className="w-full max-w-sm space-y-4 text-center" role="status" aria-live="polite">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="tenant-loading-bar h-full w-2/5 rounded-full bg-blue-500" />
        </div>
      </div>
    </div>
  </div>
);
