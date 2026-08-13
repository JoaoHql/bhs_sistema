import React from 'react';

interface ChartPanelSize {
  width: number;
  height: number;
}

interface ResizableChartPanelProps {
  panelId: string;
  title: string;
  description?: string;
  sourceLabel?: string;
  storageKey?: string;
  defaultSize: ChartPanelSize;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

/** Painel de gráfico controlado pelo template; não expõe resize ao usuário. */
export const ResizableChartPanel: React.FC<ResizableChartPanelProps> = ({
  title,
  description,
  sourceLabel = 'Fonte: base detalhada de vendas',
  defaultSize,
  children,
  ariaLabel,
  className = '',
}) => (
  <section
    className={`relative flex min-w-0 w-full max-w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    style={{ minHeight: defaultSize.height, height: defaultSize.height }}
    aria-label={ariaLabel}
  >
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{description}</p>}
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-hidden border-b border-slate-100 p-1.5">{children}</div>
    <footer className="shrink-0 px-4 py-1.5 text-[10px] font-medium text-slate-400">{sourceLabel}</footer>
  </section>
);
