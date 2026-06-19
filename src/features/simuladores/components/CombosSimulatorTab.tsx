import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Layers, 
  RefreshCw, 
  TrendingUp, 
  Info,
  Sparkles,
  Save,
  Trash2,
  TrendingDown,
  Briefcase,
  Layers2,
  FileSpreadsheet
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  qty: number;
  cost: number;
  price: number;
  markup: number; // em %
}

interface SavedSimulation {
  id: string;
  name: string;
  date: string;
  products: Product[];
}

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Licenciamento Power BI Pro (BHS Premium)', qty: 15, cost: 32.50, price: 49.90, markup: 53.54 },
  { id: '2', name: 'Consultoria BI & Analytics (Horas de Suporte)', qty: 40, cost: 110.00, price: 185.00, markup: 68.18 },
  { id: '3', name: 'Serviço Mensal de Sustentação de Dashboards', qty: 1, cost: 1200.00, price: 1950.00, markup: 62.50 },
];

// Valores base originais para cálculo de variação (Deltas)
const BASELINE_TOTALS = {
  qty: 56,
  cost: 6087.50,
  revenue: 10098.50,
  profit: 4011.00,
  markup: 65.88
};

export const CombosSimulatorTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

  // States para controle de simulação conjunta (lote)
  const [jointMarkup, setJointMarkup] = useState<string>('');
  const [jointPriceDelta, setJointPriceDelta] = useState<number>(0); // em % (-30% a +50%)
  const [jointCostDelta, setJointCostDelta] = useState<number>(0);   // em % (-30% a +50%)
  const [jointQty, setJointQty] = useState<string>('');

  // States para simulações salvas
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [newSimName, setNewSimName] = useState<string>('');

  // Carrega simulações do localStorage na montagem
  useEffect(() => {
    const saved = localStorage.getItem('bhs_saved_simulations');
    if (saved) {
      try {
        setSavedSimulations(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao ler simulações salvas:', e);
      }
    }
  }, []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatPercent = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + '%';
  };

  // Funções de recálculo individual
  const updateProductField = (id: string, field: keyof Product, value: any) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;

      const updated = { ...p, [field]: value };

      // Se alterar preço, recalcula markup
      if (field === 'price') {
        const priceVal = parseFloat(value) || 0;
        updated.markup = updated.cost > 0 ? Math.round(((priceVal - updated.cost) / updated.cost) * 10000) / 100 : 0;
      }
      // Se alterar custo, recalcula markup
      else if (field === 'cost') {
        const costVal = parseFloat(value) || 0;
        updated.markup = costVal > 0 ? Math.round(((updated.price - costVal) / costVal) * 10000) / 100 : 0;
      }
      // Se alterar markup, recalcula preço
      else if (field === 'markup') {
        const markupVal = parseFloat(value) || 0;
        updated.price = Math.round(updated.cost * (1 + markupVal / 100) * 100) / 100;
      }

      return updated;
    }));
  };

  // Aplicação de simulação conjunta
  const applyJointMarkup = (markupValue: number) => {
    setProducts(prev => prev.map(p => {
      const newPrice = Math.round(p.cost * (1 + markupValue / 100) * 100) / 100;
      return {
        ...p,
        markup: markupValue,
        price: newPrice
      };
    }));
  };

  const applyJointPriceDelta = (deltaPercent: number) => {
    setProducts(prev => prev.map((p, idx) => {
      const originalPrice = INITIAL_PRODUCTS[idx].price;
      const newPrice = Math.round(originalPrice * (1 + deltaPercent / 100) * 100) / 100;
      const newMarkup = p.cost > 0 ? Math.round(((newPrice - p.cost) / p.cost) * 10000) / 100 : 0;
      return {
        ...p,
        price: newPrice,
        markup: newMarkup
      };
    }));
  };

  const applyJointCostDelta = (deltaPercent: number) => {
    setProducts(prev => prev.map((p, idx) => {
      const originalCost = INITIAL_PRODUCTS[idx].cost;
      const newCost = Math.round(originalCost * (1 + deltaPercent / 100) * 100) / 100;
      const newMarkup = newCost > 0 ? Math.round(((p.price - newCost) / newCost) * 10000) / 100 : 0;
      return {
        ...p,
        cost: newCost,
        markup: newMarkup
      };
    }));
  };

  const applyJointQty = (qtyValue: number) => {
    setProducts(prev => prev.map(p => ({
      ...p,
      qty: qtyValue
    })));
  };

  // Resetar simulação
  const handleReset = () => {
    setProducts(INITIAL_PRODUCTS);
    setJointMarkup('');
    setJointPriceDelta(0);
    setJointCostDelta(0);
    setJointQty('');
  };

  // Salvar Simulação
  const handleSaveSimulation = () => {
    if (!newSimName.trim()) return;

    const newSim: SavedSimulation = {
      id: Date.now().toString(),
      name: newSimName,
      date: new Date().toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      products: [...products]
    };

    const updated = [newSim, ...savedSimulations];
    setSavedSimulations(updated);
    localStorage.setItem('bhs_saved_simulations', JSON.stringify(updated));
    setNewSimName('');
  };

  // Carregar Simulação
  const handleLoadSimulation = (sim: SavedSimulation) => {
    setProducts(sim.products);
    // Limpa controles em lote para evitar confusão visual
    setJointMarkup('');
    setJointPriceDelta(0);
    setJointCostDelta(0);
    setJointQty('');
  };

  // Excluir Simulação
  const handleDeleteSimulation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSimulations.filter(s => s.id !== id);
    setSavedSimulations(updated);
    localStorage.setItem('bhs_saved_simulations', JSON.stringify(updated));
  };

  // Exportar Excel (CSV)
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "ID;Produto;Quantidade;Custo Unitario (R$);Preco Venda (R$);Markup (%);Total Custo (R$);Total Receita (R$);Margem (R$)\n";
    
    products.forEach(p => {
      const totalCusto = p.qty * p.cost;
      const totalReceita = p.qty * p.price;
      const margem = totalReceita - totalCusto;
      csvContent += `${p.id};"${p.name}";${p.qty};${p.cost.toFixed(2)};${p.price.toFixed(2)};${p.markup.toFixed(2)};${totalCusto.toFixed(2)};${totalReceita.toFixed(2)};${margem.toFixed(2)}\n`;
    });

    csvContent += `\nConsolidado;;${totals.totalQty};${totals.totalCost.toFixed(2)};${totals.totalRevenue.toFixed(2)};${totals.averageMarkup.toFixed(2)};;;${totals.totalProfit.toFixed(2)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Simulacao_Combo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cálculos consolidados do resumo
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalCost = 0;
    let totalRevenue = 0;

    products.forEach(p => {
      totalQty += p.qty;
      totalCost += p.qty * p.cost;
      totalRevenue += p.qty * p.price;
    });

    const totalProfit = totalRevenue - totalCost;
    const averageMarkup = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const comboMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalQty,
      totalCost,
      totalRevenue,
      totalProfit,
      averageMarkup,
      comboMargin
    };
  }, [products]);

  // Deltas em relação ao baseline original do combo
  const deltas = useMemo(() => {
    const revDeltaVal = totals.totalRevenue - BASELINE_TOTALS.revenue;
    const revDeltaPercent = (revDeltaVal / BASELINE_TOTALS.revenue) * 100;

    const profitDeltaVal = totals.totalProfit - BASELINE_TOTALS.profit;
    const profitDeltaPercent = BASELINE_TOTALS.profit > 0 ? (profitDeltaVal / BASELINE_TOTALS.profit) * 100 : 0;

    const markupDeltaVal = totals.averageMarkup - BASELINE_TOTALS.markup;

    return {
      revenue: { value: revDeltaVal, percent: revDeltaPercent },
      profit: { value: profitDeltaVal, percent: profitDeltaPercent },
      markup: { value: markupDeltaVal }
    };
  }, [totals]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 p-6 md:p-8 space-y-6 overflow-y-auto pb-16">
      
      {/* Header do Simulador */}
      <div className="flex justify-between items-start border-b border-slate-200 pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Calculator className="w-5.5 h-5.5 text-blue-600" />
            Simulador de Combos de Produtos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simule combos comerciais com até 3 produtos. Ajuste preços, custos ou markups individualmente ou em lote para visualizar margens consolidadas.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-700 transition-all hover:shadow-sm cursor-pointer"
            title="Exportar dados da simulação em planilha CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Exportar CSV
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-600 transition-all hover:shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Resetar
          </button>
        </div>
      </div>

      {/* SEÇÃO 1: INDICADORES CONSOLIDADOS (DESTAQUE NO TOPO) */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Layers2 className="w-4 h-4 text-blue-600" />
          Resultados Finais da Simulação (Consolidado)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Faturamento Consolidado */}
          <div className="bg-white border-t-4 border-t-blue-500 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Faturamento Bruto</span>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{formatBRL(totals.totalRevenue)}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {deltas.revenue.value >= 0 ? (
                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{formatBRL(deltas.revenue.value)} (+{deltas.revenue.percent.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-red-650 font-bold flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {formatBRL(deltas.revenue.value)} ({deltas.revenue.percent.toFixed(1)}%)
                </span>
              )}
              <span className="text-slate-400 font-medium">vs original</span>
            </div>
          </div>

          {/* Card 2: Custo Consolidado */}
          <div className="bg-white border-t-4 border-t-slate-400 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Custo de Aquisição</span>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{formatBRL(totals.totalCost)}</div>
            <p className="text-[11px] text-slate-400 font-semibold mt-2.5">
              Margem Comercial: <span className="font-extrabold text-slate-600">{totals.comboMargin.toFixed(1)}%</span>
            </p>
          </div>

          {/* Card 3: Lucro Comercial */}
          <div className="bg-white border-t-4 border-t-emerald-500 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Lucro Líquido Estimado</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{formatBRL(totals.totalProfit)}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {deltas.profit.value >= 0 ? (
                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{formatBRL(deltas.profit.value)} (+{deltas.profit.percent.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-red-650 font-bold flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {formatBRL(deltas.profit.value)} ({deltas.profit.percent.toFixed(1)}%)
                </span>
              )}
              <span className="text-slate-400 font-medium">vs original</span>
            </div>
          </div>

          {/* Card 4: Markup Médio */}
          <div className="bg-white border-t-4 border-t-orange-500 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Markup Médio Combo</span>
            <div className="text-2xl font-extrabold text-orange-500 mt-1">{formatPercent(totals.averageMarkup)}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {deltas.markup.value >= 0 ? (
                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{deltas.markup.value.toFixed(2)} pp
                </span>
              ) : (
                <span className="text-red-650 font-bold flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {deltas.markup.value.toFixed(2)} pp
                </span>
              )}
              <span className="text-slate-400 font-medium">vs baseline</span>
            </div>
          </div>

        </div>
      </div>

      {/* SEÇÃO 2: PAINEL DE CONFIGURAÇÕES EM LOTE (ALINHAMENTO CORRIGIDO) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          Simulação Conjunta / Ajustes em Lote
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* Ajustar Markup Alvo */}
          <div className="flex flex-col justify-between h-full min-h-[72px]">
            <label className="text-xs font-bold text-slate-500 h-5 flex items-center">Markup Alvo da Solução (%)</label>
            <div className="h-9 flex items-center">
              <input
                type="number"
                value={jointMarkup}
                onChange={e => {
                  setJointMarkup(e.target.value);
                  if (e.target.value !== '') applyJointMarkup(parseFloat(e.target.value) || 0);
                }}
                placeholder="Ex: 60%"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-bold text-slate-800 h-full"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Define o mesmo markup em todos os itens.</p>
          </div>

          {/* Ajustar Preço Conjunto (Wrapper h-9 flex items-center alinha perfeitamente) */}
          <div className="flex flex-col justify-between h-full min-h-[72px]">
            <div className="flex justify-between items-center h-5">
              <label className="text-xs font-bold text-slate-500">Var. Preço de Venda (%)</label>
              <span className="text-xs font-extrabold text-blue-600">{jointPriceDelta > 0 ? `+${jointPriceDelta}%` : `${jointPriceDelta}%`}</span>
            </div>
            <div className="h-9 flex items-center">
              <input
                type="range"
                min="-30"
                max="50"
                value={jointPriceDelta}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setJointPriceDelta(val);
                  applyJointPriceDelta(val);
                }}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Aplica percentual sobre o valor original.</p>
          </div>

          {/* Ajustar Custo Conjunto */}
          <div className="flex flex-col justify-between h-full min-h-[72px]">
            <div className="flex justify-between items-center h-5">
              <label className="text-xs font-bold text-slate-500">Var. Custo de Aquisição (%)</label>
              <span className="text-xs font-extrabold text-emerald-600">{jointCostDelta > 0 ? `+${jointCostDelta}%` : `${jointCostDelta}%`}</span>
            </div>
            <div className="h-9 flex items-center">
              <input
                type="range"
                min="-30"
                max="50"
                value={jointCostDelta}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setJointCostDelta(val);
                  applyJointCostDelta(val);
                }}
                className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Simula alteração no custo de fornecedores.</p>
          </div>

          {/* Ajustar Quantidades Conjuntas */}
          <div className="flex flex-col justify-between h-full min-h-[72px]">
            <label className="text-xs font-bold text-slate-500 h-5 flex items-center">Definir Qtd. Padrão</label>
            <div className="h-9 flex items-center">
              <input
                type="number"
                value={jointQty}
                onChange={e => {
                  setJointQty(e.target.value);
                  if (e.target.value !== '') applyJointQty(parseInt(e.target.value) || 0);
                }}
                placeholder="Qtd para todos"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-bold text-slate-800 h-full"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Define o mesmo volume para todos os itens.</p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: PRODUTOS SIMULADOS */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="w-4 h-4 text-blue-600" />
          Configuração de Margem por Item do Combo
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {products.map((product, idx) => {
            const itemRevenue = product.qty * product.price;
            const itemCost = product.qty * product.cost;
            const itemMargin = itemRevenue - itemCost;
            const itemMarginPercent = itemRevenue > 0 ? (itemMargin / itemRevenue) * 100 : 0;

            return (
              <div key={product.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:translate-y-[-2px] transition-all">
                
                <div className="space-y-4">
                  {/* Cabeçalho do Produto */}
                  <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Solução {idx + 1}</span>
                      <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-1" title={product.name}>
                        {product.name}
                      </h3>
                    </div>
                    <div className="shrink-0 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[9px] font-bold">
                      #{product.id}
                    </div>
                  </div>

                  {/* Inputs do Simulador */}
                  <div className="space-y-3.5">
                    {/* Campo Quantidade */}
                    <div className="flex justify-between items-center gap-4">
                      <label className="text-xs font-bold text-slate-500">Quantidade</label>
                      <input
                        type="number"
                        value={product.qty}
                        onChange={e => updateProductField(product.id, 'qty', parseInt(e.target.value) || 0)}
                        className="w-28 px-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Campo Custo */}
                    <div className="flex justify-between items-center gap-4">
                      <label className="text-xs font-bold text-slate-500">Custo Unitário</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={product.cost}
                          onChange={e => updateProductField(product.id, 'cost', parseFloat(e.target.value) || 0)}
                          className="w-28 pl-7 pr-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Campo Preço Venda */}
                    <div className="flex justify-between items-center gap-4">
                      <label className="text-xs font-bold text-slate-500">Preço de Venda</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={product.price}
                          onChange={e => updateProductField(product.id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-28 pl-7 pr-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Campo Markup */}
                    <div className="flex justify-between items-center gap-4">
                      <label className="text-xs font-bold text-slate-500">Markup (%)</label>
                      <div className="relative">
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                        <input
                          type="number"
                          step="0.1"
                          value={product.markup}
                          onChange={e => updateProductField(product.id, 'markup', parseFloat(e.target.value) || 0)}
                          className="w-28 pl-2.5 pr-7 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo do Cartão Individual */}
                <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>Margem Bruta (Item):</span>
                    <span className="font-bold text-slate-700">
                      {formatBRL(itemMargin)} ({itemMarginPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>Receita Total:</span>
                    <span className="font-bold text-slate-800">{formatBRL(itemRevenue)}</span>
                  </div>
                  {/* Progresso visual da margem */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        itemMarginPercent >= 40 ? 'bg-emerald-500' : itemMarginPercent >= 20 ? 'bg-amber-500' : 'bg-red-500'
                      }`} 
                      style={{ width: `${Math.min(100, Math.max(0, itemMarginPercent))}%` }}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 4: SALVAR SIMULAÇÃO & HISTÓRICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário para Salvar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 lg:col-span-1">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Save className="w-4 h-4 text-blue-600" />
            Salvar Cenário Atual
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Nome do Cenário</label>
              <input
                type="text"
                value={newSimName}
                onChange={e => setNewSimName(e.target.value)}
                placeholder="Ex: Margem Máxima SP"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSaveSimulation}
              disabled={!newSimName.trim()}
              className="w-full py-2 bg-blue-650 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-100"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Cenário
            </button>
          </div>
        </div>

        {/* Cenários Salvos (Histórico) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            Cenários de Simulação Salvos ({savedSimulations.length})
          </h3>
          
          <div className="overflow-y-auto max-h-[140px] space-y-2 pr-1 scrollbar-thin">
            {savedSimulations.length > 0 ? (
              savedSimulations.map(sim => (
                <div 
                  key={sim.id}
                  onClick={() => handleLoadSimulation(sim)}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-200 rounded-lg flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div>
                    <p className="font-bold text-xs text-slate-700 group-hover:text-blue-700 transition-colors">{sim.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Criado em: {sim.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-200/60 rounded">
                      {sim.products.reduce((acc, curr) => acc + curr.qty, 0)} itens
                    </span>
                    <button
                      onClick={(e) => handleDeleteSimulation(sim.id, e)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      title="Excluir este cenário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                <Info className="w-6 h-6 mb-1 opacity-50 text-slate-450" />
                <p className="text-xs font-semibold">Nenhum cenário salvo ainda.</p>
                <p className="text-[10px] mt-0.5 opacity-75">Preencha o nome acima e salve o cenário atual para comparar depois.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DICA E INSTRUÇÃO DE METODOLOGIA */}
      <div className="flex items-start gap-3 text-[10px] text-slate-500 bg-blue-50/50 p-4 rounded-xl border border-blue-100 relative shrink-0">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-800 text-[11px]">Informação de Metodologia e Impacto</p>
          <p className="leading-relaxed">
            O **Markup Ponderado** do combo é recalculado instantaneamente. Alterações no volume de vendas influenciam diretamente o peso que a margem de cada produto possui no lucro e markup totais do combo. Utilize a **Simulação Conjunta** para avaliar cenários macro de inflação ou reajustes gerais de preços da carteira da BHS.
          </p>
        </div>
      </div>

    </div>
  );
};
