import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { DollarSign, Clock, Utensils, ThumbsUp, TrendingUp } from 'lucide-react';

const COLORS = ['#ea1d2c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const IFoodTab: React.FC = () => {
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
    const faturamento = 198200 * scale;
    const pedidos = Math.round(4250 * scale);
    const tempoMedio = 28.5; // 28.5 mins
    const avaliacao = 4.87;

    return {
      faturamento,
      pedidos,
      ticketMedio: pedidos > 0 ? faturamento / pedidos : 0,
      tempoMedio,
      avaliacao
    };
  }, [scale]);

  // Sparkline data
  const faturamentoMiniData = useMemo(() => [
    { value: 31000 * scale },
    { value: 38000 * scale },
    { value: 34000 * scale },
    { value: 43000 * scale },
    { value: 39000 * scale },
    { value: 49550 * scale },
  ], [scale]);

  const pedidosMiniData = useMemo(() => [
    { value: 680 * scale },
    { value: 890 * scale },
    { value: 810 * scale },
    { value: 1010 * scale },
    { value: 920 * scale },
    { value: 1062 * scale },
  ], [scale]);

  const tempoEntregaMiniData = useMemo(() => [
    { value: 34.5 },
    { value: 32.8 },
    { value: 31.2 },
    { value: 29.9 },
    { value: 29.1 },
    { value: 28.5 },
  ], []);

  // Row 2 Data: Orders by Hour of Day & Payment Methods
  const hourlyData = useMemo(() => {
    return [
      { name: '11:00', Pedidos: Math.round(210 * scale) },
      { name: '12:00', Pedidos: Math.round(480 * scale) },
      { name: '13:00', Pedidos: Math.round(390 * scale) },
      { name: '14:00', Pedidos: Math.round(150 * scale) },
      { name: '18:00', Pedidos: Math.round(280 * scale) },
      { name: '19:00', Pedidos: Math.round(590 * scale) },
      { name: '20:00', Pedidos: Math.round(620 * scale) },
      { name: '21:00', Pedidos: Math.round(410 * scale) },
      { name: '22:00', Pedidos: Math.round(180 * scale) },
    ];
  }, [scale]);

  const paymentData = useMemo(() => {
    return [
      { name: 'Crédito App', value: Math.round(2210 * scale) },
      { name: 'Pix App', value: Math.round(1540 * scale) },
      { name: 'Vale Refeição', value: Math.round(380 * scale) },
      { name: 'Na Entrega', value: Math.round(120 * scale) },
    ];
  }, [scale]);

  // Row 3 Data: Cancellation Reasons & Logistics Delivery Channels
  const cancellationData = useMemo(() => {
    return [
      { name: 'Atraso Preparo', Qtd: Math.round(32 * scale) },
      { name: 'Desistência', Qtd: Math.round(24 * scale) },
      { name: 'Logística iFood', Qtd: Math.round(18 * scale) },
      { name: 'Erro Endereço', Qtd: Math.round(8 * scale) },
    ];
  }, [scale]);

  const deliveryData = useMemo(() => {
    return [
      { name: 'Sem. 1', iFoodEntrega: Math.round(650 * scale), Proprietario: Math.round(350 * scale) },
      { name: 'Sem. 2', iFoodEntrega: Math.round(820 * scale), Proprietario: Math.round(380 * scale) },
      { name: 'Sem. 3', iFoodEntrega: Math.round(790 * scale), Proprietario: Math.round(410 * scale) },
      { name: 'Sem. 4', iFoodEntrega: Math.round(890 * scale), Proprietario: Math.round(360 * scale) },
    ];
  }, [scale]);

  // Row 4: Top menu items
  const menuItems = useMemo(() => {
    return [
      { id: 'IFD-01', name: 'Super Burger Combo (Batata + Refrigerante)', categoria: 'Combos', vendas: Math.round(1240 * scale), preparo: '12 min', faturamento: 1240 * 45 * scale },
      { id: 'IFD-02', name: 'Smash Burger Duplo Cheddar', categoria: 'Hambúrgueres', vendas: Math.round(980 * scale), preparo: '9 min', faturamento: 980 * 29.9 * scale },
      { id: 'IFD-03', name: 'Porção de Batata Rústica da Casa (Cheddar e Bacon)', categoria: 'Acompanhamentos', vendas: Math.round(760 * scale), preparo: '8 min', faturamento: 760 * 22.9 * scale },
      { id: 'IFD-04', name: 'Combo Casal (2 Burgers + Batata Grande + Bebida)', categoria: 'Combos', vendas: Math.round(520 * scale), preparo: '15 min', faturamento: 520 * 79.9 * scale },
      { id: 'IFD-05', name: 'Milkshake de Ninho com Nutella 500ml', categoria: 'Sobremesas', vendas: Math.round(440 * scale), preparo: '6 min', faturamento: 440 * 18.9 * scale },
    ];
  }, [scale]);

  return (
    <div className="space-y-4">
      {/* COMPACT TOP BAR */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            iFood Delivery Marketplace
            <span className="bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
              iFood API
            </span>
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
            Fluxo de pedidos por horário de pico, tempo de entrega na cozinha e taxa de cancelamento. Clique nos visuais para filtrar.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md px-2.5 py-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span>Pedidos Ativos</span>
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faturamento iFood</span>
            <div className="p-1 rounded bg-red-50 text-[#ea1d2c]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{formatBRL(kpis.faturamento)}</h3>
              <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +10.2%
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={faturamentoMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#ea1d2c" strokeWidth={1.5} fillOpacity={0.08} fill="#ea1d2c" dot={false} isAnimationActive={false} />
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pedidos Concluídos</span>
            <div className="p-1 rounded bg-red-50 text-[#ea1d2c]">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{formatNumber(kpis.pedidos)}</h3>
              <p className="text-[9px] text-slate-500 font-bold">
                T.Médio: <span className="font-extrabold">{formatBRL(kpis.ticketMedio)}</span>
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pedidosMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#ea1d2c" strokeWidth={1.5} fillOpacity={0.08} fill="#ea1d2c" dot={false} isAnimationActive={false} />
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempo de Entrega</span>
            <div className="p-1 rounded bg-red-50 text-[#ea1d2c]">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            <div className="space-y-0.5">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{kpis.tempoMedio} min</h3>
              <p className="text-[9px] text-[#00a650] font-bold">
                Meta: <span className="font-extrabold">&lt; 35 min</span>
              </p>
            </div>
            {/* Sparkline */}
            <div className="h-10 flex-1 max-w-[140px] min-w-[80px] shrink-0 opacity-85">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tempoEntregaMiniData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={1.5} fillOpacity={0.08} fill="#10b981" dot={false} isAnimationActive={false} />
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliação da Loja</span>
            <div className="p-1 rounded bg-red-50 text-[#ea1d2c]">
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5 pb-1">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{kpis.avaliacao} / 5.0</h3>
            <p className="text-[9px] text-emerald-600 font-bold">
              Super Restaurante Ativo
            </p>
          </div>
        </div>
      </div>

      {/* ROW 2: PEAK HOUR PEAKS & PAYMENT PIE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly Peaks BarChart (2/3) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm lg:col-span-2">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            Pedidos por Faixas Horárias (Clique para Filtrar)
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={hourlyData} 
                margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
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
                <YAxis stroke="#94a3b8" fontSize={9.5} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: any) => [value, 'Pedidos']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="Pedidos" fill="#ea1d2c" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="Pedidos" position="top" style={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }} />
                  {hourlyData.map((entry, index) => {
                    const isSelected = searchQuery === entry.name;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.Pedidos > 450 ? '#ea1d2c' : '#f43f5e'} 
                        fillOpacity={searchQuery === '' || isSelected ? 1 : 0.4}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie (1/3) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Meios de Pagamento (Clique para Filtrar)
          </h4>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => {
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
          <div className="grid grid-cols-2 gap-1 text-[9px] font-semibold text-slate-600 pt-2 border-t border-slate-100">
            {paymentData.map((item, index) => {
              const isSelected = searchQuery === item.name;
              return (
                <button 
                  key={index} 
                  onClick={() => setSearchQuery(isSelected ? '' : item.name)}
                  className={`flex items-center space-x-1 px-1 py-0.5 rounded transition-all cursor-pointer ${
                    isSelected ? 'bg-slate-100 font-bold border border-slate-300' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ROW 3: CANCELLATIONS & LOGISTICS MODE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cancellation Reasons Horizontal Bar (1/2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Principais Motivos de Cancelamento (Clique para Filtrar)
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={cancellationData}
                margin={{ top: 10, right: 30, left: 70, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    const labelStr = String(data.activeLabel);
                    setSearchQuery(searchQuery === labelStr ? '' : labelStr);
                  }
                }}
                className="cursor-pointer select-none"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip 
                  formatter={(value: any) => [value, 'Cancelados']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="Qtd" fill="#ea1d2c" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="Qtd" position="right" style={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }} />
                  {cancellationData.map((entry, index) => {
                    const isSelected = searchQuery === entry.name;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#ea1d2c" 
                        fillOpacity={searchQuery === '' || isSelected ? 1 : 0.4}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery Modes Trend Area (1/2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Evolução Logística: Entrega iFood vs Própria
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deliveryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIFood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea1d2c" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ea1d2c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9.5px', paddingTop: '5px' }} />
                <Area type="monotone" dataKey="iFoodEntrega" name="Logística iFood" stroke="#ea1d2c" strokeWidth={2} fillOpacity={1} fill="url(#colorIFood)" />
                <Area type="monotone" dataKey="Proprietario" name="Logística Própria" stroke="#3b82f6" strokeWidth={1.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 4: TOP MENU ITEMS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Performance de Pratos e Combos (Clique na Linha para Filtrar)
            </h4>
          </div>
          <span className="bg-red-50 text-[#ea1d2c] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-red-200/50">
            iFood Realtime
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-100">
                <th className="py-2 px-3">Código Item</th>
                <th className="py-2 px-3">Nome do Item / Combo</th>
                <th className="py-2 px-3">Grupo do Cardápio</th>
                <th className="py-2 px-3 text-right">Pedidos Concluídos</th>
                <th className="py-2 px-3 text-right">Tempo Médio Preparo</th>
                <th className="py-2 px-3 text-right">Receita Direta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {menuItems.map((item) => {
                const isSelected = searchQuery === item.name;
                return (
                  <tr 
                    key={item.id} 
                    onClick={() => setSearchQuery(isSelected ? '' : item.name)}
                    className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${
                      isSelected ? 'bg-red-50/80 hover:bg-red-100/70 font-extrabold border-l-4 border-[#ea1d2c]' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-400">{item.id}</td>
                    <td className="py-2 px-3 font-bold text-slate-900 truncate max-w-[280px]">{item.name}</td>
                    <td className="py-2 px-3">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">{item.categoria}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">{formatNumber(item.vendas)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-600">{item.preparo}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">{formatBRL(item.faturamento)}</td>
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
