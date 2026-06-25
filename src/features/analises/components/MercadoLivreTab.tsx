import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, Line, ComposedChart, RadialBarChart, RadialBar, LabelList, AreaChart, Area
} from 'recharts';
import { DollarSign, ShieldCheck, Megaphone, AlertCircle, TrendingUp } from 'lucide-react';

const COLORS = ['#3483fa', '#00a650', '#ffc010', '#b91c1c', '#8b5cf6'];

export const MercadoLivreTab: React.FC = () => {
  const { filteredCustomers, searchQuery, setSearchQuery, clearFilters } = useDashboard();

  // Dynamically calculate scales based on global filters of customers
  const scale = useMemo(() => {
    const totalSales = filteredCustomers.reduce((acc, c) => acc + c.value, 0);
    return Math.max(0.05, totalSales / 5000000);
  }, [filteredCustomers]);

  // Format Helper
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  // KPIs
  const kpis = useMemo(() => {
    const faturamento = 524900 * scale;
    const adsACOS = 14.2; 
    const reclamacoes = 0.32; // 0.32% dispute rate

    return {
      faturamento,
      adsACOS,
      reclamacoes
    };
  }, [scale]);

  // Sparkline data
  const faturamentoMiniData = useMemo(() => [
    { value: 92000 * scale },
    { value: 110000 * scale },
    { value: 104000 * scale },
    { value: 125000 * scale },
    { value: 118000 * scale },
    { value: 131225 * scale },
  ], [scale]);

  const adsMiniData = useMemo(() => [
    { value: 16.5 },
    { value: 15.9 },
    { value: 15.2 },
    { value: 14.8 },
    { value: 14.5 },
    { value: 14.2 },
  ], []);

  const reclamacoesMiniData = useMemo(() => [
    { value: 0.55 },
    { value: 0.49 },
    { value: 0.44 },
    { value: 0.38 },
    { value: 0.35 },
    { value: 0.32 },
  ], []);

  // Row 2 Data: Shipping Methods & Delivery Performance
  const shippingData = useMemo(() => {
    return [
      { name: 'Mercado Envios Full', value: Math.round(5210 * scale) },
      { name: 'Mercado Envios Flex', value: Math.round(1840 * scale) },
      { name: 'Mercado Envios Coleta', value: Math.round(1120 * scale) },
      { name: 'Agências ML', value: Math.round(450 * scale) },
    ];
  }, [scale]);

  const deliveryData = useMemo(() => {
    return [
      { name: 'No Prazo', value: Math.round(8340 * scale), fill: '#00a650' },
      { name: 'Em Trânsito', value: Math.round(210 * scale), fill: '#ffc010' },
      { name: 'Atrasado', value: Math.round(45 * scale), fill: '#b91c1c' },
    ];
  }, [scale]);

  // Row 3 Data: Ads Campanha Evolution & Listing Quality Index
  const adsEvolutionData = useMemo(() => {
    return [
      { name: 'Sem. 1', Investimento: Math.round(4500 * scale), Receita: Math.round(31500 * scale) },
      { name: 'Sem. 2', Investimento: Math.round(6200 * scale), Receita: Math.round(44000 * scale) },
      { name: 'Sem. 3', Investimento: Math.round(5800 * scale), Receita: Math.round(41000 * scale) },
      { name: 'Sem. 4', Investimento: Math.round(6800 * scale), Receita: Math.round(49200 * scale) },
    ];
  }, [scale]);

  const gaugeData = useMemo(() => {
    return [
      { name: 'Qualidade Média', value: 87, fill: '#00a650' }
    ];
  }, []);

  // Row 4: Top Listings
  const listings = useMemo(() => {
    return [
      { id: 'MLB-401239', title: 'Fechadura Eletrônica Digital Intelbras FR101', tipo: 'Clássico', vendas: Math.round(520 * scale), estoqueFull: Math.round(180 * scale), qualidade: '98%', status: 'Exposição Máxima' },
      { id: 'MLB-401584', title: 'Carregador Portátil Power Bank 20000mAh', tipo: 'Premium (Full)', vendas: Math.round(480 * scale), estoqueFull: Math.round(12 * scale), qualidade: '94%', status: 'Alerta Estoque Baixo' },
      { id: 'MLB-401923', title: 'Refletor LED 100W Holofote Bivolt Prova D\'Água', tipo: 'Premium (Full)', vendas: Math.round(390 * scale), estoqueFull: Math.round(95 * scale), qualidade: '89%', status: 'Exposição Média' },
      { id: 'MLB-402049', title: 'Mini Projetor Portátil Smart LED Full HD', tipo: 'Clássico', vendas: Math.round(310 * scale), estoqueFull: Math.round(45 * scale), qualidade: '85%', status: 'Exposição Média' },
      { id: 'MLB-402911', title: 'Kit Teclado e Mouse Sem Fio Office Concept', tipo: 'Premium (Full)', vendas: Math.round(280 * scale), estoqueFull: Math.round(150 * scale), qualidade: '91%', status: 'Exposição Máxima' },
    ];
  }, [scale]);

  return (
    <div className="space-y-4">
      {/* COMPACT TOP BAR */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Mercado Livre Marketplace
            <span className="bg-yellow-400 text-slate-900 text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
              MLB API
            </span>
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
            Acompanhamento logístico do Full, reputação da conta e eficiência do investimento em Mercado Ads. Clique nos visuais para filtrar.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md px-2.5 py-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span>Sincronização Ativa</span>
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faturamento MLB</span>
            <div className="p-1 rounded bg-blue-50 text-[#3483fa]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{formatBRL(kpis.faturamento)}</h3>
              <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> +15.8%
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={faturamentoMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#3483fa" strokeWidth={1.5} fillOpacity={0.08} fill="#3483fa" dot={false} isAnimationActive={false} />
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reputação Geral</span>
            <div className="p-1 rounded bg-green-50 text-[#00a650]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              MercadoLíder Platinum
            </h3>
            <div className="flex space-x-0.5 mt-1.5">
              <span className="h-1.5 w-5 bg-red-100 rounded-l"></span>
              <span className="h-1.5 w-5 bg-orange-100"></span>
              <span className="h-1.5 w-5 bg-yellow-100"></span>
              <span className="h-1.5 w-5 bg-green-200"></span>
              <span className="h-1.5 w-5 bg-green-500 rounded-r shadow-sm"></span>
            </div>
          </div>
        </div>

        <div 
          onClick={clearFilters}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          title="Clique para resetar todos os filtros"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ROAS Publicidade</span>
            <div className="p-1 rounded bg-blue-50 text-[#3483fa]">
              <Megaphone className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{kpis.adsACOS}% ACOS</h3>
              <p className="text-[9px] text-[#00a650] font-bold">
                Retorno: <span className="font-extrabold">7.04x</span>
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adsMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#00a650" strokeWidth={1.5} fillOpacity={0.08} fill="#00a650" dot={false} isAnimationActive={false} />
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reclamações / Disputas</span>
            <div className="p-1 rounded bg-red-50 text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{kpis.reclamacoes}%</h3>
              <p className="text-[9px] text-[#00a650] font-bold">
                Status: <span className="font-extrabold">Excd. (&lt;1%)</span>
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reclamacoesMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={1.5} fillOpacity={0.08} fill="#10b981" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: LOGISTICS DISTRIBUTION & DELIVERY STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shipping Channels Pie (1/2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Modalidades de Envio (Clique para Filtrar)
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
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-slate-600 font-semibold">{item.name}:</span>
                    <span className="text-slate-800 font-extrabold">{formatNumber(item.value)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Delivery Performance BarChart (1/2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Desempenho de Entrega (Clique para Filtrar)
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={deliveryData} 
                margin={{ top: 15, right: 5, left: -25, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    setSearchQuery(searchQuery === labelStr ? '' : labelStr);
                  }
                }}
                className="cursor-pointer select-none"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: any) => [value, 'Entregas']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="value" position="top" style={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }} />
                  {deliveryData.map((entry, index) => {
                    const isSelected = searchQuery === entry.name;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill} 
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

      {/* ROW 3: ADS PERFORMANCE & QUALITY INDEX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Composed Ads Chart (2/3) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm lg:col-span-2">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            Investimento em Mercado Ads vs Receita Gerada (Clique para Filtrar)
          </h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={adsEvolutionData} 
                margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    setSearchQuery(searchQuery === labelStr ? '' : labelStr);
                  }
                }}
                className="cursor-pointer select-none"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9.5} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                  formatter={(value: any, name: any) => [formatBRL(value), name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9.5px', paddingTop: '5px' }} />
                <Bar yAxisId="left" dataKey="Investimento" name="Investido em Ads" fill="#ffc010" radius={[3, 3, 0, 0]} barSize={18}>
                  <LabelList dataKey="Investimento" position="top" formatter={(v: any) => `R$${Math.round(Number(v)/1000)}k`} style={{ fill: '#475569', fontSize: 7.5, fontWeight: 'bold' }} />
                  {adsEvolutionData.map((entry, index) => {
                    const isSelected = searchQuery === entry.name;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#ffc010" 
                        fillOpacity={searchQuery === '' || isSelected ? 1 : 0.4}
                      />
                    );
                  })}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="Receita" name="Receita Vendas Ads" stroke="#3483fa" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Listing Indicator (1/3) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Qualidade Média dos Anúncios
          </h4>
          <div className="h-28 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="65%" 
                outerRadius="85%" 
                barSize={10} 
                data={gaugeData} 
                startAngle={180} 
                endAngle={0}
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute text-center translate-y-3">
              <span className="text-2xl font-black text-slate-800">{gaugeData[0].value}%</span>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Nota Excelente</p>
            </div>
          </div>
          <div className="text-center text-[9px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-lg p-1.5 leading-tight">
            Anúncios com nota superior a 85% possuem preferência e destaque na busca do ML.
          </div>
        </div>
      </div>

      {/* ROW 4: TOP MLB LISTINGS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Performance de Anúncios Ativos (Clique na Linha para Filtrar)
            </h4>
          </div>
          <span className="bg-blue-50 text-[#3483fa] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-blue-200/50">
            MLB Realtime
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-100">
                <th className="py-2 px-3">Código MLB</th>
                <th className="py-2 px-3">Título do Anúncio</th>
                <th className="py-2 px-3">Modalidade</th>
                <th className="py-2 px-3 text-right">Vendas (7 dias)</th>
                <th className="py-2 px-3 text-right">Estoque Full</th>
                <th className="py-2 px-3 text-right">Qualidade</th>
                <th className="py-2 px-3 text-right">Status Exposição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {listings.map((l) => {
                const isSelected = searchQuery === l.title;
                return (
                  <tr 
                    key={l.id} 
                    onClick={() => setSearchQuery(isSelected ? '' : l.title)}
                    className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 hover:bg-blue-100/70 font-extrabold border-l-4 border-[#3483fa]' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-400">{l.id}</td>
                    <td className="py-2 px-3 font-bold text-slate-900 truncate max-w-[280px]">{l.title}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        l.tipo.includes('Full') ? 'bg-yellow-50 text-yellow-700 border border-yellow-200/50' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {l.tipo}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">{formatNumber(l.vendas)}</td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">
                      <span className={l.estoqueFull <= 15 ? 'text-red-500 font-black' : 'text-slate-800'}>
                        {l.estoqueFull} un
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">{l.qualidade}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        l.status.includes('Máxima') ? 'bg-green-50 text-green-700' : 
                        l.status.includes('Estoque') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {l.status}
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
