import React, { useMemo, useState } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend, Cell, ComposedChart, Line, AreaChart, Area, PieChart, Pie
} from 'recharts';
import { ArrowDownRight, Clock, AlertTriangle, TrendingDown, CalendarClock, FileWarning, Landmark } from 'lucide-react';
import { VisualFiltersBar, type VisualFilter } from './VisualFiltersBar';

export const ContasPagarTab: React.FC = () => {
  const { branch } = useDashboard();
  const [activeAging, setActiveAging] = useState('Todos');
  const [activeCostCenter, setActiveCostCenter] = useState('Todos');

  // Mocked Data for Contas a Pagar
  const agingData = useMemo(() => [
    { name: 'Vencidos >30d', valor: 45000, count: 12, color: '#ef4444' },
    { name: 'Vencidos <30d', valor: 125000, count: 34, color: '#f97316' },
    { name: 'Vencem Hoje', valor: 85000, count: 15, color: '#f59e0b' },
    { name: 'A Vencer 7d', valor: 320000, count: 85, color: '#3b82f6' },
    { name: 'A Vencer 15d', valor: 450000, count: 110, color: '#10b981' },
    { name: 'A Vencer 30d+', valor: 890000, count: 150, color: '#14b8a6' },
  ], []);

  const fluxoCaixaFuturo = useMemo(() => [
    { data: '19/06', projetado: 85000, acumulado: 85000 },
    { data: '20/06', projetado: 45000, acumulado: 130000 },
    { data: '21/06', projetado: 110000, acumulado: 240000 },
    { data: '24/06', projetado: 65000, acumulado: 305000 },
    { data: '25/06', projetado: 150000, acumulado: 455000 },
    { data: '26/06', projetado: 220000, acumulado: 675000 },
    { data: '27/06', projetado: 95000, acumulado: 770000 },
    { data: '28/06', projetado: 310000, acumulado: 1080000 },
    { data: '01/07', projetado: 180000, acumulado: 1260000 },
    { data: '02/07', projetado: 75000, acumulado: 1335000 },
  ], []);

  const detailedList = useMemo(() => {
    const list = [];
    for(let i=0; i<30; i++) {
      const isOverdue = Math.random() > 0.8;
      const isToday = !isOverdue && Math.random() > 0.8;
      let status = isOverdue ? 'Atrasado' : isToday ? 'Vence Hoje' : 'A Vencer';
      const dueGroup = isOverdue
        ? 'Vencidos <30d'
        : isToday
          ? 'Vencem Hoje'
          : ['A Vencer 7d', 'A Vencer 15d', 'A Vencer 30d+'][Math.floor(Math.random() * 3)];
      list.push({
        id: `CP-${1000+i}`,
        fornecedor: `Fornecedor Parceiro ${i+1} S/A`,
        cnpj: `00.000.000/0001-${(10+i).toString().padStart(2, '0')}`,
        vencimento: isOverdue ? '10/06/2026' : isToday ? '19/06/2026' : `2${Math.floor(Math.random()*9)}/06/2026`,
        valor: Math.floor(Math.random() * 50000) + 1500,
        status: status,
        dueGroup,
        centroCusto: ['TI', 'Marketing', 'RH', 'Operações'][Math.floor(Math.random() * 4)],
        filial: ['Filial Sul', 'Filial Sudeste', 'Filial Nordeste'][Math.floor(Math.random() * 3)]
      });
    }
    return list.sort((a, _b) => a.status === 'Atrasado' ? -1 : 1);
  }, []);

  const branchFilteredList = useMemo(() => {
    if (branch === 'All') return detailedList;
    return detailedList.filter(item => item.filial === branch);
  }, [detailedList, branch]);

  const filteredList = useMemo(() => {
    return branchFilteredList.filter(item => {
      const matchAging = activeAging === 'Todos' || item.dueGroup === activeAging;
      const matchCostCenter = activeCostCenter === 'Todos' || item.centroCusto === activeCostCenter;
      return matchAging && matchCostCenter;
    });
  }, [branchFilteredList, activeAging, activeCostCenter]);

  const costCenterData = useMemo(() => {
    const counts: Record<string, number> = {};
    branchFilteredList
      .filter(item => activeAging === 'Todos' || item.dueGroup === activeAging)
      .forEach(item => {
        counts[item.centroCusto] = (counts[item.centroCusto] || 0) + item.valor;
      });
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    return Object.entries(counts).map(([name, valor], i) => ({
      name,
      valor,
      color: colors[i % colors.length]
    }));
  }, [branchFilteredList, activeAging]);

  const historicalTrend = useMemo(() => [
    { mes: 'Jan', pago: 720000 },
    { mes: 'Fev', pago: 810000 },
    { mes: 'Mar', pago: 790000 },
    { mes: 'Abr', pago: 950000 },
    { mes: 'Mai', pago: 880000 },
    { mes: 'Jun', pago: 890000 },
  ], []);

  const paymentQueue = useMemo(() => [
    { label: 'Lote crítico', value: 'R$ 255k', detail: 'Atrasados + hoje', icon: FileWarning, tone: 'bg-red-50 text-red-700 border-red-100' },
    { label: 'Agenda 7 dias', value: 'R$ 630k', detail: 'Pagamentos aprovados', icon: CalendarClock, tone: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Conta débito', value: 'Inter Empresas', detail: 'TED/PIX automático', icon: Landmark, tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  ], []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const visualFilters: VisualFilter[] = [
    ...(activeAging !== 'Todos'
      ? [{ key: 'aging', label: 'Aging', value: activeAging, tone: 'orange' as const, onClear: () => setActiveAging('Todos') }]
      : []),
    ...(activeCostCenter !== 'Todos'
      ? [{ key: 'cost-center', label: 'Centro de custo', value: activeCostCenter, tone: 'blue' as const, onClear: () => setActiveCostCenter('Todos') }]
      : []),
  ];

  const clearVisualFilters = () => {
    setActiveAging('Todos');
    setActiveCostCenter('Todos');
  };

  return (
    <div className="space-y-4 pb-8">
      <VisualFiltersBar filters={visualFilters} onClearAll={clearVisualFilters} />

      {/* Top KPI Cards - Alta Densidade */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Atrasado</p>
            <h3 className="text-xl font-extrabold text-red-600">{formatBRL(170000)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">46 títulos pendentes</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Vencendo Hoje</p>
            <h3 className="text-xl font-extrabold text-orange-500">{formatBRL(85000)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">15 títulos urgentes</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">A Vencer (Próx 30d)</p>
            <h3 className="text-xl font-extrabold text-blue-600">{formatBRL(1660000)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">345 títulos programados</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
            <TrendingDown className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Pago no Mês</p>
            <h3 className="text-xl font-extrabold text-emerald-600">{formatBRL(890000)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">180 títulos liquidados</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Middle Grid: 4 Visuals Ajustáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
        {/* Aging Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Aging de Títulos a Pagar</h3>
          <p className="text-[10px] text-slate-400 mb-2">Distribuição temporal de obrigações em aberto</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={agingData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                onClick={(data) => {
                  if (data?.activeLabel) {
                    const label = String(data.activeLabel);
                    setActiveAging(activeAging === label ? 'Todos' : label);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={true}>
                  {agingData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      fillOpacity={activeAging === 'Todos' || activeAging === entry.name ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fluxo de Caixa Futuro (Projetado vs Acumulado) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Fluxo de Caixa Futuro (Saídas)</h3>
          <p className="text-[10px] text-slate-400 mb-2">Previsão diária de pagamentos e acúmulo</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fluxoCaixaFuturo} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="data" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                <Bar yAxisId="left" dataKey="projetado" name="Saída Diária" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Centro de Custo (Pie/Donut) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Saídas por Centro de Custo</h3>
          <p className="text-[10px] text-slate-400 mb-2">Divisão proporcional dos custos operacionais</p>
          <div className="flex-grow min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costCenterData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="valor"
                >
                  {costCenterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      fillOpacity={activeCostCenter === 'Todos' || activeCostCenter === entry.name ? 1 : 0.3}
                      onClick={() => setActiveCostCenter(activeCostCenter === entry.name ? 'Todos' : entry.name)}
                      className="cursor-pointer transition-opacity"
                    />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histórico Mensal de Pagamentos (Area Chart) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Histórico Mensal de Saídas</h3>
          <p className="text-[10px] text-slate-400 mb-2">Volume liquidado nos últimos 6 meses</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPago" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Area type="monotone" dataKey="pago" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPago)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada Densidade Alta */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm min-h-[620px] flex flex-col overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Detalhamento Analítico</h3>
            <p className="text-[11px] text-slate-400">Listagem completa de títulos a pagar</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {paymentQueue.map(item => {
              const Icon = item.icon;

              return (
                <span key={item.label} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-extrabold uppercase ${item.tone}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}: {item.value}
                </span>
              );
            })}
            <div className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md font-semibold text-slate-600">
              Mostrando {filteredList.length} registros
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-h-[500px] overflow-auto relative rounded border border-slate-100">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Fornecedor</th>
                <th className="py-2.5 px-3">CNPJ</th>
                <th className="py-2.5 px-3">Vencimento</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3">Centro Custo</th>
                <th className="py-2.5 px-3">Filial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map(item => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'Atrasado' ? 'bg-red-100 text-red-700 border border-red-200' :
                      item.status === 'Vence Hoje' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{item.fornecedor}</td>
                  <td className="py-2 px-3 text-slate-500 font-mono">{item.cnpj}</td>
                  <td className="py-2 px-3 text-slate-600 font-medium">{item.vencimento}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBRL(item.valor)}</td>
                  <td className="py-2 px-3 text-slate-500">{item.centroCusto}</td>
                  <td className="py-2 px-3 text-slate-500">{item.filial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
