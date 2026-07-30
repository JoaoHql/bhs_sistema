import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, DollarSign, HelpCircle, Percent, Users } from 'lucide-react';
import type {
  OverviewCategoryPoint,
  OverviewKpis,
  OverviewSegmentPoint,
  OverviewTemplateActions,
  OverviewTemplateLabels,
  OverviewTopClientPoint,
  OverviewTrendPoint,
} from './types';

const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f43f5e', '#eab308', '#06b6d4'];

interface OverviewTemplateProps {
  kpis: OverviewKpis;
  trendData: OverviewTrendPoint[];
  categoryData: OverviewCategoryPoint[];
  segmentData: OverviewSegmentPoint[];
  topClients: OverviewTopClientPoint[];
  selectedSegment: string;
  searchQuery: string;
  actions: OverviewTemplateActions;
  labels?: OverviewTemplateLabels;
}

type TooltipPayloadItem = {
  name?: string;
  value: number | string;
  payload: Record<string, unknown>;
};

type TooltipArgs = {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string;
};

export const OverviewTemplate: React.FC<OverviewTemplateProps> = ({
  kpis,
  trendData,
  categoryData,
  segmentData,
  topClients,
  selectedSegment,
  searchQuery,
  actions,
  labels,
}) => {
  const [sortField, setSortField] = useState<string>('Realizado');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sortedCategories = useMemo(() => {
    return [...categoryData].sort((a, b) => {
      const valA = a[sortField as keyof OverviewCategoryPoint];
      const valB = b[sortField as keyof OverviewCategoryPoint];
      if (typeof valA === 'string' || typeof valB === 'string') {
        return sortAsc ? String(valA ?? '').localeCompare(String(valB ?? '')) : String(valB ?? '').localeCompare(String(valA ?? ''));
      }
      return sortAsc ? Number(valA ?? 0) - Number(valB ?? 0) : Number(valB ?? 0) - Number(valA ?? 0);
    });
  }, [categoryData, sortAsc, sortField]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
      return;
    }
    setSortField(field);
    setSortAsc(false);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const renderRichTooltip = ({ active, payload, label }: TooltipArgs, type: string) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    const isMoney = payload.some((item) => ['Faturamento', 'Realizado', 'Meta', 'value'].includes(String(item.name)));

    return (
      <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-lg text-xs leading-relaxed max-w-[240px] backdrop-blur-sm z-50">
        <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1.5 uppercase tracking-wide text-[10px]">
          {label || payload[0].name || String(data.name ?? '')}
        </p>
        <div className="space-y-1">
          {payload.map((pld, idx) => (
            <p key={idx} className="text-slate-700 font-semibold flex justify-between items-center gap-4">
              <span className="text-slate-500">{pld.name}:</span>
              <span className="text-slate-900 font-bold">{isMoney ? formatBRL(Number(pld.value)) : pld.value}</span>
            </p>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100/75 pt-1.5 font-medium leading-normal italic">
          {type === 'evolution' && 'Dica: clique em qualquer ponto para atualizar o periodo global do dashboard.'}
          {type === 'category' && 'Dica: clique na barra para pesquisar esta linha no painel.'}
          {type === 'segment' && `${labels?.segmentCenterLabel || 'Segmento'}: ${String(data.name ?? '')}. Concentra ${((Number(data.value ?? 0) / (kpis.totalSales || 1)) * 100).toFixed(1)}% do faturamento.`}
          {type === 'clients' && `Cliente: ${String(data.fullName ?? '')}. Um dos 5 maiores parceiros deste periodo.`}
        </p>
      </div>
    );
  };

  const hasTargetSeries = trendData.some((item) => typeof item.meta === 'number');
  const hasCategoryTarget = categoryData.some((item) => typeof item.Meta === 'number');
  const topSegments = segmentData.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={actions.resetFilters}
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

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Clientes Ativos</span>
            <span className="text-xl font-extrabold text-slate-800">{kpis.customerCount} empresas</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">{labels?.targetKpiLabel || 'Atingimento Geral'}</span>
            <span className="text-xl font-extrabold text-slate-800">
              {labels?.targetKpiFormat === 'number'
                ? new Intl.NumberFormat('pt-BR').format(kpis.targetProgress)
                : `${kpis.targetProgress.toFixed(1)}%`}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Ticket Medio</span>
            <span className="text-xl font-extrabold text-slate-800">{formatBRL(kpis.averageTicket)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Evolucao Temporal de Receita</h3>
              <p className="text-xs text-slate-400">Historico de vendas acumuladas{hasTargetSeries ? ' vs meta' : ''}. Clique em um ponto para filtrar.</p>
            </div>
            <span title="Demonstra o faturamento ao longo do periodo.">
              <HelpCircle className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-pointer" />
            </span>
          </div>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(data) => {
                  if (data?.activeLabel) actions.selectPeriod(String(data.activeLabel));
                }}
                className="cursor-pointer"
              >
                <defs>
                  <linearGradient id="overviewColorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="overviewColorMeta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderRichTooltip(props as TooltipArgs, 'evolution')} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#overviewColorFat)" isAnimationActive animationDuration={800} />
                {hasTargetSeries && (
                  <Area type="monotone" dataKey="meta" name="Meta" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#overviewColorMeta)" isAnimationActive animationDuration={800} />
                )}
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{labels?.categoryTitle || 'Atingimento por Linha de Solucao'}</h3>
              <p className="text-xs text-slate-400">{labels?.categorySubtitle || 'Comparativo das categorias no periodo. Clique na barra para filtrar.'}</p>
            </div>
            <span title="Mostra o desempenho por linha, categoria ou dimensao equivalente.">
              <HelpCircle className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-pointer" />
            </span>
          </div>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(data) => {
                  if (data?.activeLabel) actions.toggleCategorySearch(String(data.activeLabel));
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip content={(props) => renderRichTooltip(props as TooltipArgs, 'category')} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Realizado" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive animationDuration={800} />
                {hasCategoryTarget && (
                  <Bar dataKey="Meta" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive animationDuration={800} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">{labels?.segmentTitle || 'Faturamento por Regiao'}</h3>
          <p className="text-xs text-slate-400 mb-4">{labels?.segmentSubtitle || 'Concentracao das vendas. Clique para filtrar.'}</p>
          <div className="flex-grow min-h-0 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topSegments} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" isAnimationActive animationDuration={850} className="cursor-pointer">
                  {topSegments.map((entry, index) => {
                    const isSelected = selectedSegment === entry.name;
                    return (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={1.5}
                        fillOpacity={selectedSegment === 'All' || isSelected ? 1 : 0.35}
                        onClick={() => actions.toggleSegment(entry.name)}
                        className="cursor-pointer hover:opacity-85 transition-all"
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={(props) => renderRichTooltip(props as TooltipArgs, 'segment')} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{labels?.segmentCenterLabel || 'Top 5 UFs'}</span>
              <span className="text-base font-extrabold text-slate-700">
                {formatBRL(topSegments.reduce((acc, curr) => acc + curr.value, 0))}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex justify-center flex-wrap gap-x-3 gap-y-1 text-xs">
              {topSegments.map((item, idx) => {
                const isSelected = selectedSegment === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => actions.toggleSegment(item.name)}
                    className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${isSelected ? 'bg-slate-100 font-bold border border-slate-300' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse-fast" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-semibold text-slate-600">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

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
                  if (!data?.activeLabel) return;
                  const client = topClients.find((item) => item.name === String(data.activeLabel));
                  if (client) actions.toggleClientSearch(client.fullName);
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={80} />
                <Tooltip content={(props) => renderRichTooltip(props as TooltipArgs, 'clients')} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">{labels?.categoryTableTitle || 'Desempenho por Categoria'}</h3>
          <p className="text-xs text-slate-400 mb-3">{labels?.categoryTableSubtitle || 'Clique na linha para pesquisar a solucao.'}</p>
          <div className="data-table-scroll flex-grow overflow-auto">
            <table className="min-w-[720px] w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#e2e8f0]">
                <tr className="border-b border-slate-100 text-slate-400 font-bold select-none">
                  <th className="py-2.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('name')}>
                    Linha {sortField === 'name' ? (sortAsc ? '^' : 'v') : ''}
                  </th>
                  <th className="py-2.5 text-right cursor-pointer hover:text-slate-700" onClick={() => handleSort('Realizado')}>
                    Realizado {sortField === 'Realizado' ? (sortAsc ? '^' : 'v') : ''}
                  </th>
                  <th className="py-2.5 text-right cursor-pointer hover:text-slate-700" onClick={() => handleSort('percentual')}>
                    Ating. {sortField === 'percentual' ? (sortAsc ? '^' : 'v') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => {
                  const isFiltered = searchQuery === cat.name;
                  const percentual = Number(cat.percentual ?? 0);
                  return (
                    <tr
                      key={cat.name}
                      onClick={() => actions.toggleCategorySearch(cat.name)}
                      className={`border-b border-slate-100 hover:bg-slate-50/70 text-slate-700 font-medium cursor-pointer transition-colors ${isFiltered ? 'bg-orange-50 hover:bg-orange-100/60 font-bold' : ''}`}
                    >
                      <td className="py-3 max-w-[100px] truncate">{cat.name}</td>
                      <td className="py-3 text-right">{formatBRL(cat.Realizado)}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          percentual >= 100
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : percentual >= 80
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {percentual.toFixed(0)}%
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
