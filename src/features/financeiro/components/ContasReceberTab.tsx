import React, { useMemo, useState } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend, Cell, ComposedChart, Line, AreaChart, Area, PieChart, Pie
} from 'recharts';
import { ArrowUpRight, Clock, AlertTriangle, TrendingUp, BadgeCheck, MessageSquareWarning, WalletCards } from 'lucide-react';

export const ContasReceberTab: React.FC = () => {
  const { branch } = useDashboard();
  const [activeAging, setActiveAging] = useState('Todos');
  const [activeSegment, setActiveSegment] = useState('Todos');

  // Mocked Data for Contas a Receber
  const agingData = useMemo(() => [
    { name: 'Vencidos >30d', valor: 85000, count: 22, color: '#ef4444' },
    { name: 'Vencidos <30d', valor: 215000, count: 54, color: '#f97316' },
    { name: 'Vencem Hoje', valor: 145000, count: 25, color: '#f59e0b' },
    { name: 'A Vencer 7d', valor: 520000, count: 120, color: '#3b82f6' },
    { name: 'A Vencer 15d', valor: 750000, count: 180, color: '#10b981' },
    { name: 'A Vencer 30d+', valor: 1290000, count: 250, color: '#14b8a6' },
  ], []);

  const fluxoCaixaFuturo = useMemo(() => [
    { data: '19/06', projetado: 145000, acumulado: 145000 },
    { data: '20/06', projetado: 85000, acumulado: 230000 },
    { data: '21/06', projetado: 210000, acumulado: 440000 },
    { data: '24/06', projetado: 115000, acumulado: 555000 },
    { data: '25/06', projetado: 250000, acumulado: 805000 },
    { data: '26/06', projetado: 320000, acumulado: 1125000 },
    { data: '27/06', projetado: 195000, acumulado: 1320000 },
    { data: '28/06', projetado: 410000, acumulado: 1730000 },
    { data: '01/07', projetado: 280000, acumulado: 2010000 },
    { data: '02/07', projetado: 175000, acumulado: 2185000 },
  ], []);

  const detailedList = useMemo(() => {
    const list = [];
    for(let i=0; i<40; i++) {
      const isOverdue = Math.random() > 0.85;
      const isToday = !isOverdue && Math.random() > 0.85;
      let status = isOverdue ? 'Atrasado' : isToday ? 'Vence Hoje' : 'A Vencer';
      const dueGroup = isOverdue
        ? 'Vencidos <30d'
        : isToday
          ? 'Vencem Hoje'
          : ['A Vencer 7d', 'A Vencer 15d', 'A Vencer 30d+'][Math.floor(Math.random() * 3)];
      list.push({
        id: `CR-${1000+i}`,
        cliente: `Cliente Enterprise ${i+1} S/A`,
        cnpj: `00.000.000/0001-${(10+i).toString().padStart(2, '0')}`,
        vencimento: isOverdue ? '10/06/2026' : isToday ? '19/06/2026' : `2${Math.floor(Math.random()*9)}/06/2026`,
        valor: Math.floor(Math.random() * 80000) + 2500,
        status: status,
        dueGroup,
        segmento: ['Tecnologia', 'Varejo', 'Indústria', 'Serviços'][Math.floor(Math.random() * 4)],
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
      const matchSegment = activeSegment === 'Todos' || item.segmento === activeSegment;
      return matchAging && matchSegment;
    });
  }, [branchFilteredList, activeAging, activeSegment]);

  const segmentData = useMemo(() => {
    const counts: Record<string, number> = {};
    branchFilteredList
      .filter(item => activeAging === 'Todos' || item.dueGroup === activeAging)
      .forEach(item => {
        counts[item.segmento] = (counts[item.segmento] || 0) + item.valor;
      });
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    return Object.entries(counts).map(([name, valor], i) => ({
      name,
      valor,
      color: colors[i % colors.length]
    }));
  }, [branchFilteredList, activeAging]);

  const historicalTrend = useMemo(() => [
    { mes: 'Jan', recebido: 1450000 },
    { mes: 'Fev', recebido: 1680000 },
    { mes: 'Mar', recebido: 1590000 },
    { mes: 'Abr', recebido: 1850000 },
    { mes: 'Mai', recebido: 1720000 },
    { mes: 'Jun', recebido: 1890000 },
  ], []);

  const receivableQueue = useMemo(() => [
    { label: 'Carteira quente', value: 'R$ 445k', detail: 'Vencidas + hoje', icon: MessageSquareWarning, tone: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Clientes bons pagadores', value: '86%', detail: 'Recorrência sem atraso', icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Canais de recebimento', value: 'Pix / Boleto / Cartão', detail: 'Régua automática ativa', icon: WalletCards, tone: 'bg-sky-50 text-sky-700 border-sky-100' },
  ], []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top KPI Cards - Alta Densidade */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Inadimplência</p>
            <h3 className="text-xl font-extrabold text-red-600">{formatBRL(300000)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">76 faturas vencidas</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Entradas Hoje</p>
            <h3 className="text-xl font-extrabold text-orange-500">{formatBRL(145000)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">25 faturas urgentes</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">A Receber (Próx 30d)</p>
            <h3 className="text-xl font-extrabold text-blue-600">{formatBRL(2560000)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">550 faturas programadas</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Recebido no Mês</p>
            <h3 className="text-xl font-extrabold text-emerald-600">{formatBRL(1890000)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">320 faturas liquidadas</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Middle Grid: 4 Visuals Ajustáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
        {/* Aging Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Aging de Faturas a Receber</h3>
          <p className="text-[10px] text-slate-400 mb-2">Distribuição temporal de créditos em aberto</p>
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
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Fluxo de Caixa Futuro (Entradas)</h3>
          <p className="text-[10px] text-slate-400 mb-2">Previsão diária de recebimentos e acúmulo</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fluxoCaixaFuturo} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="data" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                <Bar yAxisId="left" dataKey="projetado" name="Entrada Diária" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Segmento (Pie/Donut) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Receitas por Segmento</h3>
          <p className="text-[10px] text-slate-400 mb-2">Divisão proporcional por setor de cliente</p>
          <div className="flex-grow min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="valor"
                >
                  {segmentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      fillOpacity={activeSegment === 'Todos' || activeSegment === entry.name ? 1 : 0.3}
                      onClick={() => setActiveSegment(activeSegment === entry.name ? 'Todos' : entry.name)}
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

        {/* Histórico Mensal de Recebimentos (Area Chart) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Histórico Mensal de Entradas</h3>
          <p className="text-[10px] text-slate-400 mb-2">Volume liquidado nos últimos 6 meses</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Area type="monotone" dataKey="recebido" stroke="#10b981" fillOpacity={1} fill="url(#colorRecebido)" strokeWidth={2} />
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
            <p className="text-[11px] text-slate-400">Listagem completa de faturas a receber</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(activeAging !== 'Todos' || activeSegment !== 'Todos') && (
              <button
                onClick={() => {
                  setActiveAging('Todos');
                  setActiveSegment('Todos');
                }}
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-extrabold uppercase text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Limpar filtros visuais
              </button>
            )}
            {receivableQueue.map(item => {
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
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">CNPJ</th>
                <th className="py-2.5 px-3">Vencimento</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3">Segmento</th>
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
                  <td className="py-2 px-3 font-semibold text-slate-800">{item.cliente}</td>
                  <td className="py-2 px-3 text-slate-500 font-mono">{item.cnpj}</td>
                  <td className="py-2 px-3 text-slate-600 font-medium">{item.vencimento}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBRL(item.valor)}</td>
                  <td className="py-2 px-3 text-slate-500">{item.segmento}</td>
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
