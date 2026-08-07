import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';

export const PerformanceTab: React.FC = () => {
  const { filteredMetas, setBranch } = useDashboard();

  // 1. General Metrics
  const summary = useMemo(() => {
    let totalTarget = 0;
    let totalActual = 0;
    filteredMetas.forEach(m => {
      totalTarget += m.target;
      totalActual += m.actual;
    });
    const pct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    return {
      totalTarget,
      totalActual,
      pct
    };
  }, [filteredMetas]);

  // 2. Atingimento por Empresa (Bullet Chart data)
  const empresaData = useMemo(() => {
    const empresasMap: Record<string, { target: number; actual: number }> = {};
    filteredMetas.forEach(m => {
      // Usar 'empresa' no lugar de 'branch' para o agrupamento, mas lembre-se que filteredMetas já está filtrado pela Filial global.
      const emp = m.empresa || 'Empresa Padrão';
      if (!empresasMap[emp]) {
        empresasMap[emp] = { target: 0, actual: 0 };
      }
      empresasMap[emp].target += m.target;
      empresasMap[emp].actual += m.actual;
    });

    return Object.entries(empresasMap).map(([name, val]) => ({
      name,
      Realizado: val.actual,
      Meta: val.target,
      percentual: Math.round(val.target > 0 ? (val.actual / val.target) * 100 : 0)
    })).sort((a, b) => b.percentual - a.percentual);
  }, [filteredMetas]);

  // 3. Gauge Data for general target progress
  const gaugeData = useMemo(() => {
    return [
      { name: 'Meta Geral', value: Math.min(100, Math.round(summary.pct)), fill: '#f97316' }
    ];
  }, [summary]);

  // 4. Atingimento por Vendedor
  const vendedorData = useMemo(() => {
    const vendedoresMap: Record<string, { target: number; actual: number }> = {};
    filteredMetas.forEach(m => {
      const vend = m.vendedor || 'Vendedor Não Atribuído';
      if (!vendedoresMap[vend]) {
        vendedoresMap[vend] = { target: 0, actual: 0 };
      }
      vendedoresMap[vend].target += m.target;
      vendedoresMap[vend].actual += m.actual;
    });

    return Object.entries(vendedoresMap).map(([name, val]) => ({
      name,
      Realizado: val.actual,
      Meta: val.target,
      percentual: Math.round(val.target > 0 ? (val.actual / val.target) * 100 : 0)
    })).sort((a, b) => b.percentual - a.percentual);
  }, [filteredMetas]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top: Gauge & Empresa Atingimento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual 1: General Target Gauge */}
        <div 
          onClick={() => setBranch('All')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px] items-center justify-between text-center cursor-pointer hover:border-orange-300 transition-colors"
          title="Clique para resetar filtro de filial"
        >
          <div className="w-full text-left">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Atingimento Geral de Metas</h3>
            <p className="text-xs text-slate-400">Total acumulado de todas as filiais. Clique para resetar filtro.</p>
          </div>
          
          <div className="relative w-48 h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="80%" 
                outerRadius="100%" 
                barSize={15} 
                data={gaugeData} 
                startAngle={180} 
                endAngle={0}
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute top-[60%] text-center">
              <span className="text-3xl font-extrabold text-slate-800">{summary.pct.toFixed(1)}%</span>
              <span className="text-xs text-slate-400 font-bold block mt-1 uppercase tracking-wider">Atingido</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs font-semibold">
            <div className="border-r border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Realizado</span>
              <span className="text-sm font-bold text-slate-800">{formatBRL(summary.totalActual)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Meta Alvo</span>
              <span className="text-sm font-bold text-slate-800">{formatBRL(summary.totalTarget)}</span>
            </div>
          </div>
        </div>

        {/* Atingimento por Empresa */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px] lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Atingimento de Meta por Empresa</h3>
          <p className="text-xs text-slate-400 mb-4">Realizado vs Meta agrupado por empresa (filtrado por filial ativa).</p>
          <div className="flex-grow min-h-0 space-y-5 overflow-y-auto pr-1">
            {empresaData.map(item => {
              return (
                <div 
                  key={item.name} 
                  className="space-y-1.5 p-2 rounded-lg transition-colors hover:bg-slate-50"
                >
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>{item.name}</span>
                    <span>{formatBRL(item.Realizado)} / {formatBRL(item.Meta)} ({item.percentual}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.percentual >= 100 
                          ? 'bg-emerald-500' 
                          : item.percentual >= 80 
                          ? 'bg-orange-500' 
                          : 'bg-red-500'
                      }`} 
                      style={{ width: `${Math.min(100, item.percentual)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Desempenho por Vendedor */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Desempenho por Vendedor</h3>
        <p className="text-xs text-slate-400 mb-3">Tabela de acompanhamento de vendas (filtrada pela filial global).</p>
        <div className="flex-grow overflow-y-auto pr-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white sticky top-0 z-10">
              <tr className="border-b border-slate-100 text-slate-400 font-bold select-none">
                <th className="py-2.5">Vendedor</th>
                <th className="py-2.5 text-right">Meta</th>
                <th className="py-2.5 text-right">Realizado</th>
                <th className="py-2.5 text-right">% Atingido</th>
              </tr>
            </thead>
            <tbody>
              {vendedorData.map((vend, i) => {
                return (
                  <tr 
                    key={i} 
                    className="border-b border-slate-100 hover:bg-slate-50/70 text-slate-700 font-medium transition-colors"
                  >
                    <td className="py-3 font-semibold text-slate-900">{vend.name}</td>
                    <td className="py-3 text-right">{formatBRL(vend.Meta)}</td>
                    <td className="py-3 text-right">{formatBRL(vend.Realizado)}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className={`font-bold ${vend.percentual >= 100 ? 'text-emerald-600' : vend.percentual >= 80 ? 'text-orange-600' : 'text-red-600'}`}>
                          {vend.percentual.toFixed(0)}%
                        </span>
                        <div className="w-12 h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden shrink-0">
                          <div 
                            className={`h-full rounded-full ${vend.percentual >= 100 ? 'bg-emerald-500' : vend.percentual >= 80 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, vend.percentual)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
