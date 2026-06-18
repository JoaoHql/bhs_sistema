import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';

interface StateData {
  uf: string;
  name: string;
  x: number;
  y: number;
  r: number;
}

const states: StateData[] = [
  { uf: 'CE', name: 'Ceará', x: 230, y: 25, r: 16 },
  { uf: 'PE', name: 'Pernambuco', x: 260, y: 55, r: 16 },
  { uf: 'BA', name: 'Bahia', x: 210, y: 95, r: 22 },
  { uf: 'DF', name: 'Distrito Federal', x: 130, y: 125, r: 14 },
  { uf: 'MG', name: 'Minas Gerais', x: 185, y: 165, r: 24 },
  { uf: 'RJ', name: 'Rio de Janeiro', x: 225, y: 205, r: 18 },
  { uf: 'SP', name: 'São Paulo', x: 155, y: 215, r: 26 },
  { uf: 'PR', name: 'Paraná', x: 110, y: 255, r: 20 },
  { uf: 'SC', name: 'Santa Catarina', x: 125, y: 295, r: 18 },
  { uf: 'RS', name: 'Rio Grande do Sul', x: 95, y: 340, r: 22 },
];

export const GeographicMap: React.FC = () => {
  const { region, setRegion, customers } = useDashboard();

  // Compute metrics per region
  const regionMetrics = useMemo(() => {
    const metrics: Record<string, { count: number; totalValue: number }> = {};
    
    // Initialize
    states.forEach(s => {
      metrics[s.uf] = { count: 0, totalValue: 0 };
    });

    // Populate
    customers.forEach(c => {
      if (metrics[c.region]) {
        metrics[c.region].count += 1;
        metrics[c.region].totalValue += c.value;
      }
    });

    return metrics;
  }, [customers]);

  // Find max value to calibrate color density
  const maxSales = useMemo(() => {
    const values = Object.values(regionMetrics).map(m => m.totalValue);
    return Math.max(...values, 1);
  }, [regionMetrics]);

  const handleStateClick = (uf: string) => {
    if (region === uf) {
      setRegion('All'); // Toggle off
    } else {
      setRegion(uf); // Toggle on
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded p-4 flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Densidade de Vendas por Estado</h3>
          <p className="text-[10px] text-slate-400">Clique na região para filtrar os dados</p>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[9px] text-slate-400">Menos</span>
          <div className="flex space-x-0.5">
            <div className="w-2.5 h-2.5 rounded bg-orange-50"></div>
            <div className="w-2.5 h-2.5 rounded bg-orange-200"></div>
            <div className="w-2.5 h-2.5 rounded bg-orange-400"></div>
            <div className="w-2.5 h-2.5 rounded bg-orange-600"></div>
          </div>
          <span className="text-[9px] text-slate-400">Mais</span>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center relative bg-slate-50/50 rounded border border-slate-100/50">
        <svg 
          viewBox="0 0 320 400" 
          className="w-full h-full max-h-[320px] select-none"
        >
          {/* Schematic connections between regions */}
          <line x1="210" y1="95" x2="185" y2="165" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="185" y1="165" x2="130" y2="125" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="185" y1="165" x2="155" y2="215" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="185" y1="165" x2="225" y2="205" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="155" y1="215" x2="110" y2="255" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="110" y1="255" x2="125" y2="295" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="125" y1="295" x2="95" y2="340" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

          {/* Map Nodes (State bubbles) */}
          {states.map(state => {
            const metrics = regionMetrics[state.uf] || { count: 0, totalValue: 0 };
            const isSelected = region === state.uf;
            
            // Calculate color scale based on sales
            const pct = metrics.totalValue / maxSales;
            let bgColor = 'fill-orange-50 stroke-orange-200';
            let textColor = 'fill-slate-600';
            
            if (pct > 0.75) {
              bgColor = 'fill-orange-600 stroke-orange-700';
              textColor = 'fill-white font-bold';
            } else if (pct > 0.4) {
              bgColor = 'fill-orange-400 stroke-orange-500';
              textColor = 'fill-white font-bold';
            } else if (pct > 0.15) {
              bgColor = 'fill-orange-200 stroke-orange-300';
              textColor = 'fill-slate-800 font-semibold';
            } else if (metrics.count > 0) {
              bgColor = 'fill-orange-100/70 stroke-orange-200';
              textColor = 'fill-slate-700';
            }

            return (
              <g 
                key={state.uf} 
                className="cursor-pointer group"
                onClick={() => handleStateClick(state.uf)}
              >
                {/* Active Selection Glow Ring */}
                {isSelected && (
                  <circle
                    cx={state.x}
                    cy={state.y}
                    r={state.r + 5}
                    className="fill-none stroke-orange-500 stroke-2 animate-pulse"
                  />
                )}
                
                {/* Outer Glow on Hover */}
                <circle
                  cx={state.x}
                  cy={state.y}
                  r={state.r + 2}
                  className="fill-none stroke-transparent group-hover:stroke-slate-300 group-hover:stroke-2 transition-all duration-150"
                />

                {/* State Bubble */}
                <circle
                  cx={state.x}
                  cy={state.y}
                  r={state.r}
                  className={`${bgColor} transition-all duration-200 shadow`}
                />

                {/* State Text Label */}
                <text
                  x={state.x}
                  y={state.y + 4}
                  textAnchor="middle"
                  className={`${textColor} text-[10px] select-none pointer-events-none`}
                >
                  {state.uf}
                </text>

                {/* Hover Tooltip box */}
                <title>
                  {state.name} ({state.uf})
                  {`\n• Faturamento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metrics.totalValue)}`}
                  {`\n• Clientes: ${metrics.count}`}
                  {`\n• Ticket Médio: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metrics.count > 0 ? metrics.totalValue / metrics.count : 0)}`}
                </title>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Indicator */}
        <div className="absolute bottom-2 left-2 bg-white/95 border border-slate-100 rounded px-2 py-1 text-[9px] shadow-sm pointer-events-none text-slate-500">
          <span className="font-semibold text-slate-700 block">Esquema Regional (Bubble Map)</span>
          <span>Bolas maiores representam maior volume de faturamento.</span>
        </div>
      </div>
    </div>
  );
};
