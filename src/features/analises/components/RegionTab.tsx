import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { GeographicMap } from './GeographicMap';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine, RadialBarChart, RadialBar, Cell
} from 'recharts';
import type { RFVCluster } from '../../../types';

const CLUSTER_COLORS: Record<RFVCluster, string> = {
  Champions: '#10b981',
  Loyal: '#3b82f6',
  New: '#06b6d4',
  'At Risk': '#f97316',
  'About to Sleep': '#64748b',
};

const REGION_COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b', '#06b6d4', '#14b8a6', '#6366f1', '#a855f7'];

const UF_FULL_NAMES: Record<string, string> = {
  SP: 'São Paulo',
  RJ: 'Rio de Janeiro',
  MG: 'Minas Gerais',
  PR: 'Paraná',
  SC: 'Santa Catarina',
  RS: 'Rio Grande do Sul',
  BA: 'Bahia',
  DF: 'Distrito Federal',
  PE: 'Pernambuco',
  CE: 'Ceará'
};

export const RegionTab: React.FC = () => {
  const { filteredCustomers, region, setRegion } = useDashboard();

  // 1. Calculations by UF
  const ufMetrics = useMemo(() => {
    const metrics: Record<string, { count: number; totalValue: number; clusterCounts: Record<RFVCluster, number> }> = {};

    filteredCustomers.forEach(c => {
      if (!metrics[c.region]) {
        metrics[c.region] = { 
          count: 0, 
          totalValue: 0, 
          clusterCounts: { Champions: 0, Loyal: 0, New: 0, 'At Risk': 0, 'About to Sleep': 0 } 
        };
      }
      const m = metrics[c.region];
      m.count += 1;
      m.totalValue += c.value;
      m.clusterCounts[c.cluster] += 1;
    });

    return metrics;
  }, [filteredCustomers]);

  // 2. Top States Data
  const topStatesData = useMemo(() => {
    return Object.entries(ufMetrics)
      .map(([uf, m]) => ({
        name: uf,
        fullName: UF_FULL_NAMES[uf] || uf,
        Faturamento: m.totalValue,
        Clientes: m.count
      }))
      .sort((a, b) => b.Faturamento - a.Faturamento);
  }, [ufMetrics]);

  // 3. Stacked Cluster Composition per region (UFs)
  const compositionData = useMemo(() => {
    return Object.entries(ufMetrics)
      .map(([uf, m]) => {
        const total = m.count || 1;
        return {
          name: uf,
          Champions: Math.round((m.clusterCounts.Champions / total) * 100),
          Loyal: Math.round((m.clusterCounts.Loyal / total) * 100),
          New: Math.round((m.clusterCounts.New / total) * 100),
          'At Risk': Math.round((m.clusterCounts['At Risk'] / total) * 100),
          'About to Sleep': Math.round((m.clusterCounts['About to Sleep'] / total) * 100),
        };
      })
      .sort((a, b) => b.Champions - a.Champions);
  }, [ufMetrics]);

  // 4. Monthly Regional Trend (Mocked but scales with values)
  const regionalTrendData = useMemo(() => {
    const spScale = (ufMetrics['SP']?.totalValue || 1200000) / 6;
    const rjScale = (ufMetrics['RJ']?.totalValue || 900000) / 6;
    const mgScale = (ufMetrics['MG']?.totalValue || 800000) / 6;
    const otherScale = (filteredCustomers.reduce((acc, curr) => acc + curr.value, 0) * 0.2) / 6;

    return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((month, idx) => ({
      name: month,
      'São Paulo (SP)': Math.round(spScale * (idx + 1) * (0.85 + Math.sin(idx) * 0.1)),
      'Rio de Janeiro (RJ)': Math.round(rjScale * (idx + 1) * (0.8 + Math.cos(idx) * 0.1)),
      'Minas Gerais (MG)': Math.round(mgScale * (idx + 1) * (0.75 + Math.sin(idx + 1) * 0.15)),
      'Outros': Math.round(otherScale * (idx + 1) * (0.9 + Math.cos(idx + 1) * 0.1)),
    }));
  }, [ufMetrics, filteredCustomers]);

  // 5. Ticket Médio por UF
  const ticketData = useMemo(() => {
    return Object.entries(ufMetrics).map(([uf, m]) => ({
      name: uf,
      'Ticket Médio': Math.round(m.count > 0 ? m.totalValue / m.count : 0)
    })).sort((a, b) => b['Ticket Médio'] - a['Ticket Médio']);
  }, [ufMetrics]);

  const overallAvgTicket = useMemo(() => {
    const totalCount = filteredCustomers.length;
    const totalVal = filteredCustomers.reduce((acc, c) => acc + c.value, 0);
    return totalCount > 0 ? totalVal / totalCount : 0;
  }, [filteredCustomers]);

  // 6. Gauge / Radial de Metas Regionais (SP, RJ, MG)
  const regionalMetaData = useMemo(() => {
    const spRealized = ufMetrics['SP']?.totalValue || 0;
    const rjRealized = ufMetrics['RJ']?.totalValue || 0;
    const mgRealized = ufMetrics['MG']?.totalValue || 0;

    const spGoal = 1500000;
    const rjGoal = 1000000;
    const mgGoal = 900000;

    return [
      { name: 'Minas Gerais (MG)', value: Math.min(100, Math.round((mgRealized / mgGoal) * 100)), fill: '#8b5cf6', goal: mgGoal, realized: mgRealized, uf: 'MG' },
      { name: 'Rio de Janeiro (RJ)', value: Math.min(100, Math.round((rjRealized / rjGoal) * 100)), fill: '#f97316', goal: rjGoal, realized: rjRealized, uf: 'RJ' },
      { name: 'São Paulo (SP)', value: Math.min(100, Math.round((spRealized / spGoal) * 100)), fill: '#3b82f6', goal: spGoal, realized: spRealized, uf: 'SP' }
    ];
  }, [ufMetrics]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const renderRegionTooltip = ({ active, payload, label }: any, type: string) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isVal = payload[0].name === "Faturamento" || payload[0].name === "Ticket Médio" || payload[0].name === "value" || typeof payload[0].value === 'number';
      const uf = label || data.name || payload[0].name;
      const ufName = UF_FULL_NAMES[uf] || uf;
      
      return (
        <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-lg text-xs leading-relaxed max-w-[240px] backdrop-blur-sm z-50">
          <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1.5 uppercase tracking-wider text-[10px]">
            {ufName}
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
            {type === 'ranking' && `Estado líder. Contribui diretamente com o volume de vendas regional.`}
            {type === 'compo' && `Composição percentual detalhada de saúde RFV da base neste estado.`}
            {type === 'trend' && `Representação da evolução histórica regional de vendas. Clique para filtrar por esta UF.`}
            {type === 'ticket' && `Ticket médio de vendas. Média geral comparativa: ${formatBRL(overallAvgTicket)}.`}
            <span className="block mt-1 text-slate-500 font-semibold">Dica: Clique para filtrar por este estado.</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Grid (Map & Horizontal Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 1: Geographic Map */}
        <GeographicMap />

        {/* Visual 2: Top UFs por Faturamento */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Top Estados por Faturamento</h3>
          <p className="text-xs text-slate-400 mb-4">Volume total faturado por estado. Clique para filtrar.</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topStatesData}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    setRegion(region === labelStr ? 'All' : labelStr);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip content={(props) => renderRegionTooltip(props, 'ranking')} />
                <Bar dataKey="Faturamento" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={true} animationDuration={800}>
                  {topStatesData.map((entry, index) => {
                    const isSelected = region === entry.name || region === 'All';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={REGION_COLORS[index % REGION_COLORS.length]} 
                        fillOpacity={isSelected ? 1 : 0.35}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Grid: Stacked Composition, Trend lines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 3: Stacked Bar Chart Cluster Composition */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Composição de Clusters por UF (%)</h3>
          <p className="text-xs text-slate-400 mb-4">Percentual de clientes por perfil RFV em cada estado. Clique para filtrar.</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={compositionData} 
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    setRegion(region === labelStr ? 'All' : labelStr);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={(props) => renderRegionTooltip(props, 'compo')} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Champions" stackId="a" fill={CLUSTER_COLORS.Champions} isAnimationActive={true} />
                <Bar dataKey="Loyal" stackId="a" fill={CLUSTER_COLORS.Loyal} isAnimationActive={true} />
                <Bar dataKey="New" stackId="a" fill={CLUSTER_COLORS.New} isAnimationActive={true} />
                <Bar dataKey="At Risk" stackId="a" fill={CLUSTER_COLORS['At Risk']} isAnimationActive={true} />
                <Bar dataKey="About to Sleep" stackId="a" fill={CLUSTER_COLORS['About to Sleep']} isAnimationActive={true} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 4: Evolução Regional de Vendas */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Evolução de Vendas por Região</h3>
          <p className="text-xs text-slate-400 mb-4">Tendência mensal de faturamento das 3 principais UFs. Clique na legenda para filtrar.</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={regionalTrendData} 
                margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderRegionTooltip(props, 'trend')} />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '11px' }} 
                  onClick={(data: any) => {
                    const uf = data.value.match(/\(([^)]+)\)/)?.[1] || data.value;
                    if (uf && uf !== 'Outros') {
                      setRegion(region === uf ? 'All' : uf);
                    }
                  }}
                  className="cursor-pointer"
                />
                <Line type="monotone" dataKey="São Paulo (SP)" stroke="#3b82f6" strokeWidth={region === 'SP' ? 3.5 : 2} dot={{ r: region === 'SP' ? 5 : 3 }} strokeOpacity={region === 'SP' || region === 'All' ? 1 : 0.2} />
                <Line type="monotone" dataKey="Rio de Janeiro (RJ)" stroke="#f97316" strokeWidth={region === 'RJ' ? 3.5 : 2} dot={{ r: region === 'RJ' ? 5 : 3 }} strokeOpacity={region === 'RJ' || region === 'All' ? 1 : 0.2} />
                <Line type="monotone" dataKey="Minas Gerais (MG)" stroke="#8b5cf6" strokeWidth={region === 'MG' ? 3.5 : 2} dot={{ r: region === 'MG' ? 5 : 3 }} strokeOpacity={region === 'MG' || region === 'All' ? 1 : 0.2} />
                <Line type="monotone" dataKey="Outros" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} strokeOpacity={region === 'All' ? 0.7 : 0.15} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Ticket Medio vs Avg line, Meta Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual 5: Ticket Médio por UF */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[340px] lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Ticket Médio por UF</h3>
          <p className="text-xs text-slate-400 mb-4">Gasto médio por UF comparado à média geral (linha vermelha). Clique para filtrar.</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={ticketData} 
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    setRegion(region === labelStr ? 'All' : labelStr);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderRegionTooltip(props, 'ticket')} />
                <ReferenceLine y={overallAvgTicket} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Média Geral', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                <Bar dataKey="Ticket Médio" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={true} animationDuration={800}>
                  {ticketData.map((entry, index) => {
                    const isSelected = region === entry.name || region === 'All';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#10b981" 
                        fillOpacity={isSelected ? 1 : 0.35}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 6: Gauges / Radial de Metas Regionais */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[340px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Metas Regionais</h3>
          <p className="text-xs text-slate-400 mb-4">% de atingimento das 3 principais UFs. Clique para filtrar.</p>
          <div className="flex-grow min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="30%" 
                outerRadius="90%" 
                barSize={12} 
                data={regionalMetaData}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const item = data.activePayload[0].payload;
                    setRegion(region === item.uf ? 'All' : item.uf);
                  }
                }}
                className="cursor-pointer"
              >
                <RadialBar
                  label={{ position: 'insideStart', fill: '#fff', fontSize: 8, fontWeight: 'bold' }}
                  background
                  dataKey="value"
                >
                  {regionalMetaData.map((entry, index) => {
                    const isSelected = region === entry.uf || region === 'All';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill}
                        fillOpacity={isSelected ? 1 : 0.3}
                      />
                    );
                  })}
                </RadialBar>
                <Legend 
                  iconSize={8} 
                  layout="vertical" 
                  verticalAlign="middle" 
                  wrapperStyle={{ fontSize: '9px', right: 0 }} 
                />
                <Tooltip content={(props) => renderRegionTooltip(props, 'radial')} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
