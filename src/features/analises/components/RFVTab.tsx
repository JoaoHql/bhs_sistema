import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { RFVScatterPlot } from './RFVScatterPlot';
import { CustomerDenseTable } from './CustomerDenseTable';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import type { RFVCluster } from '../../../types';

const CLUSTER_COLORS: Record<RFVCluster, string> = {
  Champions: '#10b981',     // Emerald 500
  Loyal: '#3b82f6',         // Blue 500
  New: '#06b6d4',           // Cyan 500
  'At Risk': '#f97316',     // Orange 500
  'About to Sleep': '#64748b', // Slate 500
};

const CLUSTER_DESCS: Record<RFVCluster, string> = {
  Champions: "Clientes de elite: compraram recentemente, compram com alta frequência e gastam muito. Foco: Fidelizar.",
  Loyal: "Clientes fiéis: compram regularmente e têm bom valor. Foco: Oferecer programas de incentivo.",
  New: "Novos clientes: compra muito recente, mas baixa frequência ainda. Foco: Onboarding e segunda compra.",
  'At Risk': "Clientes em risco: compraram muito no passado, mas não retornam há tempos. Foco: Campanhas de resgate.",
  'About to Sleep': "Clientes quase inativos: baixíssima frequência, baixo valor e sumidos. Foco: Reativação leve.",
};

export const RFVTab: React.FC = () => {
  const { filteredCustomers, cluster, setCluster } = useDashboard();

  // 1. Calculations per cluster
  const clusterMetrics = useMemo(() => {
    const metrics: Record<RFVCluster, { count: number; totalValue: number; totalRecency: number; totalFrequency: number }> = {
      Champions: { count: 0, totalValue: 0, totalRecency: 0, totalFrequency: 0 },
      Loyal: { count: 0, totalValue: 0, totalRecency: 0, totalFrequency: 0 },
      New: { count: 0, totalValue: 0, totalRecency: 0, totalFrequency: 0 },
      'At Risk': { count: 0, totalValue: 0, totalRecency: 0, totalFrequency: 0 },
      'About to Sleep': { count: 0, totalValue: 0, totalRecency: 0, totalFrequency: 0 },
    };

    filteredCustomers.forEach(c => {
      const m = metrics[c.cluster];
      if (m) {
        m.count += 1;
        m.totalValue += c.value;
        m.totalRecency += c.recency;
        m.totalFrequency += c.frequency;
      }
    });

    return metrics;
  }, [filteredCustomers]);

  // 2. Receita por Cluster Data
  const revenueData = useMemo(() => {
    return (Object.keys(clusterMetrics) as RFVCluster[]).map(key => ({
      name: key,
      Faturamento: clusterMetrics[key].totalValue,
      fill: CLUSTER_COLORS[key]
    }));
  }, [clusterMetrics]);

  // 3. Volume (Quantidade de Clientes) por Cluster
  const volumeData = useMemo(() => {
    return (Object.keys(clusterMetrics) as RFVCluster[])
      .map(key => ({
        name: key,
        value: clusterMetrics[key].count
      }))
      .filter(item => item.value > 0);
  }, [clusterMetrics]);

  // 4. Ticket Médio por Cluster
  const ticketData = useMemo(() => {
    return (Object.keys(clusterMetrics) as RFVCluster[]).map(key => {
      const m = clusterMetrics[key];
      const ticket = m.count > 0 ? m.totalValue / m.count : 0;
      return {
        name: key,
        'Ticket Médio': Math.round(ticket),
        fill: CLUSTER_COLORS[key]
      };
    });
  }, [clusterMetrics]);

  // 5. Radar de Atributos do Cliente Ideal (Média de Recência invertida, Frequência, Valor por Cluster)
  const radarData = useMemo(() => {
    let maxVal = 1;
    let maxFreq = 1;
    let maxRecency = 1;

    (Object.keys(clusterMetrics) as RFVCluster[]).forEach(key => {
      const m = clusterMetrics[key];
      if (m.count > 0) {
        const avgVal = m.totalValue / m.count;
        const avgFreq = m.totalFrequency / m.count;
        const avgRec = m.totalRecency / m.count;
        if (avgVal > maxVal) maxVal = avgVal;
        if (avgFreq > maxFreq) maxFreq = avgFreq;
        if (avgRec > maxRecency) maxRecency = avgRec;
      }
    });

    return [
      { subject: 'Valor Monetário (R$)' },
      { subject: 'Frequência (Ordens)' },
      { subject: 'Engajamento (Tempo/Recência)' }
    ].map((item, idx) => {
      const out: any = { subject: item.subject };
      (Object.keys(clusterMetrics) as RFVCluster[]).forEach(key => {
        const m = clusterMetrics[key];
        if (m.count === 0) {
          out[key] = 0;
          return;
        }
        if (idx === 0) {
          const avgVal = m.totalValue / m.count;
          out[key] = Math.round((avgVal / maxVal) * 100);
        } else if (idx === 1) {
          const avgFreq = m.totalFrequency / m.count;
          out[key] = Math.round((avgFreq / maxFreq) * 100);
        } else {
          const avgRec = m.totalRecency / m.count;
          out[key] = Math.round((1 - (avgRec / (maxRecency * 1.1))) * 100);
        }
      });
      return out;
    });
  }, [clusterMetrics]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const renderRFVTooltip = ({ active, payload, label }: any, _type: string) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const clusterName = (label || data.name || payload[0].name) as RFVCluster;
      const desc = CLUSTER_DESCS[clusterName] || "Análise de comportamento do grupo.";
      const isVal = payload[0].name === "Faturamento" || payload[0].name === "Ticket Médio";
      
      return (
        <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-lg text-xs leading-relaxed max-w-[240px] backdrop-blur-sm z-50">
          <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-1 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[clusterName] || '#94a3b8' }}></div>
            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">{clusterName}</span>
          </div>
          <div className="space-y-1">
            {payload.map((pld: any, idx: number) => (
              <p key={idx} className="text-slate-700 font-semibold flex justify-between items-center gap-4">
                <span className="text-slate-500">{pld.name}:</span>
                <span className="text-slate-900 font-bold">{isVal ? formatBRL(pld.value) : pld.value}</span>
              </p>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100/75 pt-1.5 font-medium leading-normal italic">
            {desc}
            <span className="block mt-1 text-slate-500 font-semibold">Dica: Clique para filtrar por este cluster.</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Upper Grid (Scatter Plot & Bar charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 1: Matriz RFV (Scatter plot) */}
        <RFVScatterPlot />

        {/* Visual 2: Receita por Cluster */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Faturamento Total por Segmento</h3>
          <p className="text-xs text-slate-400 mb-4">Volume monetário. Clique na barra para filtrar.</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={revenueData} 
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    setCluster(cluster === data.activeLabel ? 'All' : data.activeLabel as RFVCluster);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderRFVTooltip(props, 'revenue')} />
                <Bar dataKey="Faturamento" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800}>
                  {revenueData.map((entry, index) => {
                    const isSelected = cluster === entry.name || cluster === 'All';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill} 
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

      {/* Middle Grid (Pie, Radar, Ticket) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual 3: Volume de Clientes por Cluster */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Distribuição de Clientes</h3>
          <p className="text-xs text-slate-400 mb-4">Quantidade de empresas. Clique para filtrar.</p>
          <div className="flex-grow min-h-0 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={volumeData}
                  cx="50%"
                  cy="45%"
                  innerRadius={0}
                  outerRadius={95}
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={800}
                  className="cursor-pointer"
                >
                  {volumeData.map((entry, index) => {
                    const isSelected = cluster === entry.name || cluster === 'All';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CLUSTER_COLORS[entry.name as RFVCluster]} 
                        fillOpacity={isSelected ? 1 : 0.35}
                        stroke="#fff"
                        strokeWidth={1.5}
                        onClick={() => setCluster(cluster === entry.name ? 'All' : entry.name as RFVCluster)}
                        className="cursor-pointer hover:opacity-90 transition-all"
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={(props) => renderRFVTooltip(props, 'volume')} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 4: Radar de Atributos do Cliente Ideal */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Mapeamento de Atributos</h3>
          <p className="text-xs text-slate-400 mb-4">Perfil normalizado comparativo [0-100]</p>
          <div className="flex-grow min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                
                {volumeData.map((item) => (
                  <Radar
                    key={item.name}
                    name={item.name}
                    dataKey={item.name}
                    stroke={CLUSTER_COLORS[item.name as RFVCluster]}
                    fill={CLUSTER_COLORS[item.name as RFVCluster]}
                    fillOpacity={cluster === item.name ? 0.35 : (cluster === 'All' ? 0.15 : 0.02)}
                    strokeWidth={cluster === item.name ? 3 : 1.5}
                  />
                ))}
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} onClick={(data: any) => {
                  if (data && data.value) {
                    setCluster(cluster === data.value ? 'All' : data.value as RFVCluster);
                  }
                }} className="cursor-pointer" />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 5: Ticket Médio por Cluster */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Ticket Médio por Cluster</h3>
          <p className="text-xs text-slate-400 mb-4">Média gasta por compra. Clique na barra para filtrar.</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={ticketData} 
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    setCluster(cluster === data.activeLabel ? 'All' : data.activeLabel as RFVCluster);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderRFVTooltip(props, 'ticket')} />
                <Bar dataKey="Ticket Médio" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800}>
                  {ticketData.map((entry, index) => {
                    const isSelected = cluster === entry.name || cluster === 'All';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill} 
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

      {/* Bottom Grid (Detailed Table) */}
      <div className="grid grid-cols-1 gap-6">
        <CustomerDenseTable />
      </div>
    </div>
  );
};
