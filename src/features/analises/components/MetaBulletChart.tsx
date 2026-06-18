import React from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';

export const MetaBulletChart: React.FC = () => {
  const { filteredMetas } = useDashboard();

  // Calculate overall achievements
  const summary = React.useMemo(() => {
    let totalTarget = 0;
    let totalActual = 0;
    
    filteredMetas.forEach(m => {
      totalTarget += m.target;
      totalActual += m.actual;
    });

    const percent = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

    return {
      totalTarget,
      totalActual,
      percent
    };
  }, [filteredMetas]);

  return (
    <div className="bg-white border border-slate-200 rounded p-4 flex flex-col h-[400px]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Acompanhamento de Metas</h3>
          <p className="text-[10px] text-slate-400">Progresso atual em relação à meta estabelecida</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Atingido</span>
          <span className="text-sm font-bold text-slate-800">
            {summary.percent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Global Card summary */}
      <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-2.5 rounded border border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded bg-orange-100 text-orange-600">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block uppercase font-medium">Meta Global</span>
            <span className="text-[11px] font-bold text-slate-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(summary.totalTarget)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded ${summary.percent >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block uppercase font-medium">Realizado</span>
            <span className="text-[11px] font-bold text-slate-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(summary.totalActual)}
            </span>
          </div>
        </div>
      </div>

      {/* Bullet Bars List */}
      <div className="flex-grow overflow-y-auto space-y-3.5 pr-1">
        {filteredMetas.map((meta) => {
          const percent = meta.target > 0 ? (meta.actual / meta.target) * 100 : 0;
          
          // Color based on performance
          let barColor = 'bg-red-500';
          
          if (percent >= 100) {
            barColor = 'bg-emerald-500';
          } else if (percent >= 85) {
            barColor = 'bg-blue-500';
          } else if (percent >= 60) {
            barColor = 'bg-orange-400';
          }


          const scaleMax = Math.max(meta.target, meta.actual);
          const actualWidthPct = scaleMax > 0 ? (meta.actual / scaleMax) * 100 : 0;
          const targetPosPct = scaleMax > 0 ? (meta.target / scaleMax) * 100 : 100;

          return (
            <div key={meta.id} className="group">
              <div className="flex justify-between items-baseline mb-1">
                <div>
                  <span className="text-[11px] font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">
                    {meta.category}
                  </span>
                  <span className="text-[9px] text-slate-400 ml-1.5">
                    ({meta.branch})
                  </span>
                </div>
                <div className="text-[10px] font-medium text-slate-500">
                  <span className="font-bold text-slate-700">
                    {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(meta.actual)}
                  </span>
                  <span className="text-slate-300 mx-1">/</span>
                  <span>
                    {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(meta.target)}
                  </span>
                </div>
              </div>

              {/* Progress Bullet Line */}
              <div className="relative h-4 w-full bg-slate-100 rounded overflow-hidden border border-slate-200 flex items-center">
                {/* 60% mark background */}
                <div className="absolute left-[60%] top-0 bottom-0 w-[1px] bg-slate-200"></div>
                {/* 85% mark background */}
                <div className="absolute left-[85%] top-0 bottom-0 w-[1px] bg-slate-200"></div>

                {/* Progress bar fill */}
                <div 
                  className={`h-full ${barColor} transition-all duration-500`}
                  style={{ width: `${actualWidthPct}%` }}
                />

                {/* Target Marker Pin */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-slate-800 shadow"
                  style={{ left: `calc(${targetPosPct}% - 2px)` }}
                  title={`Meta: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(meta.target)}`}
                />
                
                {/* Percentage Overlay */}
                <span className={`absolute right-2 text-[9px] font-bold ${percent >= actualWidthPct ? 'text-slate-800' : 'text-white'}`}>
                  {percent.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}

        {filteredMetas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-200 rounded">
            <AlertCircle className="w-5 h-5 text-slate-300 mb-1" />
            <span className="text-[11px] text-slate-400 font-medium">Nenhuma meta cadastrada para a seleção atual</span>
          </div>
        )}
      </div>
    </div>
  );
};
