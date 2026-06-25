import React, { useMemo, useState } from 'react';
import { 
  Globe2, 
  Smartphone, 
  Monitor, 
  Laptop, 
  Activity, 
  ExternalLink,
  Timer,
  CheckCircle2,
  Users,
  X
} from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { AdsDashboard } from '../../../types';
import { DreStyleSankey, FunnelVisual } from './AdsWidgets';

export const GoogleAnalyticsTab: React.FC<{ data: AdsDashboard }> = ({ data }) => {
  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

  const [selectedSankeyNode, setSelectedSankeyNode] = useState<string | null>(null);

  const sankeyDetails = {
    organic: {
      title: 'Tráfego Orgânico (Organic Search)',
      value: '35% do tráfego total',
      description: 'Usuários que acessaram o site por meio de buscas orgânicas nos buscadores (Google, Bing, etc.).',
      rows: [
        { label: 'Sessões Orgânicas', value: '142.000 sessões' },
        { label: 'Taxa de Engajamento', value: '66.8%' },
        { label: 'Origem Principal', value: 'Google Search' }
      ]
    },
    paid: {
      title: 'Tráfego de Mídia Paga (Paid Social)',
      value: '29% do tráfego total',
      description: 'Sessões originadas de campanhas de anúncios em redes sociais pagas (Meta Ads, Google Ads).',
      rows: [
        { label: 'Sessões Pagas', value: '118.000 sessões' },
        { label: 'Taxa de Engajamento', value: '61.2%' },
        { label: 'Origem Principal', value: 'Facebook / Instagram Ads' }
      ]
    },
    home: {
      title: 'Página Inicial (Home)',
      value: '45% de visualizações',
      description: 'A página de entrada principal do site corporativo.',
      rows: [
        { label: 'Volume de Sessões', value: '82.000 sessões' },
        { label: 'Taxa de Rejeição', value: '28.7%' },
        { label: 'Engajamento Médio', value: '45 segundos' }
      ]
    },
    products: {
      title: 'Página de Produtos',
      value: '35% de visualizações',
      description: 'Visualização de produtos da linha premium e páginas de categoria.',
      rows: [
        { label: 'Visualizações de Produto', value: '185.000 views' },
        { label: 'Adições ao Carrinho', value: '56.400 itens' },
        { label: 'Conversão Relativa', value: '30.5%' }
      ]
    },
    checkout: {
      title: 'Carrinho & Checkout',
      value: '18% do fluxo',
      description: 'Início do fluxo de pagamento e fechamento de compras.',
      rows: [
        { label: 'Inícios de Checkout', value: '31.200 sessões' },
        { label: 'Abandono de Checkout', value: '69.5%' },
        { label: 'Taxa de Sucesso', value: '41.1%' }
      ]
    },
    exit: {
      title: 'Saídas do Site (Exits)',
      value: '88% de taxa de abandono',
      description: 'Sessões encerradas pelo usuário antes de concluir a compra.',
      rows: [
        { label: 'Sessões Abandonadas', value: '362.400 sessões' },
        { label: 'Principal Ponto de Saída', value: 'Página de Checkout (24%)' },
        { label: 'Taxa de Rejeição Global', value: '28.7%' }
      ]
    },
    purchase: {
      title: 'Compras Concluídas',
      value: '12% de sucesso final',
      description: 'Usuários que concluíram o checkout de e-commerce e geraram conversões de compra.',
      rows: [
        { label: 'Volume de Transações', value: '12.840 vendas' },
        { label: 'Taxa de Conversão Geral', value: '3.1%' },
        { label: 'Ticket Médio GA4', value: 'R$ 245,00' }
      ]
    }
  };

  const selectedDetail = selectedSankeyNode ? sankeyDetails[selectedSankeyNode as keyof typeof sankeyDetails] : null;

  const realTimeViews = [12, 19, 15, 8, 22, 28, 14, 18, 25, 30, 24, 17, 21, 29, 32];

  const formatNumber = (val: number) => {
    return val.toLocaleString('pt-BR');
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-lg text-xs leading-relaxed max-w-[200px] backdrop-blur-sm z-50 animate-fade-in">
          <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-0.5 mb-1.5 uppercase tracking-wide text-[10px]">
            {label}
          </p>
          <div className="space-y-0.5">
            <p className="text-slate-700 font-semibold flex justify-between items-center gap-4">
              <span className="text-slate-500">Sessões:</span>
              <span className="text-slate-900 font-bold">{formatNumber(payload[0].value)}</span>
            </p>
            <p className="text-slate-700 font-semibold flex justify-between items-center gap-4">
              <span className="text-slate-500">Conversões:</span>
              <span className="text-slate-900 font-bold">{formatNumber(payload[1].value)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Mapeamento de ícones de dispositivo
  const getDeviceIcon = (deviceName: string) => {
    switch (deviceName.toLowerCase()) {
      case 'mobile':
        return Smartphone;
      case 'desktop':
        return Monitor;
      case 'tablet':
        return Laptop;
      default:
        return Globe2;
    }
  };

  // Ícones correspondentes a cada KPI de analytics
  const getKpiIcon = (id: string) => {
    switch (id) {
      case 'sessions':
        return Activity;
      case 'users':
        return Users;
      case 'engagement':
        return Timer;
      case 'conversions':
        return CheckCircle2;
      default:
        return Globe2;
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

  // Funil de e-commerce GA4
  const behaviorFunnelSteps = useMemo(() => {
    return [
      { stage: 'Sessões Ativas', desc: 'Tráfego entrante', val: '412k', rate: '100%', sub: 'Base GA4' },
      { stage: 'Visualização de Produto', desc: 'Visualização de itens', val: '185k', rate: '44.9%', sub: 'Interesse' },
      { stage: 'Adição ao Carrinho', desc: 'Intenção de compra', val: '56.400', rate: '30.5%', sub: 'Abandono 69.5%' },
      { stage: 'Checkout Iniciado', desc: 'Preenchimento de dados', val: '31.200', rate: '55.3%', sub: 'Etapa Final' },
      { stage: 'Transações Concluídas', desc: 'Vendas convertidas', val: '12.840', rate: '41.1%', sub: 'CVR Geral 3.1%' }
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

          // Inclusão de sub-métricas compactas para remover cartões inferiores
          let subMetric = null;
          if (item.id === 'sessions') {
            subMetric = 'Origens Ativas: 22';
          } else if (item.id === 'conversions') {
            subMetric = 'Eventos Medidos: 38';
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

      {/* 3. Linha 2: Gráfico Composto e Monitor de Tempo Real */}
      <div className="grid grid-cols-1 2xl:grid-cols-[1.3fr_0.7fr] gap-4">
        {/* Gráfico Composto (Sessões vs Conversões) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[300px]">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Sessões e Conversões de Tráfego</h3>
              <p className="text-[10px] text-slate-400">Tendência de tráfego com volume de conversões de GA4.</p>
            </div>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.timeline} margin={{ top: 5, right: 5, left: -25, bottom: -5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={renderTooltip} />
                <Bar dataKey="sessoes" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={30} name="Sessões" />
                <Line type="monotone" dataKey="conversoes" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5 }} activeDot={{ r: 5 }} name="Conversões" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Telemetria de Tempo Real */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[300px] justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Monitor de Tempo Real</h3>
              <span className="flex h-2 w-2 relative">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold">Usuários ativos no site.</p>
          </div>
          
          <div className="my-auto py-1 text-center">
            <span className="text-5xl font-black text-slate-900 tracking-tight leading-none block">142</span>
            <span className="text-[10px] font-extrabold text-slate-500 mt-1 uppercase tracking-wider block">ativos agora</span>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Visualizações / min (histórico 15m)</span>
            <div className="flex items-end gap-1 h-12 px-1">
              {realTimeViews.map((views, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-slate-200 hover:bg-emerald-500 rounded-sm transition-all duration-300 group relative"
                  style={{ height: `${(views / 35) * 100}%` }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-950 text-white font-extrabold text-[9px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-30">
                    Min {15-i}: {views} views
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Linha 3 (COMPACTADA E COMPLETA - 4 COLUNAS SEM ESPAÇOS EM BRANCO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Aquisição */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Canais de Aquisição</h3>
            <p className="text-xs text-slate-500 font-medium">Origem de tráfego dos usuários.</p>
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

        {/* Top Landing Pages */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Top Páginas</h3>
            <p className="text-xs text-slate-500 font-medium">Páginas mais acessadas.</p>
          </div>
          <div className="space-y-1.5 overflow-y-auto flex-grow pr-1 text-xs">
            {data.ranking.map(page => (
              <div key={page.name} className="flex items-center justify-between py-1 border-b border-slate-100 hover:bg-slate-50 px-1 rounded transition-colors">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-mono text-xs text-slate-700 truncate max-w-[110px]">{page.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-right shrink-0">
                  <span className="font-bold text-slate-800 text-xs">{page.value.toLocaleString('pt-BR')}</span>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                    {page.secondary}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dispositivos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Dispositivos</h3>
            <p className="text-xs text-slate-500 font-medium">Segmentação por tela de acesso.</p>
          </div>
          <div className="space-y-1.5 overflow-y-auto flex-grow pr-1 text-xs">
            {data.channelPerformance.map((device, idx) => {
              const Icon = getDeviceIcon(device.name);
              const value = device.value;
              const themeColors = [
                { stroke: 'text-emerald-500', bg: 'bg-emerald-50 text-emerald-600' },
                { stroke: 'text-blue-500', bg: 'bg-blue-50 text-blue-600' },
                { stroke: 'text-amber-500', bg: 'bg-amber-50 text-amber-600' }
              ];
              const currentTheme = themeColors[idx % themeColors.length];

              return (
                <div key={device.name} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-7 w-7 rounded ${currentTheme.bg} flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 uppercase block leading-tight text-xs truncate">{device.name}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5 truncate">{device.secondary}</span>
                    </div>
                  </div>
                  <div className="relative h-8 w-8 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-200"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={currentTheme.stroke}
                        strokeDasharray={`${value}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[9px] font-black text-slate-800">{value}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cidades Principais (NOVO GRÁFICO 4 PARA DENSIDADE COMPACTA) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Cidades do Público</h3>
            <p className="text-xs text-slate-500 font-medium">Distribuição geográfica.</p>
          </div>
          <div className="space-y-2 overflow-y-auto flex-grow pr-1 text-xs">
            <div className="space-y-2">
              {[
                { city: 'São Paulo', sessions: '142k', share: '34%' },
                { city: 'Rio de Janeiro', sessions: '98k', share: '24%' },
                { city: 'Belo Horizonte', sessions: '62k', share: '15%' },
                { city: 'Curitiba', sessions: '45k', share: '11%' }
              ].map((item) => (
                <div key={item.city} className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-slate-700 font-semibold text-xs">
                    <span className="truncate max-w-[120px]">{item.city}</span>
                    <span className="font-bold text-slate-900">{item.sessions}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Participação: {item.share}</span>
                    <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: item.share }} />
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
        {/* Gráfico 1: Funil de Comportamento GA4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[360px]">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Funil de Comportamento GA4 (E-commerce)</h3>
            <p className="text-xs text-slate-500 font-medium">Taxa de transição e abandono de carrinho no checkout.</p>
          </div>
          
          <FunnelVisual
            steps={behaviorFunnelSteps.map((step, idx) => ({
              ...step,
              width: [100, 76, 52, 38, 25][idx]
            }))}
            accent="#0f766e"
            softAccent="#14b8a6"
          />
          <div className="hidden">
            {behaviorFunnelSteps.map((step, idx) => (
              <div key={step.stage} className="flex items-center gap-3">
                {/* Nome do Estágio */}
                <div className="w-1/3 text-left font-bold text-slate-700 text-xs truncate">
                  {step.stage}
                </div>
                {/* Visualização da Barra do Funil */}
                <div className="flex-grow relative h-6 bg-slate-100 rounded-md overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" 
                    style={{ width: idx === 0 ? '100%' : idx === 1 ? '75%' : idx === 2 ? '40%' : idx === 3 ? '25%' : '18%' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black text-slate-800">
                    <span>{step.desc}</span>
                    <span className="bg-white/80 px-1.5 py-0.5 rounded text-slate-900 border border-slate-200/40">{step.val}</span>
                  </div>
                </div>
                {/* Taxa de Conversão */}
                <div className="w-[70px] text-right text-xs shrink-0 font-extrabold text-emerald-600 bg-emerald-50/50 border border-emerald-100 rounded px-1.5 py-0.5">
                  {idx === 0 ? 'Base' : `${step.rate}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 2: Fluxo de Navegação do Usuário (Sankey Flow Simplificado) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[360px]">
          <div className="mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Fluxo de Navegação (Sankey)</h3>
            <p className="text-xs text-slate-500 font-medium">Origem do tráfego &rarr; Ponto de Entrada &rarr; Resultado Final no site.</p>
          </div>
          
          <div className="flex-1 min-h-0">
            <DreStyleSankey
              ariaLabel="Fluxo de Navegacao Sankey"
              onNodeClick={setSelectedSankeyNode}
              nodes={[
                { key: 'organic', label: 'Organic', value: '35%', detail: '142k sessoes', x: 30, y: 30, w: 116, h: 60, fill: '#10b981' },
                { key: 'paid', label: 'Paid Social', value: '29%', detail: '118k sessoes', x: 30, y: 132, w: 116, h: 60, fill: '#3b82f6' },
                { key: 'home', label: 'Home', value: '45%', detail: 'Entrada maior', x: 250, y: 36, w: 116, h: 60, fill: '#64748b' },
                { key: 'products', label: 'Produtos', value: '35%', detail: 'Interesse alto', x: 250, y: 132, w: 116, h: 60, fill: '#f59e0b' },
                { key: 'checkout', label: 'Checkout', value: '18%', detail: '31,2k inicio', x: 474, y: 58, w: 116, h: 60, fill: '#8b5cf6' },
                { key: 'exit', label: 'Saida', value: '88%', detail: 'Abandono total', x: 690, y: 26, w: 112, h: 60, fill: '#94a3b8' },
                { key: 'purchase', label: 'Compra', value: '12%', detail: '12,8k trans.', x: 690, y: 132, w: 112, h: 60, fill: '#ec4899' }
              ]}
              links={[
                { d: 'M146 58 C190 58 198 66 250 66', width: 28, color: '#34d399' },
                { d: 'M146 162 C190 162 198 162 250 162', width: 24, color: '#60a5fa' },
                { d: 'M366 66 C410 66 422 88 474 88', width: 22, color: '#94a3b8' },
                { d: 'M366 162 C410 162 422 88 474 88', width: 18, color: '#fbbf24' },
                { d: 'M590 88 C632 88 642 56 690 56', width: 30, color: '#cbd5e1' },
                { d: 'M590 98 C632 98 642 162 690 162', width: 14, color: '#f472b6' }
              ]}
            />
          </div>

          {/* Sankey Diagram Overlay */}
          <div className="hidden">
            {/* SVG Background Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
              <path d="M 50 20 C 100 20, 100 20, 150 20" stroke="#10b981" strokeWidth="6" strokeOpacity="0.25" fill="none" />
              <path d="M 50 20 C 100 20, 100 50, 150 50" stroke="#10b981" strokeWidth="3" strokeOpacity="0.15" fill="none" />
              
              <path d="M 50 50 C 100 50, 100 20, 150 20" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.15" fill="none" />
              <path d="M 50 50 C 100 50, 100 50, 150 50" stroke="#f59e0b" strokeWidth="5" strokeOpacity="0.25" fill="none" />
              <path d="M 50 50 C 100 50, 100 80, 150 80" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.15" fill="none" />
              
              <path d="M 50 80 C 100 80, 100 50, 150 50" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.15" fill="none" />
              <path d="M 50 80 C 100 80, 100 80, 150 80" stroke="#3b82f6" strokeWidth="4" strokeOpacity="0.2" fill="none" />

              <path d="M 150 20 C 200 20, 200 40, 250 40" stroke="#64748b" strokeWidth="2" strokeOpacity="0.25" fill="none" />
              <path d="M 150 20 C 200 20, 200 80, 250 80" stroke="#ec4899" strokeWidth="3" strokeOpacity="0.25" fill="none" />
              <path d="M 150 50 C 200 50, 200 40, 250 40" stroke="#64748b" strokeWidth="4" strokeOpacity="0.25" fill="none" />
              <path d="M 150 50 C 200 50, 200 80, 250 80" stroke="#ec4899" strokeWidth="2" strokeOpacity="0.2" fill="none" />
              <path d="M 150 80 C 200 80, 200 40, 250 40" stroke="#64748b" strokeWidth="3" strokeOpacity="0.25" fill="none" />
            </svg>

            {/* Column 1: Sources */}
            <div className="flex flex-col gap-4 z-10 w-[70px]">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black uppercase text-center py-1 rounded shadow-sm">
                Organic
                <span className="block text-[8px] text-emerald-600">35%</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black uppercase text-center py-1 rounded shadow-sm">
                Paid Social
                <span className="block text-[8px] text-amber-600">29%</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-[9px] font-black uppercase text-center py-1 rounded shadow-sm">
                Direct
                <span className="block text-[8px] text-blue-600">20%</span>
              </div>
            </div>

            {/* Column 2: Pages */}
            <div className="flex flex-col gap-4 z-10 w-[70px]">
              <div className="bg-slate-100 border border-slate-300 text-slate-800 text-[9px] font-black uppercase text-center py-1 rounded shadow-sm">
                Home
                <span className="block text-[8px] text-slate-500">45%</span>
              </div>
              <div className="bg-slate-100 border border-slate-300 text-slate-800 text-[9px] font-black uppercase text-center py-1 rounded shadow-sm">
                Produtos
                <span className="block text-[8px] text-slate-500">35%</span>
              </div>
              <div className="bg-slate-100 border border-slate-300 text-slate-800 text-[9px] font-black uppercase text-center py-1 rounded shadow-sm">
                Blog
                <span className="block text-[8px] text-slate-500">20%</span>
              </div>
            </div>

            {/* Column 3: Outcomes */}
            <div className="flex flex-col gap-6 z-10 w-[70px]">
              <div className="bg-slate-200 border border-slate-400 text-slate-800 text-[9px] font-black uppercase text-center py-1 rounded shadow-sm">
                Saída
                <span className="block text-[8px] text-slate-500">88%</span>
              </div>
              <div className="bg-pink-50 border border-pink-200 text-pink-800 text-[9px] font-black uppercase text-center py-1 rounded shadow-sm">
                Compra
                <span className="block text-[8px] text-pink-600">12%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-md p-4 animate-fade-in cursor-pointer"
          onClick={() => setSelectedSankeyNode(null)}
        >
          <div 
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Detalhamento Sankey - GA4</p>
                <h3 className="mt-1 text-md font-extrabold text-slate-900">{selectedDetail.title}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{selectedDetail.value}</p>
              </div>
              <button
                onClick={() => setSelectedSankeyNode(null)}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer flex items-center justify-center shrink-0"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-3">
                {selectedDetail.description}
              </p>
              <div className="overflow-hidden rounded-md border border-slate-200 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Métrica</th>
                      <th className="px-3 py-2 text-right">Valor Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDetail.rows.map(row => (
                      <tr key={row.label}>
                        <td className="px-3 py-2 font-semibold text-slate-700">{row.label}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-950">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
