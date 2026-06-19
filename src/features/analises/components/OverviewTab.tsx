import React, { useMemo, useState } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, Users, Award, Percent, HelpCircle } from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f43f5e', '#eab308', '#06b6d4'];

export const OverviewTab: React.FC = () => {
  const { 
    filteredCustomers, 
    filteredMetas,
    region,
    setRegion,
    setBranch,
    setCluster,
    searchQuery,
    setSearchQuery,
    setPeriod
  } = useDashboard();

  const [sortField, setSortField] = useState<string>('value');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // 1. KPI Data
  const kpis = useMemo(() => {
    let totalSales = 0;
    let customerCount = filteredCustomers.length;
    let totalTarget = 0;
    let totalActualMetas = 0;

    filteredCustomers.forEach(c => {
      totalSales += c.value;
    });

    filteredMetas.forEach(m => {
      totalTarget += m.target;
      totalActualMetas += m.actual;
    });

    const targetProgress = totalTarget > 0 ? (totalActualMetas / totalTarget) * 100 : 0;
    const averageTicket = customerCount > 0 ? totalSales / customerCount : 0;

    return {
      totalSales,
      customerCount,
      targetProgress,
      averageTicket,
      totalTarget,
      totalActualMetas
    };
  }, [filteredCustomers, filteredMetas]);

  // 2. Monthly Trend Data (Mocked but reactive to filtered values)
  const monthlyTrendData = useMemo(() => {
    const scale = kpis.totalSales / 5000000; 
    return [
      { name: 'Jan', faturamento: Math.round(650000 * scale), meta: Math.round(600000 * scale) },
      { name: 'Fev', faturamento: Math.round(720000 * scale), meta: Math.round(600000 * scale) },
      { name: 'Mar', faturamento: Math.round(850000 * scale), meta: Math.round(700000 * scale) },
      { name: 'Abr', faturamento: Math.round(890000 * scale), meta: Math.round(800000 * scale) },
      { name: 'Mai', faturamento: Math.round(1100000 * scale), meta: Math.round(900000 * scale) },
      { name: 'Jun', faturamento: Math.round(kpis.totalSales * 0.9), meta: Math.round(kpis.totalTarget * 0.9) }
    ];
  }, [kpis]);

  // 3. Category Data (Target vs Actual)
  const categoryData = useMemo(() => {
    const categories: Record<string, { target: number; actual: number }> = {};
    filteredMetas.forEach(m => {
      if (!categories[m.category]) {
        categories[m.category] = { target: 0, actual: 0 };
      }
      categories[m.category].target += m.target;
      categories[m.category].actual += m.actual;
    });

    return Object.entries(categories).map(([name, val]) => ({
      name,
      Realizado: val.actual,
      Meta: val.target,
      percentual: val.target > 0 ? (val.actual / val.target) * 100 : 0
    }));
  }, [filteredMetas]);

  // 4. Region Distribution
  const regionData = useMemo(() => {
    const regionsMap: Record<string, number> = {};
    filteredCustomers.forEach(c => {
      regionsMap[c.region] = (regionsMap[c.region] || 0) + c.value;
    });
    return Object.entries(regionsMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCustomers]);

  // 5. Top 5 Clients
  const topClients = useMemo(() => {
    return [...filteredCustomers]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(c => ({
        name: c.name.split(' ')[0] + ' ' + (c.name.split(' ')[1] || ''),
        fullName: c.name,
        value: c.value
      }));
  }, [filteredCustomers]);

  // 6. Summary Table sorting
  const sortedCategories = useMemo(() => {
    return [...categoryData].sort((a, b) => {
      let valA = a[sortField as keyof typeof a];
      let valB = b[sortField as keyof typeof b];
      if (typeof valA === 'string') {
        return sortAsc ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [categoryData, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // Rich Tooltips definitions
  const renderRichTooltip = ({ active, payload, label }: any, type: string) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isFaturamento = payload[0].name === "Faturamento" || payload[0].name === "Realizado" || payload[0].name === "Ticket Médio" || payload[0].name === "value";
      
      return (
        <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-lg text-xs leading-relaxed max-w-[240px] backdrop-blur-sm z-50">
          <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1.5 uppercase tracking-wide text-[10px]">
            {label || payload[0].name || data.name}
          </p>
          <div className="space-y-1">
            {payload.map((pld: any, idx: number) => (
              <p key={idx} className="text-slate-700 font-semibold flex justify-between items-center gap-4">
                <span className="text-slate-500">{pld.name}:</span>
                <span className="text-slate-900 font-bold">{isFaturamento ? formatBRL(pld.value) : pld.value}</span>
              </p>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100/75 pt-1.5 font-medium leading-normal italic">
            {type === 'evolution' && "Dica: Clique em qualquer ponto para atualizar o período global do Dashboard para este mês."}
            {type === 'category' && "Dica: Clique na barra para pesquisar esta solução no painel."}
            {type === 'region' && `UF: ${data.name}. Concentra ${((data.value / (kpis.totalSales || 1)) * 100).toFixed(1)}% do faturamento. Clique para filtrar.`}
            {type === 'clients' && `Cliente: ${data.fullName}. Um dos 5 maiores parceiros deste período. Clique para pesquisar.`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards Row - Zoom Aproximado (Clickable to clear filters) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div 
          onClick={() => { setRegion('All'); setCluster('All'); setBranch('All'); setSearchQuery(''); }}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:translate-y-[-2px] cursor-pointer"
          title="Clique para resetar todos os filtros"
        >
          <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
            <DollarSign className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Faturamento</span>
            <span className="text-xl font-extrabold text-slate-800">{formatBRL(kpis.totalSales)}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Clientes Ativos</span>
            <span className="text-xl font-extrabold text-slate-800">{kpis.customerCount} empresas</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Atingimento Geral</span>
            <span className="text-xl font-extrabold text-slate-800">{kpis.targetProgress.toFixed(1)}%</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Ticket Médio</span>
            <span className="text-xl font-extrabold text-slate-800">{formatBRL(kpis.averageTicket)}</span>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: History & Target Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 2: AreaChart (Faturamento Histórico) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Evolução Temporal de Receita</h3>
              <p className="text-xs text-slate-400">Histórico de vendas mensais acumuladas vs meta. Clique em um ponto para filtrar.</p>
            </div>
            <span title="Demonstra o faturamento em relação à meta do período histórico.">
              <HelpCircle className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-pointer" />
            </span>
          </div>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={monthlyTrendData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    setPeriod(`${data.activeLabel}/2026`);
                  }
                }}
                className="cursor-pointer"
              >
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderRichTooltip(props, 'evolution')} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFat)" isAnimationActive={true} animationDuration={800} />
                <Area type="monotone" dataKey="meta" name="Meta" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorMeta)" isAnimationActive={true} animationDuration={800} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 3: BarChart (Meta vs Realizado por Linha) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Atingimento por Linha de Solução</h3>
              <p className="text-xs text-slate-400">Comparativo das categorias no período. Clique na barra para filtrar.</p>
            </div>
            <span title="Mostra o quanto do planejado foi realizado em cada linha de serviço.">
              <HelpCircle className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-pointer" />
            </span>
          </div>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={categoryData} 
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    setSearchQuery(searchQuery === labelStr ? '' : labelStr);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderRichTooltip(props, 'category')} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Realizado" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="Meta" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Region (Pie), Top Clients (Bar), and Summary Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual 4: Donut Region Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Faturamento por Região</h3>
          <p className="text-xs text-slate-400 mb-4">Concentração das vendas. Clique para filtrar.</p>
          <div className="flex-grow min-h-0 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={regionData.slice(0, 5)}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={850}
                  className="cursor-pointer"
                >
                  {regionData.slice(0, 5).map((entry, index) => {
                    const isSelected = region === entry.name;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        stroke="#fff"
                        strokeWidth={1.5}
                        fillOpacity={region === 'All' || isSelected ? 1 : 0.35}
                        onClick={() => setRegion(isSelected ? 'All' : entry.name)}
                        className="cursor-pointer hover:opacity-85 transition-all"
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={(props) => renderRichTooltip(props, 'region')} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top 5 UFs</span>
              <span className="text-base font-extrabold text-slate-700">
                {formatBRL(regionData.slice(0, 5).reduce((acc, curr) => acc + curr.value, 0))}
              </span>
            </div>
            {/* Custom Legend */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center flex-wrap gap-x-3 gap-y-1 text-xs">
              {regionData.slice(0, 5).map((item, idx) => {
                const isSelected = region === item.name;
                return (
                  <button 
                    key={item.name} 
                    onClick={() => setRegion(isSelected ? 'All' : item.name)}
                    className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${isSelected ? 'bg-slate-100 font-bold border border-slate-300' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse-fast" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="font-semibold text-slate-600">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual 5: Top 5 Clients Horizontal Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Top 5 Clientes</h3>
          <p className="text-xs text-slate-400 mb-4">Maiores faturamentos. Clique na barra para filtrar.</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topClients}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    const client = topClients.find(c => c.name === labelStr);
                    if (client) {
                      setSearchQuery(searchQuery === client.fullName ? '' : client.fullName);
                    }
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={80} />
                <Tooltip content={(props) => renderRichTooltip(props, 'clients')} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={true} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 6: Interactive Category Performance Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Desempenho por Categoria</h3>
          <p className="text-xs text-slate-400 mb-3">Clique na linha para pesquisar a solução.</p>
          <div className="flex-grow overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold select-none">
                  <th className="py-2.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('name')}>
                    Linha {sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-2.5 text-right cursor-pointer hover:text-slate-700" onClick={() => handleSort('Realizado')}>
                    Realizado {sortField === 'Realizado' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-2.5 text-right cursor-pointer hover:text-slate-700" onClick={() => handleSort('percentual')}>
                    Ating. {sortField === 'percentual' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => {
                  const isFiltered = searchQuery === cat.name;
                  return (
                    <tr 
                      key={cat.name} 
                      onClick={() => setSearchQuery(isFiltered ? '' : cat.name)}
                      className={`border-b border-slate-100 hover:bg-slate-50/70 text-slate-700 font-medium cursor-pointer transition-colors ${isFiltered ? 'bg-orange-50 hover:bg-orange-100/60 font-bold' : ''}`}
                    >
                      <td className="py-3 max-w-[100px] truncate">{cat.name}</td>
                      <td className="py-3 text-right">{formatBRL(cat.Realizado)}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cat.percentual >= 100 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : cat.percentual >= 80 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {cat.percentual.toFixed(0)}%
                        </span>
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
