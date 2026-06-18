import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';
import { useDashboard } from '../../../store/dashboardStore';
import type { RFVCluster } from '../../../types';


const clusterColors: Record<RFVCluster, string> = {
  Champions: '#10b981', // Emerald 500
  Loyal: '#3b82f6', // Blue 500
  New: '#06b6d4', // Cyan 500
  'At Risk': '#f97316', // Orange 500
  'About to Sleep': '#64748b', // Slate 500
};

export const RFVScatterPlot: React.FC = () => {
  const { filteredCustomers, cluster, setCluster } = useDashboard();

  // Format dataset for Recharts Scatter
  const data = filteredCustomers.map(c => ({
    id: c.id,
    name: c.name,
    recency: c.recency,
    frequency: c.frequency,
    value: c.value,
    cluster: c.cluster,
  }));

  const handleClusterSelect = (selectedCluster: RFVCluster | 'All') => {
    setCluster(selectedCluster);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-[11px] leading-relaxed">
          <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1">{data.name}</p>
          <p className="text-slate-600"><span className="font-semibold">Recência (Dias):</span> {data.recency}d</p>
          <p className="text-slate-600"><span className="font-semibold">Frequência (Ordens):</span> {data.frequency} compras</p>
          <p className="text-slate-600">
            <span className="font-semibold">Monetário (Valor):</span>{' '}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(data.value)}
          </p>
          <p className="mt-1">
            <span 
              className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider"
              style={{ backgroundColor: clusterColors[data.cluster as RFVCluster] }}
            >
              {data.cluster}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded p-4 flex flex-col h-[400px]">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Análise de Segmentação (RFV)</h3>
          <p className="text-[10px] text-slate-400">Recência (Dias sem comprar) vs Frequência (Quantidade de pedidos)</p>
        </div>

        {/* Interactive Legend / Filter controls */}
        <div className="flex flex-wrap gap-1 max-w-[280px] justify-end">
          <button
            onClick={() => handleClusterSelect('All')}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors border ${
              cluster === 'All'
                ? 'bg-slate-800 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todos
          </button>
          {(Object.keys(clusterColors) as RFVCluster[]).map(key => (
            <button
              key={key}
              onClick={() => handleClusterSelect(key)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors border flex items-center space-x-1 ${
                cluster === key
                  ? 'text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              style={{
                backgroundColor: cluster === key ? clusterColors[key] : undefined,
                borderColor: cluster === key ? clusterColors[key] : undefined,
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: cluster === key ? '#ffffff' : clusterColors[key] }}
              />
              <span>{key}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Wrapper */}
      <div className="flex-grow min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 10, right: 15, bottom: 20, left: -10 }}
          >
            <XAxis 
              type="number" 
              dataKey="recency" 
              name="Recência" 
              unit="d" 
              reversed // Smaller recency is better, placed closer to right, wait, reversed puts 0 on the right, which is fine
              tick={{ fontSize: 9, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{ value: 'Recência (Dias - Menor é melhor)', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#64748b' }}
            />
            <YAxis 
              type="number" 
              dataKey="frequency" 
              name="Frequência" 
              unit="x" 
              tick={{ fontSize: 9, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{ value: 'Frequência (Nº de Pedidos)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 10, fill: '#64748b' }}
            />
            <ZAxis 
              type="number" 
              dataKey="value" 
              range={[30, 400]} 
              name="Valor" 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} />
            
            <Scatter name="Clientes" data={data}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={clusterColors[entry.cluster as RFVCluster]}
                  className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                  onClick={() => handleClusterSelect(entry.cluster as RFVCluster)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/85">
            <span className="text-[11px] text-slate-400 font-medium">Nenhum cliente atende aos filtros ativos</span>
          </div>
        )}
      </div>
    </div>
  );
};
