import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { DollarSign, ShoppingBag, Percent, TrendingUp, AlertTriangle } from 'lucide-react';

const COLORS = ['#ee4d2d', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];

export const ShopeeTab: React.FC = () => {
  const { filteredCustomers, branch, setBranch, searchQuery, setSearchQuery, clearFilters } = useDashboard();

  // Dynamically calculate scales based on global filters of customers
  const scale = useMemo(() => {
    const totalSales = filteredCustomers.reduce((acc, c) => acc + c.value, 0);
    return Math.max(0.05, totalSales / 5000000);
  }, [filteredCustomers]);

  // Format Helpers
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  // KPIs
  const kpiData = useMemo(() => {
    const faturamento = 385400 * scale;
    const pedidos = Math.round(6820 * scale);
    const comissoes = faturamento * 0.18 + (pedidos * 3.0); // 18% commission + R$3 flat fee per order
    const cancelamento = 2.45; // 2.45% rate

    return {
      faturamento,
      pedidos,
      ticketMedio: pedidos > 0 ? faturamento / pedidos : 0,
      comissoes,
      cancelamento
    };
  }, [scale]);

  // Sparkline data
  const faturamentoMiniData = useMemo(() => [
    { value: 65000 * scale },
    { value: 78000 * scale },
    { value: 72000 * scale },
    { value: 89000 * scale },
    { value: 82000 * scale },
    { value: 103400 * scale },
  ], [scale]);

  const pedidosMiniData = useMemo(() => [
    { value: 1100 * scale },
    { value: 1450 * scale },
    { value: 1300 * scale },
    { value: 1620 * scale },
    { value: 1480 * scale },
    { value: 1810 * scale },
  ], [scale]);

  const cancelamentoMiniData = useMemo(() => [
    { value: 3.3 },
    { value: 3.1 },
    { value: 2.9 },
    { value: 2.8 },
    { value: 2.6 },
    { value: 2.45 },
  ], []);

  // Row 2 Data: Weekly Trend & Orders by Region
  const trendData = useMemo(() => {
    return [
      { name: 'Sem. 1', Faturamento: Math.round(82000 * scale), Meta: Math.round(80000 * scale) },
      { name: 'Sem. 2', Faturamento: Math.round(98000 * scale), Meta: Math.round(90000 * scale) },
      { name: 'Sem. 3', Faturamento: Math.round(102000 * scale), Meta: Math.round(100000 * scale) },
      { name: 'Sem. 4', Faturamento: Math.round(103400 * scale), Meta: Math.round(100000 * scale) },
    ];
  }, [scale]);

  const regionData = useMemo(() => {
    return [
      { name: 'Sudeste', Pedidos: Math.round(3820 * scale) },
      { name: 'Sul', Pedidos: Math.round(1450 * scale) },
      { name: 'Nordeste', Pedidos: Math.round(980 * scale) },
      { name: 'Centro-Oeste', Pedidos: Math.round(390 * scale) },
      { name: 'Norte', Pedidos: Math.round(180 * scale) },
    ];
  }, [scale]);

  // Row 3 Data: Shipping Channels & Financial Margin
  const shippingData = useMemo(() => {
    return [
      { name: 'Coleta', value: Math.round(4200 * scale) },
      { name: 'Postagem', value: Math.round(1620 * scale) },
      { name: 'Full Envio', value: Math.round(1000 * scale) },
    ];
  }, [scale]);

  const financialStructureData = useMemo(() => {
    const total = kpiData.faturamento;
    const custoMercadoria = total * 0.45; // 45% COGS
    const taxaComissao = kpiData.comissoes;
    const adsInvestimento = total * 0.08; // 8% Ads Spend
    const lucroLiquido = total - custoMercadoria - taxaComissao - adsInvestimento;

    return [
      { name: 'Custo Merc. (45%)', Valor: Math.round(custoMercadoria) },
      { name: 'Comissão + Taxas', Valor: Math.round(taxaComissao) },
      { name: 'Shopee Ads (8%)', Valor: Math.round(adsInvestimento) },
      { name: 'Lucro Líquido', Valor: Math.round(lucroLiquido) },
    ];
  }, [kpiData]);

  // Row 4: Products list
  const products = useMemo(() => {
    return [
      { id: 'SHP-901', name: 'Suporte de Notebook Ergonômico Alumínio', categoria: 'Informática', visitas: 24500, vendas: Math.round(1450 * scale), conversao: '5.9%', estoque: Math.round(320 * scale) },
      { id: 'SHP-902', name: 'Kit 3 Organizadores de Gavetas Clássico', categoria: 'Organização', visitas: 18900, vendas: Math.round(1120 * scale), conversao: '5.9%', estoque: Math.round(85 * scale) },
      { id: 'SHP-903', name: 'Fone de Ouvido Bluetooth TWS Premium', categoria: 'Eletrônicos', visitas: 35000, vendas: Math.round(980 * scale), conversao: '2.8%', estoque: Math.round(410 * scale) },
      { id: 'SHP-904', name: 'Garrafa Térmica Aço Inox 800ml Black', categoria: 'Esporte & Lazer', visitas: 15400, vendas: Math.round(890 * scale), conversao: '5.7%', estoque: Math.round(12 * scale) },
      { id: 'SHP-905', name: 'Mouse Sem Fio Silencioso Recarregável', categoria: 'Informática', visitas: 22100, vendas: Math.round(850 * scale), conversao: '3.8%', estoque: Math.round(180 * scale) },
    ];
  }, [scale]);

  return (
    <div className="space-y-4">
      {/* COMPACT TOP BAR */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Shopee Marketplace
            <span className="bg-orange-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
              Shopee API
            </span>
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
            Métricas de comissões, frete subsidiado e conversão de cliques por anúncio. Clique nos visuais para filtrar.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md px-2.5 py-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span>Integração Ativa</span>
        </div>
      </div>

      {/* ROW 1: KPI CARDS WITH SPARKLINES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={clearFilters}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          title="Clique para resetar todos os filtros"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Faturamento Shopee</span>
            <div className="p-1 rounded bg-orange-50 text-[#ee4d2d]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{formatBRL(kpiData.faturamento)}</h3>
              <p className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> +12.4%
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={faturamentoMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#ee4d2d" strokeWidth={1.5} fillOpacity={0.08} fill="#ee4d2d" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div 
          onClick={clearFilters}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          title="Clique para resetar todos os filtros"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pedidos Realizados</span>
            <div className="p-1 rounded bg-orange-50 text-[#ee4d2d]">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{formatNumber(kpiData.pedidos)}</h3>
              <p className="text-[9px] text-slate-500 font-bold">
                T.Médio: <span className="font-extrabold">{formatBRL(kpiData.ticketMedio)}</span>
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pedidosMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={0.08} fill="#3b82f6" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div 
          onClick={clearFilters}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          title="Clique para resetar todos os filtros"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Taxas & Comissões</span>
            <div className="p-1 rounded bg-orange-50 text-[#ee4d2d]">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="space-y-0.5 pb-1">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{formatBRL(kpiData.comissoes)}</h3>
            <p className="text-[9px] text-red-500 font-extrabold">
              Taxa Nominal Eficaz: <span className="font-black">22.6%</span>
            </p>
          </div>
        </div>

        <div 
          onClick={clearFilters}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          title="Clique para resetar todos os filtros"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Taxa Cancelamento</span>
            <div className="p-1 rounded bg-orange-50 text-[#ee4d2d]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{kpiData.cancelamento}%</h3>
              <p className="text-[9px] text-emerald-600 font-bold">
                Alvo: <span className="font-extrabold">&lt; 3.0%</span>
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cancelamentoMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={1.5} fillOpacity={0.08} fill="#10b981" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: CHART TREND & GEOGRAPHY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend AreaChart (2/3) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm lg:col-span-2">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            Evolução de Vendas vs Meta Shopee (Semanal)
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFaturamentoShopee" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ee4d2d" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ee4d2d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                  formatter={(value: any) => [formatBRL(value), '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                <Area type="monotone" dataKey="Faturamento" name="Faturamento Realizado" stroke="#ee4d2d" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamentoShopee)" />
                <Area type="monotone" dataKey="Meta" name="Meta Planejada" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Region BarChart (1/3) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            Pedidos por Região (Clique para Filtrar Filial)
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={regionData} 
                margin={{ top: 15, right: 5, left: -25, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    let targetBranch = 'All';
                    if (labelStr === 'Sudeste') targetBranch = 'Filial Sudeste';
                    if (labelStr === 'Sul') targetBranch = 'Filial Sul';
                    if (labelStr === 'Nordeste') targetBranch = 'Filial Nordeste';
                    
                    if (targetBranch !== 'All') {
                      setBranch(branch === targetBranch ? 'All' : targetBranch);
                    }
                  }
                }}
                className="cursor-pointer select-none"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: any) => [value, 'Pedidos']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="Pedidos" fill="#3b82f6" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="Pedidos" position="top" style={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }} />
                  {regionData.map((entry, index) => {
                    let isCellSelected = false;
                    if (entry.name === 'Sudeste' && branch === 'Filial Sudeste') isCellSelected = true;
                    if (entry.name === 'Sul' && branch === 'Filial Sul') isCellSelected = true;
                    if (entry.name === 'Nordeste' && branch === 'Filial Nordeste') isCellSelected = true;

                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isCellSelected ? '#ee4d2d' : (index === 0 ? '#3b82f6' : '#94a3b8')} 
                        fillOpacity={branch === 'All' || isCellSelected ? 1 : 0.5}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 3: LOGISTICS PIE & FINANCIAL MARGIN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shipping Channels Pie (1/2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Canais de Envio (Clique para Filtrar Busca)
          </h4>
          <div className="flex items-center justify-around h-40 gap-2">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shippingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {shippingData.map((entry, index) => {
                      const isSelected = searchQuery === entry.name;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          fillOpacity={searchQuery === '' || isSelected ? 1 : 0.4}
                          onClick={() => setSearchQuery(isSelected ? '' : entry.name)}
                          className="cursor-pointer"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, 'Pedidos']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 text-[10px]">
              {shippingData.map((item, index) => {
                const isSelected = searchQuery === item.name;
                return (
                  <button 
                    key={index} 
                    onClick={() => setSearchQuery(isSelected ? '' : item.name)}
                    className={`flex items-center space-x-1.5 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                      isSelected ? 'bg-slate-100 font-bold border border-slate-300' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-slate-600 font-semibold">{item.name}:</span>
                    <span className="text-slate-800 font-extrabold">{formatNumber(item.value)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cost Margins BarChart Horizontal (1/2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Estrutura Financeira (Clique para Filtrar)
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={financialStructureData}
                margin={{ top: 10, right: 40, left: 40, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    setSearchQuery(searchQuery === labelStr ? '' : labelStr);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `R$${v/1000}k`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip 
                  formatter={(value: any) => [formatBRL(value), '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="Valor" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="Valor" position="right" formatter={(v: any) => `R$${Math.round(Number(v)/1000)}k`} style={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }} />
                  {financialStructureData.map((entry, index) => {
                    const isSelected = searchQuery === entry.name;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.name.includes('Lucro') ? '#10b981' : 
                          entry.name.includes('Comissão') ? '#ee4d2d' : 
                          entry.name.includes('Ads') ? '#f59e0b' : '#64748b'
                        } 
                        fillOpacity={searchQuery === '' || isSelected ? 1 : 0.4}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 4: TOP SELLING PRODUCTS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Produtos Mais Vendidos na Shopee (Clique na Linha para Filtrar Busca)
            </h4>
          </div>
          <span className="bg-orange-50 text-[#ee4d2d] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-orange-200/50">
            Atualizado a cada 1 hora
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-100">
                <th className="py-2 px-3">Cód Anúncio</th>
                <th className="py-2 px-3">Nome do Produto</th>
                <th className="py-2 px-3">Categoria</th>
                <th className="py-2 px-3 text-right">Cliques / Visitas</th>
                <th className="py-2 px-3 text-right">Vendas (Unidades)</th>
                <th className="py-2 px-3 text-right">Conversão</th>
                <th className="py-2 px-3 text-right">Estoque Canal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {products.map((p) => {
                const isSelected = searchQuery === p.name;
                return (
                  <tr 
                    key={p.id} 
                    onClick={() => setSearchQuery(isSelected ? '' : p.name)}
                    className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${
                      isSelected ? 'bg-orange-50/80 hover:bg-orange-100/70 font-extrabold border-l-4 border-[#ee4d2d]' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-400">{p.id}</td>
                    <td className="py-2 px-3 font-bold text-slate-900 truncate max-w-[280px]">{p.name}</td>
                    <td className="py-2 px-3">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">{p.categoria}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">{formatNumber(p.visitas)}</td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">{formatNumber(p.vendas)}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">{p.conversao}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`font-bold ${p.estoque < 30 ? 'text-red-500 font-extrabold' : 'text-slate-800'}`}>
                        {p.estoque} un
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
  );
};
