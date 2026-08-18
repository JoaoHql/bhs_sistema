import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { ComboProductOption, ComboSimulationData, SavedComboSimulation } from './types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
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
  FileSpreadsheet,
  Search,
  ChevronDown,
  Check,
  History,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  qty: number;
  cost: number; // custo unitário base
  price: number; // preço unitário base
  simulatedCost?: number | null;
  simulatedPrice?: number | null;
  markup: number; // em %
}

type EditableProductField = 'qty' | 'cost' | 'price' | 'markup';

type SavedSimulation = SavedComboSimulation;

const getEffectiveCost = (product: Product) => product.simulatedCost ?? product.cost;

const getEffectivePrice = (product: Product) => product.simulatedPrice ?? product.price;

const getMarkup = (product: Product) => {
  const cost = getEffectiveCost(product);
  const price = getEffectivePrice(product);
  return cost > 0 ? Math.round(((price - cost) / cost) * 10000) / 100 : 0;
};

const parseSimulationValue = (value: string): number | null => {
  if (value.trim() === '') return null;

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toProduct = (option: ComboProductOption): Product => ({
  id: option.id,
  name: option.name,
  qty: option.defaultQty,
  cost: option.cost,
  price: option.price,
  markup: option.markup ?? (option.cost > 0 ? Math.round(((option.price - option.cost) / option.cost) * 10000) / 100 : 0),
  simulatedCost: null,
  simulatedPrice: null,
});

type ProductSlot = Product | null;

const SLOT_COUNT = 3;

const buildInitialSlots = (initial: ComboProductOption[]): ProductSlot[] => {
  const mapped = initial.map(toProduct);
  const padded: ProductSlot[] = [...mapped];
  while (padded.length < SLOT_COUNT) padded.push(null);
  return padded.slice(0, SLOT_COUNT);
};

const slotsToActiveProducts = (slots: ProductSlot[]): Product[] => slots.filter((slot): slot is Product => slot !== null);

const fromSavedProducts = (saved: SavedSimulation['products']): ProductSlot[] => {
  const mapped: Product[] = saved.map((p) => ({
    id: p.id,
    name: p.name,
    qty: p.qty,
    cost: p.cost,
    price: p.price,
    markup: p.markup,
    simulatedCost: p.simulatedCost ?? null,
    simulatedPrice: p.simulatedPrice ?? null,
  }));
  const padded: ProductSlot[] = [...mapped];
  while (padded.length < SLOT_COUNT) padded.push(null);
  return padded.slice(0, SLOT_COUNT);
};

const readSavedSimulations = (storageKey: string): SavedSimulation[] => {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed as SavedSimulation[] : [];
  } catch {
    return [];
  }
};

interface ComboSimulatorTemplateProps {
  data: ComboSimulationData;
}

export const ComboSimulatorTemplate: React.FC<ComboSimulatorTemplateProps> = ({ data }) => {
  const [products, setProducts] = useState<ProductSlot[]>(() => buildInitialSlots(data.initialProducts));
  const [openProductPickerIndex, setOpenProductPickerIndex] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState<string>('');
  const [remoteSearchOptions, setRemoteSearchOptions] = useState<ComboProductOption[]>([]);

  // States para controle de simulação conjunta (lote)
  const [jointMarkup, setJointMarkup] = useState<string>('');
  const [jointPriceDelta, setJointPriceDelta] = useState<number>(0); // em % (-30% a +50%)
  const [jointCostDelta, setJointCostDelta] = useState<number>(0);   // em % (-30% a +50%)
  const [jointQty, setJointQty] = useState<string>('');

  // States para simulações salvas
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>(
    () => data.persistence?.savedSimulations ?? readSavedSimulations(data.storageKey),
  );
  const [newSimName, setNewSimName] = useState<string>('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isSavingSimulation, setIsSavingSimulation] = useState(false);
  const [isDeletingSimulationId, setIsDeletingSimulationId] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-dismiss do feedback de sucesso após 4 segundos
  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (data.persistence) setSavedSimulations(data.persistence.savedSimulations);
  }, [data.persistence]);

  useEffect(() => {
    if (!data.searchCatalog || openProductPickerIndex === null || !productSearch.trim()) {
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      data.searchCatalog?.(productSearch)
        .then((options) => {
          if (active) setRemoteSearchOptions(options);
        })
        .catch((error) => {
          console.error('Erro ao pesquisar catalogo de produtos:', error);
          if (active) setRemoteSearchOptions([]);
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [data, openProductPickerIndex, productSearch]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatPercent = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + '%';
  };

  const filteredCatalog = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLocaleLowerCase('pt-BR');

    const source = productSearch.trim() && data.searchCatalog ? remoteSearchOptions : data.productCatalog;

    return source.filter(option => {
      const matchesSearch = !normalizedSearch || `${option.id} ${option.sku ?? ''} ${option.company ?? ''} ${option.name}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch);

      return matchesSearch;
    });
  }, [data.productCatalog, data.searchCatalog, productSearch, remoteSearchOptions]);

  const activeProductIds = useMemo(() => new Set(slotsToActiveProducts(products).map(p => p.id)), [products]);

  const getFilteredCatalog = useCallback((currentIndex: number) => {
    const currentId = products[currentIndex]?.id ?? null;
    return filteredCatalog.filter(option => {
      if (currentId && option.id === currentId) return true;
      return !activeProductIds.has(option.id);
    });
  }, [activeProductIds, filteredCatalog, products]);

  const handleOpenProductPicker = (index: number) => {
    setOpenProductPickerIndex(prev => prev === index ? null : index);
    setProductSearch('');
  };

  const handleSelectProduct = (targetIndex: number, selectedProduct: ComboProductOption) => {
    setProducts(prev => prev.map((product, idx) => {
      if (idx !== targetIndex) return product;
      const qty = product?.qty ?? selectedProduct.defaultQty;
      const nextProduct = {
        ...toProduct(selectedProduct),
        qty,
        simulatedCost: null,
        simulatedPrice: null,
      };
      return { ...nextProduct, markup: getMarkup(nextProduct) };
    }));
    setOpenProductPickerIndex(null);
    setProductSearch('');
  };

  const handleClearSlot = (targetIndex: number) => {
    setProducts(prev => prev.map((product, idx) => (idx === targetIndex ? null : product)));
    setOpenProductPickerIndex(null);
    setProductSearch('');
  };

  // Funções de recálculo individual
  const updateProductField = (index: number, field: EditableProductField, value: string) => {
    setProducts(prev => prev.map((p, idx) => {
      if (idx !== index || p === null) return p;

      const parsed = parseSimulationValue(value);
      const updated = { ...p };

      if (field === 'qty') {
        updated.qty = parsed ?? 0;
      } else if (field === 'cost') {
        updated.simulatedCost = parsed;
      } else if (field === 'price') {
        updated.simulatedPrice = parsed;
      } else if (field === 'markup') {
        updated.simulatedPrice = parsed === null
          ? null
          : Math.round(getEffectiveCost(updated) * (1 + parsed / 100) * 100) / 100;
      }

      updated.markup = getMarkup(updated);
      return updated;
    }));
  };

  // Aplicação de simulação conjunta - apenas em slots ativos
  const applyJointMarkup = (markupValue: number) => {
    setProducts(prev => prev.map(p => {
      if (p === null) return p;
      const updated = {
        ...p,
        simulatedPrice: Math.round(getEffectiveCost(p) * (1 + markupValue / 100) * 100) / 100
      };
      return { ...updated, markup: getMarkup(updated) };
    }));
  };

  const applyJointPriceDelta = (deltaPercent: number) => {
    setProducts(prev => prev.map(p => {
      if (p === null) return p;
      const updated = {
        ...p,
        simulatedPrice: deltaPercent === 0
          ? null
          : Math.round(p.price * (1 + deltaPercent / 100) * 100) / 100
      };
      return { ...updated, markup: getMarkup(updated) };
    }));
  };

  const applyJointCostDelta = (deltaPercent: number) => {
    setProducts(prev => prev.map(p => {
      if (p === null) return p;
      const updated = {
        ...p,
        simulatedCost: deltaPercent === 0
          ? null
          : Math.round(p.cost * (1 + deltaPercent / 100) * 100) / 100
      };
      return { ...updated, markup: getMarkup(updated) };
    }));
  };

  const applyJointQty = (qtyValue: number) => {
    setProducts(prev => prev.map(p => {
      if (p === null) return p;
      return { ...p, qty: qtyValue };
    }));
  };

  // Resetar simulação
  const handleReset = () => {
    setProducts(buildInitialSlots(data.initialProducts));
    setJointMarkup('');
    setJointPriceDelta(0);
    setJointCostDelta(0);
    setJointQty('');
    setOpenProductPickerIndex(null);
    setProductSearch('');
  };

  // Salvar Simulação - apenas slots ativos
  const handleSaveSimulation = async () => {
    if (!newSimName.trim()) return;
    const active = slotsToActiveProducts(products);
    if (active.length === 0) {
      setSimulationError('Selecione ao menos um produto para salvar o cenário.');
      return;
    }

    setSimulationError(null);
    setSuccessMessage(null);
    setIsSavingSimulation(true);
    try {
      if (data.persistence) {
        const newSim = await data.persistence.createSavedSimulation({
          name: newSimName.trim(),
          products: active,
        });
        setSavedSimulations(current => [newSim, ...current]);
      } else {
        const newSim: SavedSimulation = {
          id: Date.now().toString(),
          name: newSimName.trim(),
          createdAt: new Date().toISOString(),
          products: [...active],
        };
        const updated = [newSim, ...savedSimulations];
        setSavedSimulations(updated);
        localStorage.setItem(data.storageKey, JSON.stringify(updated));
      }
      setNewSimName('');
      setHistoryOpen(true);
      setSuccessMessage('Cenário salvo com sucesso.');
    } catch {
      setSimulationError('Não foi possível salvar o cenário. Tente novamente.');
    } finally {
      setIsSavingSimulation(false);
    }
  };

  // Carregar Simulação
  const handleLoadSimulation = (sim: SavedSimulation) => {
    setProducts(fromSavedProducts(sim.products));
    // Limpa controles em lote para evitar confusão visual
    setJointMarkup('');
    setJointPriceDelta(0);
    setJointCostDelta(0);
    setJointQty('');
    setOpenProductPickerIndex(null);
    setProductSearch('');
  };

  // Excluir Simulação
  const handleDeleteSimulation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSimulationError(null);
    setSuccessMessage(null);
    setIsDeletingSimulationId(id);
    try {
      if (data.persistence) await data.persistence.deleteSavedSimulation(id);
      const updated = savedSimulations.filter(s => s.id !== id);
      setSavedSimulations(updated);
      if (!data.persistence) localStorage.setItem(data.storageKey, JSON.stringify(updated));
      setSuccessMessage('Cenário excluído com sucesso.');
    } catch {
      setSimulationError('Não foi possível excluir o cenário. Tente novamente.');
    } finally {
      setIsDeletingSimulationId(null);
    }
  };

  const formatSavedSimulationDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
  };

  // Exportar Excel (CSV) - apenas ativos
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "ID;Produto;Quantidade;Custo Unitario (R$);Preco Venda (R$);Markup (%);Total Custo (R$);Total Receita (R$);Margem (R$)\n";
    
    slotsToActiveProducts(products).forEach(p => {
      const cost = getEffectiveCost(p);
      const price = getEffectivePrice(p);
      const markup = getMarkup(p);
      const totalCusto = p.qty * cost;
      const totalReceita = p.qty * price;
      const margem = totalReceita - totalCusto;
      csvContent += `${p.id};"${p.name}";${p.qty};${cost.toFixed(2)};${price.toFixed(2)};${markup.toFixed(2)};${totalCusto.toFixed(2)};${totalReceita.toFixed(2)};${margem.toFixed(2)}\n`;
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

  // Cálculos consolidados do resumo - apenas slots ativos
  const activeProducts = useMemo(() => slotsToActiveProducts(products), [products]);

  const totals = (() => {
    let totalQty = 0;
    let totalCost = 0;
    let totalRevenue = 0;

    activeProducts.forEach(p => {
      totalQty += p.qty;
      totalCost += p.qty * getEffectiveCost(p);
      totalRevenue += p.qty * getEffectivePrice(p);
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
  })();

  const baselineTotals = (() => {
    // Baseline considera apenas produtos ativos (custo/preço base sem simulação)
    let cost = 0;
    let revenue = 0;
    activeProducts.forEach(product => {
      cost += product.qty * product.cost;
      revenue += product.qty * product.price;
    });
    // fallback se nenhum ativo: usa initialProducts base para evitar divisao por zero visual
    if (activeProducts.length === 0) {
      const baselineProducts = data.initialProducts.map(toProduct);
      cost = baselineProducts.reduce((total, product) => total + product.qty * product.cost, 0);
      revenue = baselineProducts.reduce((total, product) => total + product.qty * product.price, 0);
    }
    const profit = revenue - cost;

    return {
      revenue,
      profit,
      markup: cost > 0 ? (profit / cost) * 100 : 0,
    };
  })();

  // Deltas em relação ao baseline original do combo
  const deltas = (() => {
    const revDeltaVal = totals.totalRevenue - baselineTotals.revenue;
    const revDeltaPercent = baselineTotals.revenue > 0 ? (revDeltaVal / baselineTotals.revenue) * 100 : 0;

    const profitDeltaVal = totals.totalProfit - baselineTotals.profit;
    const profitDeltaPercent = baselineTotals.profit > 0 ? (profitDeltaVal / baselineTotals.profit) * 100 : 0;

    const markupDeltaVal = totals.averageMarkup - baselineTotals.markup;

    return {
      revenue: { value: revDeltaVal, percent: revDeltaPercent },
      profit: { value: profitDeltaVal, percent: profitDeltaPercent },
      markup: { value: markupDeltaVal }
    };
  })();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 p-4 md:p-5 space-y-4 overflow-y-auto pb-8">
      
      {/* Header do Simulador */}
      <div className="flex justify-between items-start border-b border-slate-200 pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Calculator className="w-5.5 h-5.5 text-blue-600" />
            Simulador de Combos de Produtos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simule combos com 1 a 3 produtos — deixe blocos vazios em “Nenhum (deixar vazio)” para simular apenas 1 ou 2 itens. Ajuste preços, custos ou markups individualmente ou em lote.
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
            onClick={() => setHistoryOpen(true)}
            disabled={isSavingSimulation || isDeletingSimulationId !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-700 transition-all hover:shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ver histórico completo de cenários salvos"
          >
            <History className="w-4 h-4 text-blue-600" />
            Ver Histórico
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

      {/* Feedback de sucesso / erro nas operações de salvar e excluir */}
      {(successMessage || simulationError) && (
        <div
          role="status"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border transition-all animate-in fade-in ${
            successMessage
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {successMessage ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{successMessage ?? simulationError}</span>
        </div>
      )}

      {/* SEÇÃO 1: INDICADORES CONSOLIDADOS (DESTAQUE NO TOPO) */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Layers2 className="w-4 h-4 text-blue-600" />
          Resultados Finais da Simulação (Consolidado)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
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
        {activeProducts.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Nenhum produto ativo. Selecione ao menos um produto em um dos blocos abaixo para calcular a simulação.</span>
          </div>
        )}
        {activeProducts.length > 0 && activeProducts.length < 3 && (
          <p className="text-[11px] text-slate-500 font-medium">
            Simulando com {activeProducts.length} produto{activeProducts.length === 1 ? '' : 's'} — blocos vazios são ignorados no consolidado.
          </p>
        )}
      </div>

      {/* SEÇÃO 2: PAINEL DE CONFIGURAÇÕES EM LOTE (ALINHAMENTO CORRIGIDO) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          Simulação Conjunta / Ajustes em Lote
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {products.map((product, idx) => {
            if (product === null) {
              const isPickerOpen = openProductPickerIndex === idx;
              return (
                <div key={`empty-${idx}`} className="bg-white border border-dashed border-slate-300 rounded-xl p-5 shadow-sm flex flex-col justify-between opacity-90">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Solução {idx + 1}</span>
                        <h3 className="text-sm font-bold text-slate-400 leading-snug">Vazio — sem produto</h3>
                        <p className="text-[11px] text-slate-400 mt-1">Este bloco não entra na simulação. Selecione um produto para ativar.</p>
                      </div>
                      <div className="shrink-0 px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-400 rounded text-[9px] font-bold">VAZIO</div>
                    </div>
                    <div className="relative">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Produto da Solucao</label>
                      <button
                        type="button"
                        onClick={() => handleOpenProductPicker(idx)}
                        className="w-full min-h-10 px-3 py-2 border border-dashed border-slate-300 hover:border-blue-300 bg-slate-50 hover:bg-white rounded-lg text-left transition-all flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="text-xs font-bold text-slate-400 truncate">— Nenhum (clique para selecionar) —</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isPickerOpen && (
                        <div className="absolute z-40 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                autoFocus
                                type="text"
                                value={productSearch}
                                onChange={event => setProductSearch(event.target.value)}
                                placeholder="Pesquisar produto..."
                                className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin">
                            {getFilteredCatalog(idx).length > 0 ? (
                              getFilteredCatalog(idx).map(option => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(idx, option)}
                                  className="w-full px-3 py-2.5 text-left flex items-start justify-between gap-3 hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-slate-700 truncate">{option.name}</p>
                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Custo {formatBRL(option.cost)} | Venda {formatBRL(option.price)} | Markup {formatPercent(option.cost > 0 ? ((option.price - option.cost) / option.cost) * 100 : 0)}</p>
                                  </div>
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5 opacity-0" />
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-5 text-center"><p className="text-xs font-bold text-slate-400">Nenhum produto encontrado.</p></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3.5 opacity-50 pointer-events-none">
                      <div className="flex justify-between items-center gap-4"><label className="text-xs font-bold text-slate-400">Quantidade</label><span className="w-28 px-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-400 bg-slate-50">—</span></div>
                      <div className="flex justify-between items-center gap-4"><label className="text-xs font-bold text-slate-400">Custo Unitário</label><span className="w-28 px-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-400 bg-slate-50">—</span></div>
                      <div className="flex justify-between items-center gap-4"><label className="text-xs font-bold text-slate-400">Preço de Venda</label><span className="w-28 px-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-400 bg-slate-50">—</span></div>
                      <div className="flex justify-between items-center gap-4"><label className="text-xs font-bold text-slate-400">Markup (%)</label><span className="w-28 px-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-400 bg-slate-50">—</span></div>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 text-center font-medium">Bloco inativo — não contabilizado no consolidado.</p>
                  </div>
                </div>
              );
            }

            const effectiveCost = getEffectiveCost(product);
            const effectivePrice = getEffectivePrice(product);
            const effectiveMarkup = getMarkup(product);
            const itemRevenue = product.qty * effectivePrice;
            const itemCost = product.qty * effectiveCost;
            const itemMargin = itemRevenue - itemCost;
            const itemMarginPercent = itemRevenue > 0 ? (itemMargin / itemRevenue) * 100 : 0;

            return (
              <div key={product.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:translate-y-[-2px] transition-all">
                
                <div className="space-y-4">
                  {/* Cabeçalho do Produto */}
                  <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Solução {idx + 1}</span>
                      <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-1" title={product.name}>
                        {product.name}
                      </h3>
                    </div>
                    <div className="shrink-0 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[9px] font-bold">
                      #{product.id}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Produto da Solucao</label>
                    <button
                      type="button"
                      onClick={() => handleOpenProductPicker(idx)}
                      className="w-full min-h-10 px-3 py-2 border border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-white rounded-lg text-left transition-all flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-700 truncate">{product.name}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openProductPickerIndex === idx ? 'rotate-180' : ''}`} />
                    </button>

                    {openProductPickerIndex === idx && (
                      <div className="absolute z-40 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              autoFocus
                              type="text"
                              value={productSearch}
                              onChange={event => setProductSearch(event.target.value)}
                              placeholder="Pesquisar produto..."
                              className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin">
                          <button
                            type="button"
                            onClick={() => handleClearSlot(idx)}
                            className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-red-50 border-b border-slate-100 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-red-600">— Nenhum (deixar vazio) —</p>
                              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Remove este produto da simulação</p>
                            </div>
                            <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          </button>
                          {getFilteredCatalog(idx).length > 0 ? (
                            getFilteredCatalog(idx).map(option => {
                              const isCurrent = option.id === product.id;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(idx, option)}
                                  className={`w-full px-3 py-2.5 text-left flex items-start justify-between gap-3 hover:bg-blue-50 transition-colors cursor-pointer ${isCurrent ? 'bg-blue-50/70' : ''}`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-slate-700 truncate">{option.name}</p>
                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                      Custo {formatBRL(option.cost)} | Venda {formatBRL(option.price)} | Markup {formatPercent(option.cost > 0 ? ((option.price - option.cost) / option.cost) * 100 : 0)}
                                    </p>
                                  </div>
                                  {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-5 text-center">
                              <p className="text-xs font-bold text-slate-400">Nenhum produto encontrado.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inputs do Simulador */}
                  <div className="space-y-3.5">
                    {/* Campo Quantidade */}
                    <div className="flex justify-between items-center gap-4">
                      <label className="text-xs font-bold text-slate-500">Quantidade</label>
                      <input
                        type="number"
                        value={product.qty}
                        onChange={e => updateProductField(idx, 'qty', e.target.value)}
                        className="w-28 px-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Campo Custo */}
                    <div className="flex justify-between items-center gap-4">
                      <label className="text-xs font-bold text-slate-500">
                        Custo Unitário {product.simulatedCost !== null && product.simulatedCost !== undefined && <span className="text-emerald-600">simulado</span>}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={effectiveCost}
                          onChange={e => updateProductField(idx, 'cost', e.target.value)}
                          className="w-28 pl-7 pr-2.5 py-1 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Campo Preço Venda */}
                    <div className="flex justify-between items-center gap-4">
                      <label className="text-xs font-bold text-slate-500">
                        Preço de Venda {product.simulatedPrice !== null && product.simulatedPrice !== undefined && <span className="text-blue-600">simulado</span>}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={effectivePrice}
                          onChange={e => updateProductField(idx, 'price', e.target.value)}
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
                          value={effectiveMarkup}
                          onChange={e => updateProductField(idx, 'markup', e.target.value)}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
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
              disabled={!newSimName.trim() || isSavingSimulation || isDeletingSimulationId !== null || activeProducts.length === 0}
              title={activeProducts.length === 0 ? 'Selecione ao menos um produto para salvar' : undefined}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-600/20"
            >
              {isSavingSimulation ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSavingSimulation ? 'Salvando...' : 'Salvar Cenário'}
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
                    <p className="text-[10px] text-slate-400 mt-0.5">Criado em: {formatSavedSimulationDate(sim.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-200/60 rounded">
                      {sim.products.reduce((acc, curr) => acc + curr.qty, 0)} itens
                    </span>
                    <button
                      onClick={(e) => handleDeleteSimulation(sim.id, e)}
                      disabled={isDeletingSimulationId !== null || isSavingSimulation}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title={isDeletingSimulationId === sim.id ? 'Excluindo...' : 'Excluir este cenário'}
                    >
                      {isDeletingSimulationId === sim.id ? (
                        <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
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
            O markup ponderado e os resultados do combo sao recalculados conforme custo, preco e volume definidos na simulacao.
          </p>
          <p className="leading-relaxed" hidden>
            O **Markup Ponderado** do combo é recalculado instantaneamente. Alterações no volume de vendas influenciam diretamente o peso que a margem de cada produto possui no lucro e markup totais do combo. Utilize a **Simulação Conjunta** para avaliar cenários macro de inflação ou reajustes gerais de preços da carteira da BHS.
          </p>
        </div>
      </div>

      {/* MODAL: HISTÓRICO COMPLETO DE CENÁRIOS SALVOS */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b border-slate-100 px-6 py-4 pr-14">
            <DialogTitle className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-blue-600" />
              Histórico Completo de Cenários
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500 mt-1">
              {savedSimulations.length} cenário{savedSimulations.length === 1 ? '' : 's'} salvo{savedSimulations.length === 1 ? '' : 's'} · Clique em um cenário para carregá-lo na simulação atual.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin">
            {/* Feedback dentro do modal */}
            {(successMessage || simulationError) && (
              <div
                role="status"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border ${
                  successMessage
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {successMessage ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{successMessage ?? simulationError}</span>
              </div>
            )}

            {savedSimulations.length > 0 ? (
              savedSimulations.map(sim => (
                <div
                  key={sim.id}
                  className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden"
                >
                  {/* Cabeçalho do cenário */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-100">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-700 truncate">{sim.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Criado em: {formatSavedSimulationDate(sim.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded">
                        {sim.products.reduce((acc, curr) => acc + curr.qty, 0)} itens
                      </span>
                      <button
                        onClick={() => { handleLoadSimulation(sim); setHistoryOpen(false); }}
                        disabled={isSavingSimulation || isDeletingSimulationId !== null}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Carregar
                      </button>
                      <button
                        onClick={(e) => handleDeleteSimulation(sim.id, e)}
                        disabled={isDeletingSimulationId !== null || isSavingSimulation}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isDeletingSimulationId === sim.id ? 'Excluindo...' : 'Excluir este cenário'}
                      >
                        {isDeletingSimulationId === sim.id ? (
                          <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Detalhe dos produtos do cenário */}
                  <div className="px-4 py-3 space-y-1.5">
                    {sim.products.map((product) => {
                      const cost = product.simulatedCost ?? product.cost;
                      const price = product.simulatedPrice ?? product.price;
                      const markup = cost > 0 ? ((price - cost) / cost) * 100 : 0;
                      return (
                        <div key={product.id} className="flex items-center justify-between gap-3 text-[11px]">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-600 truncate">{product.name}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-slate-500 font-semibold">
                            <span>Qtd {product.qty}</span>
                            <span>Custo {formatBRL(cost)}</span>
                            <span>Venda {formatBRL(price)}</span>
                            <span className={markup >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                              {formatPercent(markup)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-bold">Nenhum cenário salvo ainda.</p>
                <p className="text-[11px] mt-1 opacity-75">Salve o cenário atual para acompanhar seu histórico aqui.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
