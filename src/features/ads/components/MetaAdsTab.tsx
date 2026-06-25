import React, { useMemo } from 'react';
import { 
  DollarSign, 
  Eye, 
  MousePointerClick, 
  Percent, 
  Target, 
  HelpCircle,
  Video,
  Image,
  TrendingUp
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Bar,
  Line
} from 'recharts';
import type { AdsDashboard } from '../../../types';
import { FunnelVisual } from './AdsWidgets';

export const MetaAdsTab: React.FC<{ data: AdsDashboard }> = ({ data }) => {
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'];

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-lg text-xs leading-relaxed max-w-[200px] backdrop-blur-sm z-50 animate-fade-in">
          <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1.5 uppercase tracking-wide text-[10px]">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-slate-700 font-semibold flex justify-between items-center gap-4">
              <span className="text-slate-500">Receita:</span>
              <span className="text-slate-900 font-bold">{formatBRL(payload[0].value)}</span>
            </p>
            <p className="text-slate-700 font-semibold flex justify-between items-center gap-4">
              <span className="text-slate-500">Investimento:</span>
              <span className="text-slate-900 font-bold">{formatBRL(payload[1].value)}</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100/75 pt-1.5 font-medium leading-normal italic">
            ROAS: {((payload[0].value / (payload[1].value || 1))).toFixed(1)}x
          </p>
        </div>
      );
    }
    return null;
  };

  const renderFrequencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-lg text-xs leading-relaxed max-w-[200px] backdrop-blur-sm z-50 animate-fade-in">
          <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1.5 uppercase tracking-wide text-[10px]">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-slate-700 font-semibold flex justify-between items-center gap-4">
              <span className="text-slate-500">Alcance (Pessoas):</span>
              <span className="text-slate-900 font-bold">{(payload[0].value).toLocaleString('pt-BR')}</span>
            </p>
            <p className="text-slate-700 font-semibold flex justify-between items-center gap-4">
              <span className="text-slate-500">Frequência:</span>
              <span className="text-slate-900 font-bold">{payload[1].value}x</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Ícones correspondentes a cada KPI
  const getKpiIcon = (id: string) => {
    switch (id) {
      case 'spend':
        return DollarSign;
      case 'impressions':
        return Eye;
      case 'clicks':
        return MousePointerClick;
      case 'ctr':
        return Percent;
      default:
        return Target;
    }
  };

  // Cores de fundo dos ícones dos KPIs
  const getKpiColorClasses = (tone: string) => {
    switch (tone) {
      case 'blue':
        return { bg: 'bg-blue-50', text: 'text-blue-600' };
      case 'emerald':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600' };
      case 'amber':
        return { bg: 'bg-amber-50', text: 'text-amber-600' };
      case 'rose':
        return { bg: 'bg-rose-50', text: 'text-rose-600' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-600' };
    }
  };

  // Geração reativa de dados para alcance e frequência
  const frequencyTimelineData = useMemo(() => {
    return data.timeline.map((point, idx) => {
      const alcance = (point.investimento || 0) * 11;
      const frequencia = 1.12 + (idx * 0.22) + ((point.investimento || 0) % 4) * 0.08;
      return {
        ...point,
        alcance,
        frequencia: parseFloat(frequencia.toFixed(2))
      };
    });
  }, [data.timeline]);

  // Funil de Conversão Meta
  const funnelSteps = useMemo(() => {
    return [
      { stage: 'Visualizações do Anúncio', desc: 'Impressões veiculadas', val: '3,8M', rate: '100%', sub: 'Base de Mídia' },
      { stage: 'Cliques no Link', desc: 'Interesse imediato', val: '92.400', rate: '2.43%', sub: 'CTR Médio' },
      { stage: 'Cadastros Realizados', desc: 'Captação de leads', val: '4.100', rate: '4.44%', sub: 'Custo R$ 18.70' },
      { stage: 'Compras Atribuídas', desc: 'Vendas finais no pixel', val: '3.500', rate: '85.3%', sub: 'ROAS Global 5.7x' }
    ];
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Título e Subtítulo */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-black tracking-tight text-slate-900">{data.title}</h1>
        <p className="text-xs text-slate-500">{data.subtitle}</p>
      </div>

      {/* 2. Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {data.kpis.map(item => {
          const Icon = getKpiIcon(item.id);
          const colorClasses = getKpiColorClasses(item.tone);
          const isNegative = item.delta.includes('-');

          let subMetric = null;
          if (item.id === 'impressions') {
            subMetric = 'Alcance Inc: +22%';
          } else if (item.id === 'clicks') {
            subMetric = 'Clique Qualificado: 71%';
          }

          return (
            <div 
              key={item.id} 
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:translate-y-[-2px]"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`p-2.5 rounded-lg shrink-0 ${colorClasses.bg} ${colorClasses.text}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider truncate">{item.label}</span>
                  <span className="text-lg font-extrabold text-slate-800 block leading-tight">{item.value}</span>
                  {subMetric && (
                    <span className="text-[9px] font-bold text-slate-500 block mt-0.5 tracking-tight truncate">{subMetric}</span>
                  )}
                </div>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                isNegative 
                  ? 'bg-rose-50 text-rose-700 border-rose-100' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {item.delta}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. Linha 2: Gráfico de Evolução e Blocos de Campanha */}
      <div className="grid grid-cols-1 2xl:grid-cols-[1.3fr_0.7fr] gap-4">
        {/* Gráfico de Evolução */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[300px]">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Evolução de Receita e Investimento</h3>
              <p className="text-[10px] text-slate-400">Leitura semanal de retorno por verba aplicada no Meta.</p>
            </div>
            <span title="Retorno financeiro vs investimento no Meta Ads">
              <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 cursor-pointer" />
            </span>
          </div>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeline} margin={{ top: 5, right: 5, left: -25, bottom: -5 }}>
                <defs>
                  <linearGradient id="colorMetaReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMetaInvestimento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={renderTooltip} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorMetaReceita)" />
                <Area type="monotone" dataKey="investimento" name="Investimento" stroke="#3b82f6" strokeWidth={1.2} fillOpacity={1} fill="url(#colorMetaInvestimento)" />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Blocos de Campanha */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[300px] justify-between">
          <div className="mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Blocos de Campanha</h3>
            <p className="text-[10px] text-slate-400">Resumo por objetivo principal.</p>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-grow">
            {data.summaryCards.map((card, idx) => (
              <div key={card.title} className="border border-slate-100 bg-slate-50/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">{card.title}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    ROAS {card.roas?.toFixed(1)}x
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] mb-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verba:</span>
                    <span className="font-bold text-slate-700">R$ {(card.spend ?? 0).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conv.:</span>
                    <span className="font-bold text-slate-700">{(card.conversions ?? 0).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="h-1 w-full bg-slate-200/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ 
                      width: `${Math.min(((card.roas ?? 0) / 8) * 100, 100)}%`, 
                      backgroundColor: COLORS[idx % COLORS.length] 
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Linha 3 (COMPACTADA E COMPLETA - 4 COLUNAS SEM ESPAÇOS EM BRANCO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Canais */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Canais de Veiculação</h3>
            <p className="text-xs text-slate-500 font-medium">Percentual de veiculação.</p>
          </div>
          <div className="flex-grow flex items-center justify-between gap-1 min-h-0">
            <div className="w-[100px] h-[100px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.breakdown} innerRadius={24} outerRadius={36} paddingAngle={2} dataKey="value">
                    {data.breakdown.map((entry, idx) => (
                      <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 flex-grow pl-2 overflow-y-auto max-h-[160px]">
              {data.breakdown.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-bold text-slate-600 truncate max-w-[80px] text-xs">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Campanhas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Top Campanhas</h3>
            <p className="text-xs text-slate-500 font-medium">Ranking por receita atribuída.</p>
          </div>
          <div className="space-y-2 overflow-y-auto flex-grow pr-1 text-xs">
            {data.ranking.map(item => (
              <div key={item.name} className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center font-semibold text-slate-700">
                  <span className="truncate max-w-[120px] text-xs">{item.name}</span>
                  <span className="font-bold text-slate-950 text-xs">R$ {item.value.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>{item.secondary}</span>
                  <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900" style={{ width: `${Math.min((item.value / 65000) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Criativos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Performance Criativos</h3>
            <p className="text-xs text-slate-500 font-medium">Variações em maior engajamento.</p>
          </div>
          <div className="space-y-1.5 overflow-y-auto flex-grow pr-1 text-xs">
            {data.channelPerformance.map((creative, idx) => (
              <div key={creative.name} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                <div className="h-7 w-7 bg-slate-200/50 rounded flex items-center justify-center text-slate-500 shrink-0">
                  {idx % 2 === 0 ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                </div>
                <div className="flex-grow min-w-0">
                  <span className="font-bold text-slate-850 truncate block leading-tight text-xs">{creative.name}</span>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>Perf: {creative.value}</span>
                    <span className="truncate max-w-[70px]">{creative.secondary}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audiências Alvo (NOVO GRÁFICO 4 PARA DENSIDADE COMPACTA) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="mb-2 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Audiências Alvo</h3>
              <p className="text-xs text-slate-500 font-medium">Veiculação de públicos ativas.</p>
            </div>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              14 Públicos
            </span>
          </div>
          <div className="space-y-2 overflow-y-auto flex-grow pr-1 text-xs">
            <div className="space-y-2">
              {[
                { name: 'Lookalike Compradores 1%', roas: '7.2x', spend: '35%' },
                { name: 'Visitantes Recentes Site', roas: '6.5x', spend: '25%' },
                { name: 'Engajamento Instagram 30d', roas: '4.8x', spend: '22%' },
                { name: 'Lista de E-mails Clientes', roas: '8.1x', spend: '18%' }
              ].map((aud) => (
                <div key={aud.name} className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-slate-700 font-semibold text-xs">
                    <span className="truncate max-w-[120px] text-xs">{aud.name}</span>
                    <span className="font-bold text-slate-900">{aud.roas}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Participação: {aud.spend}</span>
                    <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: aud.spend }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Linha 4 (NOVA LINHA DE GRÁFICOS RICOS E DENSOS - 2 COLUNAS) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Gráfico 1: Funil de Conversão Meta Completo */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[360px]">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Funil de Conversão Meta Ads</h3>
            <p className="text-xs text-slate-500 font-medium">Taxa de conversão e transição entre etapas de compra.</p>
          </div>
          
          <FunnelVisual
            steps={funnelSteps.map((step, idx) => ({
              ...step,
              width: [100, 72, 48, 34][idx]
            }))}
            accent="#2563eb"
            softAccent="#8b5cf6"
          />
          <div className="hidden">
            {funnelSteps.map((step, idx) => (
              <div key={step.stage} className="flex items-center gap-3">
                {/* Nome do Estágio */}
                <div className="w-1/3 text-left font-bold text-slate-700 text-xs truncate">
                  {step.stage}
                </div>
                {/* Visualização da Barra do Funil */}
                <div className="flex-grow relative h-6 bg-slate-100 rounded-md overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80" 
                    style={{ width: idx === 0 ? '100%' : idx === 1 ? '75%' : idx === 2 ? '45%' : '35%' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black text-slate-800">
                    <span>{step.desc}</span>
                    <span className="bg-white/80 px-1.5 py-0.5 rounded text-slate-900 border border-slate-200/40">{step.val}</span>
                  </div>
                </div>
                {/* Taxa de Conversão */}
                <div className="w-[70px] text-right text-xs shrink-0 font-extrabold text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded px-1.5 py-0.5">
                  {idx === 0 ? 'Base' : `${step.rate}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 2: Análise de Frequência e Alcance (ComposedChart) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[360px]">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Alcance Acumulado e Frequência</h3>
              <p className="text-xs text-slate-500 font-medium">Total de pessoas únicas alcançadas vs frequência de veiculação.</p>
            </div>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={frequencyTimelineData} margin={{ top: 5, right: -5, left: -25, bottom: -5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}x`} domain={[1.0, 3.0]} />
                <Tooltip content={renderFrequencyTooltip} />
                <Bar yAxisId="left" dataKey="alcance" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={25} name="Alcance" />
                <Line yAxisId="right" type="monotone" dataKey="frequencia" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 3 }} name="Frequência" />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
