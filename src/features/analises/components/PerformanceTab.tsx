import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend, RadialBarChart, RadialBar, Cell
} from 'recharts';

export const PerformanceTab: React.FC = () => {
  const { filteredMetas, branch, setBranch } = useDashboard();

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

  // 2. Atingimento por Filial (Bullet Chart data)
  const branchData = useMemo(() => {
    const branchesMap: Record<string, { target: number; actual: number }> = {};
    filteredMetas.forEach(m => {
      if (!branchesMap[m.branch]) {
        branchesMap[m.branch] = { target: 0, actual: 0 };
      }
      branchesMap[m.branch].target += m.target;
      branchesMap[m.branch].actual += m.actual;
    });

    return Object.entries(branchesMap).map(([name, val]) => ({
      name,
      Realizado: val.actual,
      Meta: val.target,
      percentual: Math.round(val.target > 0 ? (val.actual / val.target) * 100 : 0)
    }));
  }, [filteredMetas]);

  // 3. Gauge Data for general target progress
  const gaugeData = useMemo(() => {
    return [
      { name: 'Meta Geral', value: Math.min(100, Math.round(summary.pct)), fill: '#f97316' }
    ];
  }, [summary]);

  // 4. Waterfall Chart Data (Simulated breakdown of Monthly changes)
  const waterfallData = useMemo(() => {
    const scale = summary.totalActual / 2500000;
    const base = Math.round(2000000 * scale);
    const novos = Math.round(400000 * scale);
    const expansao = Math.round(250000 * scale);
    const churn = Math.round(-150000 * scale);
    const final = base + novos + expansao + churn;

    return [
      { name: 'Mês Ant.', min: 0, delta: base, color: '#64748b', desc: "Base de faturamento recorrente vinda do mês anterior." },
      { name: 'Novos Cli.', min: base, delta: novos, color: '#10b981', desc: "Receita incremental de novos logons e novas licenças vendidas." },
      { name: 'Expansão', min: base + novos, delta: expansao, color: '#3b82f6', desc: "Upgrades de planos e ampliação de serviços contratados." },
      { name: 'Churn', min: base + novos + expansao + churn, delta: -churn, color: '#ef4444', desc: "Perda financeira devido a cancelamentos e downgrades." },
      { name: 'Mês Atual', min: 0, delta: final, color: '#f97316', desc: "Faturamento consolidado no encerramento deste ciclo." }
    ];
  }, [summary]);

  // 5. Forecast Projeção (Line chart)
  const forecastData = useMemo(() => {
    const scale = summary.totalActual / 2500000;
    return [
      { name: 'Jan', Realizado: Math.round(2100000 * scale), Projeção: null },
      { name: 'Fev', Realizado: Math.round(2200000 * scale), Projeção: null },
      { name: 'Mar', Realizado: Math.round(2400000 * scale), Projeção: null },
      { name: 'Abr', Realizado: Math.round(2300000 * scale), Projeção: null },
      { name: 'Mai', Realizado: Math.round(2600000 * scale), Projeção: null },
      { name: 'Jun', Realizado: Math.round(summary.totalActual), Projeção: Math.round(summary.totalActual) },
      { name: 'Jul', Realizado: null, Projeção: Math.round(summary.totalTarget * 1.05) },
      { name: 'Ago', Realizado: null, Projeção: Math.round(summary.totalTarget * 1.1) },
      { name: 'Set', Realizado: null, Projeção: Math.round(summary.totalTarget * 1.15) },
    ];
  }, [summary]);

  // 6. CAC vs LTV Over time (Area Chart)
  const ltvCacData = useMemo(() => {
    const scale = summary.totalActual / 2500000;
    return [
      { name: 'Jan', LTV: Math.round(15000 * scale), CAC: Math.round(3000 * scale) },
      { name: 'Fev', LTV: Math.round(15500 * scale), CAC: Math.round(3100 * scale) },
      { name: 'Mar', LTV: Math.round(17000 * scale), CAC: Math.round(2900 * scale) },
      { name: 'Abr', LTV: Math.round(18500 * scale), CAC: Math.round(2800 * scale) },
      { name: 'Mai', LTV: Math.round(19000 * scale), CAC: Math.round(2750 * scale) },
      { name: 'Jun', LTV: Math.round(21000 * scale), CAC: Math.round(2600 * scale) },
    ];
  }, [summary]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const renderPerformanceTooltip = ({ active, payload, label }: any, type: string) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isVal = payload[0].name === "Faturamento" || payload[0].name === "Realizado" || payload[0].name === "Projeção" || payload[0].name === "LTV" || payload[0].name === "CAC" || typeof payload[0].value === 'number';
      const title = label || data.name || payload[0].name;
      
      return (
        <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-lg text-xs leading-relaxed max-w-[240px] backdrop-blur-sm z-50 animate-fade-in">
          <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1.5 uppercase tracking-wider text-[10px]">
            {title}
          </p>
          <div className="space-y-1">
            {payload.map((pld: any, idx: number) => (
              <p key={idx} className="text-slate-700 font-semibold flex justify-between items-center gap-4">
                <span className="text-slate-500">{pld.name}:</span>
                <span className="text-slate-900 font-bold">{isVal ? formatBRL(pld.value) : pld.value}</span>
              </p>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100/75 pt-1.5 font-medium leading-normal italic">
            {type === 'waterfall' && `${data.desc || ''}`}
            {type === 'forecast' && "Linha contínua representa dados históricos. Tracejado representa projeção de meta futura."}
            {type === 'ltv' && `Proporção de LTV para CAC: ${(data.LTV / (data.CAC || 1)).toFixed(1)}x. Ideal é acima de 3.0x.`}
            {type === 'waterfall' ? "" : <span className="block mt-1 text-slate-500 font-semibold">Dica: Painel interativo para acompanhamento executivo.</span>}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Grid: Gauge & Waterfall */}
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

        {/* Visual 2: Waterfall Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px] lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Análise de Variação (Waterfall)</h3>
          <p className="text-xs text-slate-400 mb-4">Composição da receita comparando o mês anterior com o atual</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={waterfallData} 
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderPerformanceTooltip(props, 'waterfall')} />
                {/* Transparent base bar to elevate the floating bars */}
                <Bar dataKey="min" stackId="a" fill="transparent" />
                <Bar dataKey="delta" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Grid: Branch Atingimento & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 3: Atingimento por Filial (Bullet) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Atingimento de Meta por Filial</h3>
          <p className="text-xs text-slate-400 mb-4">Realizado vs Meta por filial. Clique na barra para filtrar.</p>
          <div className="flex-grow min-h-0 space-y-5 overflow-y-auto pr-1">
            {branchData.map(item => {
              const isSelected = branch === item.name;
              return (
                <div 
                  key={item.name} 
                  onClick={() => setBranch(isSelected ? 'All' : item.name)}
                  className={`space-y-1.5 p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-orange-50/50 border border-orange-200' : ''}`}
                >
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span className={isSelected ? 'text-orange-600 font-bold' : ''}>{item.name}</span>
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

        {/* Visual 4: Projeção de Faturamento (Forecast) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Projeção de Faturamento (Forecast)</h3>
          <p className="text-xs text-slate-400 mb-4">Dados reais até Junho e estimativa para os meses seguintes</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={forecastData} 
                margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderPerformanceTooltip(props, 'forecast')} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Realizado" name="Faturamento Real" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={true} />
                <Line type="monotone" dataKey="Projeção" name="Projeção de Metas" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} isAnimationActive={true} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: LTV/CAC & Detail Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual 5: CAC vs LTV */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Custo de Aquisição (CAC) vs LTV</h3>
          <p className="text-xs text-slate-400 mb-4">Evolução do valor do cliente vs custo para adquiri-lo</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={ltvCacData} 
                margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderPerformanceTooltip(props, 'ltv')} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="LTV" name="LTV Médio" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} isAnimationActive={true} />
                <Area type="monotone" dataKey="CAC" name="CAC Médio" stroke="#ef4444" fill="#ef4444" fillOpacity={0.05} strokeWidth={1.5} isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 6: Detailed Goals Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px] lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Detalhamento de Metas</h3>
          <p className="text-xs text-slate-400 mb-3">Tabela de acompanhamento. Clique na linha para filtrar por filial.</p>
          <div className="flex-grow overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold select-none">
                  <th className="py-2.5">Categoria</th>
                  <th className="py-2.5">Filial</th>
                  <th className="py-2.5 text-right">Meta</th>
                  <th className="py-2.5 text-right">Realizado</th>
                  <th className="py-2.5 text-right">% Atingido</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetas.map(meta => {
                  const pct = meta.target > 0 ? (meta.actual / meta.target) * 100 : 0;
                  const isSelected = branch === meta.branch;
                  return (
                    <tr 
                      key={meta.id} 
                      onClick={() => setBranch(isSelected ? 'All' : meta.branch)}
                      className={`border-b border-slate-100 hover:bg-slate-50/70 text-slate-700 font-medium cursor-pointer transition-colors ${isSelected ? 'bg-orange-50 hover:bg-orange-100/60 font-bold' : ''}`}
                    >
                      <td className="py-3 font-semibold text-slate-900">{meta.category}</td>
                      <td className="py-3 text-slate-500">{meta.branch}</td>
                      <td className="py-3 text-right">{formatBRL(meta.target)}</td>
                      <td className="py-3 text-right">{formatBRL(meta.actual)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className={`font-bold ${pct >= 100 ? 'text-emerald-600' : pct >= 80 ? 'text-orange-600' : 'text-red-600'}`}>
                            {pct.toFixed(0)}%
                          </span>
                          <div className="w-12 h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-orange-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
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
    </div>
  );
};
