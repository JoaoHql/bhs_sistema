import React from 'react';
import { Filter, X } from 'lucide-react';

export interface VisualFilter {
  key: string;
  label: string;
  value: string;
  tone?: 'orange' | 'blue' | 'emerald' | 'purple' | 'amber' | 'slate';
  onClear: () => void;
}

const toneClasses: Record<NonNullable<VisualFilter['tone']>, string> = {
  orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
};

interface VisualFiltersBarProps {
  filters: VisualFilter[];
  onClearAll: () => void;
}

export const VisualFiltersBar: React.FC<VisualFiltersBarProps> = ({ filters, onClearAll }) => {
  if (filters.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider inline-flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filtros ativos
          </span>
          {filters.map(filter => {
            const tone = toneClasses[filter.tone ?? 'slate'];

            return (
              <span
                key={filter.key}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-sm ${tone}`}
              >
                <span>{filter.label}: {filter.value}</span>
                <button
                  onClick={filter.onClear}
                  className="rounded p-0.5 transition-colors cursor-pointer"
                  title={`Remover filtro ${filter.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
        <button
          onClick={onClearAll}
          className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider cursor-pointer whitespace-nowrap"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
};
