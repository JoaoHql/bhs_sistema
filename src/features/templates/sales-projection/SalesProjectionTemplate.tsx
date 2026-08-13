import React, { useMemo, useState } from 'react';
import { 
  Target, TrendingUp, ShoppingCart, Banknote, Users, DollarSign, 
  Download, SlidersHorizontal, Check, ArrowUpDown, ChevronUp, ChevronDown, Info
} from 'lucide-react';
import type { SalesProjectionScenario, SalesProjectionTemplateData } from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const percentage = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(2)}%`;

function arcPoint(cx: number, cy: number, r: number, pct: number): [number, number] {
  const angleDeg = 180 - Math.min(Math.max(pct, 0), 1) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(angleRad), cy - r * Math.sin(angleRad)];
}

function Gauge({
  title, value, destination, currency = false, icon: Icon, iconBg, iconColor
}: {
  title: string; value: number; destination: number | null; currency?: boolean;
  icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  const maximum   = Math.max((destination ?? 0) * 1.3, value * 1.1, 1);
  const valuePct  = Math.min(Math.max(value / maximum, 0), 1);
  const destPct   = destination == null ? 0 : Math.min(Math.max(destination / maximum, 0), 1);
  const format    = (v: number) => currency ? money.format(v) : number.format(v);

  // Cálculo dinâmico do percentual de atingimento do destino/meta
  const completionPct = destination && destination > 0 ? (value / destination) * 100 : null;

  // Definição dinâmica de cores com base no percentual atingido
  let colorStart = '#3b82f6';
  let colorEnd   = '#1d4ed8';
  let statusBadge = { label: '', textClass: '', bgClass: '' };

  if (completionPct != null) {
    if (completionPct >= 100) {
      colorStart = '#10b981'; // Verde (Meta Atingida)
      colorEnd   = '#059669';
      statusBadge = { label: 'Meta Atingida', textClass: 'text-emerald-700 font-bold', bgClass: 'bg-emerald-50 border-emerald-200' };
    } else if (completionPct >= 70) {
      colorStart = '#f59e0b'; // Âmbar/Laranja (Bom andamento)
      colorEnd   = '#d97706';
      statusBadge = { label: `${completionPct.toFixed(1)}% atingido`, textClass: 'text-amber-700 font-bold', bgClass: 'bg-amber-50 border-amber-200' };
    } else {
      colorStart = '#ef4444'; // Vermelho (Abaixo do esperado)
      colorEnd   = '#dc2626';
      statusBadge = { label: `${completionPct.toFixed(1)}% atingido`, textClass: 'text-rose-700 font-bold', bgClass: 'bg-rose-50 border-rose-200' };
    }
  }

  const cx = 140; const cy = 112; const r = 96;
  const SW = 20; // Espessura da barra

  const [vx, vy]  = arcPoint(cx, cy, r, valuePct);
  const [dInX, dInY]   = arcPoint(cx, cy, r - (SW / 2) + 1, destPct);
  const [dOutX, dOutY] = arcPoint(cx, cy, r + (SW / 2) - 1, destPct);

  const gradId = `gg-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl px-4 pt-3 pb-2.5 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-800 leading-tight">{title}</span>
        </div>
        {statusBadge.label && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge.bgClass} ${statusBadge.textClass}`}>
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* Container SVG Ampliado */}
      <div className="relative w-full max-w-[260px] flex flex-col items-center justify-center">
        <svg viewBox="0 0 280 125" className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorStart} />
              <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
          </defs>

          {/* Trilha cinza */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="#f1f5f9" strokeWidth={SW} strokeLinecap="round"
          />

          {/* Arco realizado com cor dinâmica */}
          {valuePct > 0.004 && (
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${vx} ${vy}`}
              fill="none" stroke={`url(#${gradId})`} strokeWidth={SW} strokeLinecap="round"
            />
          )}

          {/* Marcador de destino alinhado milimetricamente à barra */}
          {destPct > 0.004 && destPct <= 1 && (
            <line x1={dInX} y1={dInY} x2={dOutX} y2={dOutY}
              stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
          )}
        </svg>

        {/* Valores Textuais */}
        <div className="absolute bottom-1 flex flex-col items-center w-full px-4">
          <strong className="text-[1.15rem] sm:text-xl font-extrabold text-slate-900 tracking-tight leading-none whitespace-nowrap">
            {format(value)}
          </strong>
          <span className="text-[11px] text-slate-500 font-medium mt-1.5 whitespace-nowrap">
            Destino: {destination == null ? '—' : format(destination)}
          </span>
        </div>
      </div>

      <div className="w-full mt-3 pt-3 border-t border-slate-100 flex justify-center">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
          Máx. Velocímetro: <span className="font-bold text-slate-500">{format(maximum)}</span>
        </p>
      </div>
    </div>
  );
}

function ScenarioInput({
  label, field, value, onChange, icon: Icon, iconBg, iconColor, accentColor
}: {
  label: string; field: keyof SalesProjectionScenario; value: number;
  onChange: SalesProjectionTemplateData['onScenarioChange'];
  icon: React.ElementType; iconBg: string; iconColor: string; accentColor: string;
}) {
  return (
    <label className="flex items-center space-x-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-all cursor-pointer h-full">
      <div className={`w-8 h-8 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-bold text-slate-700 w-44 shrink-0 leading-tight">{label}</span>
      <input
        aria-label={label}
        className={`flex-1 h-2 rounded-full cursor-pointer bg-slate-200 appearance-none range-slider-smooth ${accentColor}`}
        type="range" min="-50" max="100" step="0.1" value={value}
        onChange={(e) => onChange(field, Number(e.target.value))}
      />
      <output className="w-16 text-right text-sm font-extrabold text-slate-900 shrink-0">{value.toFixed(2)}%</output>
    </label>
  );
}

function ProgressBarCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-400">—</span>;
  const pct = Math.min(Math.max(value * 100, 0), 100);
  const isHigh = value >= 1;
  return (
    <div className="flex items-center justify-end space-x-2">
      <span className="font-semibold text-slate-800">{percentage(value)}</span>
      <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
        <div className={`h-full rounded-full transition-all ${isHigh ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const SalesProjectionTemplate: React.FC<{ data: SalesProjectionTemplateData; compact?: boolean }> = ({ data, compact = false }) => {
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    date: true, quantitySold: true, quantityProjected: true, quantityCompletionPct: true,
    revenue: true, revenueProjected: true, revenueCompletionPct: true, goal: true, goalCompletionPct: true,
  });

  // Quantidade de registros visíveis na viewport da tabela ANTES de iniciar a rolagem interna (padrão: 7 registros)
  const [viewReportRows, setViewReportRows] = useState<number>(compact ? 5 : 7);
  const effectiveViewReportRows = compact ? 5 : viewReportRows;

  // Estado de ordenação: null = sem ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Estado de largura das colunas (redimensionáveis)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 130,
    quantitySold: 140,
    quantityProjected: 150,
    quantityCompletionPct: 150,
    revenue: 150,
    revenueProjected: 160,
    revenueCompletionPct: 150,
    goal: 150,
    goalCompletionPct: 150,
  });

  const columnLabels: Record<string, string> = {
    date: 'Data', quantitySold: 'Qtd de Vendas', quantityProjected: 'Qtd. Proj Vendas',
    quantityCompletionPct: '% Qtd Realizada', revenue: 'R$ Faturado', revenueProjected: 'R$ Projetado',
    revenueCompletionPct: '% P. Realizado', goal: 'Meta', goalCompletionPct: '% M. Realizada',
  };

  const summary = useMemo(() => data.rows.reduce((acc, row) => ({
    quantity:          acc.quantity          + (row.quantityProjected == null ? 0 : row.quantitySold),
    quantityProjected: acc.quantityProjected + (row.quantityProjected ?? 0),
    quantityProjectedDays: acc.quantityProjectedDays + (row.quantityProjected == null ? 0 : 1),
    revenue:           acc.revenue           + (row.revenueProjected == null ? 0 : row.revenue),
    revenueProjected:  acc.revenueProjected  + (row.revenueProjected ?? 0),
    revenueProjectedDays: acc.revenueProjectedDays + (row.revenueProjected == null ? 0 : 1),
    goal:              acc.goal              + (row.goal ?? 0),
    goalDays:          acc.goalDays          + (row.goal == null ? 0 : 1),
  }), { quantity: 0, quantityProjected: 0, quantityProjectedDays: 0, revenue: 0, revenueProjected: 0, revenueProjectedDays: 0, goal: 0, goalDays: 0 }), [data.rows]);
  
  const quantityDestination = summary.quantityProjectedDays > 0 ? summary.quantityProjected : null;
  const revenueDestination = summary.revenueProjectedDays > 0 ? summary.revenueProjected : null;

  // TODOS os dias do mês são mantidos intactos (30, 31 ou 28 dias)
  const sortedRows = useMemo(() => {
    let sortableItems = [...data.rows];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof typeof a] ?? null;
        const bVal = b[sortConfig.key as keyof typeof b] ?? null;
        
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data.rows, sortConfig]);

  // Cálculo da altura máxima do container visível (View Report):
  // ~44px para o thead + ~41px por cada linha tr visível antes de rolar
  const tableMaxHeight = useMemo(() => {
    const rowHeight = 41;
    const headerHeight = 44;
    return headerHeight + (effectiveViewReportRows * rowHeight);
  }, [effectiveViewReportRows]);

  // Alterna a ordenação em 3 estados: ASC -> DESC -> NENHUMA
  const requestSort = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      setSortConfig({ key, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ key, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  // Handler para redimensionar colunas arrastando a borda direita
  const handleResizeStart = (e: React.PointerEvent, key: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[key] || 130;

    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Componente de Cabeçalho com suporte a Ordenação em 3 Estados + Redimensionamento por Arraste
  const Th = ({ columnKey, label, align = 'right', infoTooltip }: { columnKey: string, label: string, align?: 'left' | 'right', infoTooltip?: string }) => {
    const isSorted = sortConfig?.key === columnKey;
    const width = columnWidths[columnKey] || 130;
    const bgClass = isSorted ? '!bg-slate-700' : '!bg-[#0f172a] hover:!bg-slate-800';
    
    return (
      <th 
        style={{ width, minWidth: width, maxWidth: width }}
        className={`p-3 font-bold tracking-wider cursor-pointer group transition-colors whitespace-nowrap !text-white relative select-none ${bgClass} ${align === 'left' ? 'text-left' : 'text-right'}`}
        onClick={() => requestSort(columnKey)}
      >
        <div className={`flex items-center ${align === 'left' ? 'justify-start' : 'justify-end'} pr-1`}>
          {infoTooltip && (
            <span className="inline-flex items-center mr-1 text-blue-300 hover:text-blue-100 transition-colors" title={infoTooltip}>
              <Info className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="truncate">{label}</span>
          {isSorted ? (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-400 ml-1 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-400 ml-1 shrink-0" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
          )}
        </div>

        {/* Borda de arraste para redimensionar a coluna */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/60 active:bg-blue-500 z-20"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => handleResizeStart(e, columnKey)}
          title="Arraste para redimensionar a largura"
        />
      </th>
    );
  };

  const handleExportCSV = () => {
    if (!data.rows.length) return;
    const headers = [data.rowLabel ? 'Semana' : 'Data','Qtd de Vendas','Qtd Proj Vendas','% Qtd Realizada','R$ Faturado','R$ Projetado','% P Realizado','Meta','% M Realizada'];
    const rows = sortedRows.map(r => [
      data.rowLabel ? data.rowLabel(r) : r.date, r.quantitySold, r.quantityProjected ?? '',
      r.quantityCompletionPct != null ? (r.quantityCompletionPct * 100).toFixed(2)+'%' : '',
      r.revenue.toFixed(2), r.revenueProjected != null ? r.revenueProjected.toFixed(2) : '',
      r.revenueCompletionPct != null ? (r.revenueCompletionPct * 100).toFixed(2)+'%' : '',
      r.goal != null ? r.goal.toFixed(2) : '',
      r.goalCompletionPct != null ? (r.goalCompletionPct * 100).toFixed(2)+'%' : '',
    ].join(';'));
    const blob = new Blob([[headers.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.setAttribute('download', `projecao_vendas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    // h-full para permitir que o layout acomode a expansão
    <div className="flex flex-col space-y-4 pb-0" aria-busy={data.isRefreshing}>

      {/* Cenários compactos */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ScenarioInput label="Variação na qtd. vendas" field="quantityGrowthPct"
          value={data.scenario.quantityGrowthPct} onChange={data.onScenarioChange}
          icon={ShoppingCart} iconBg="bg-blue-50" iconColor="text-blue-600" accentColor="accent-blue-600" />
        <ScenarioInput label="Variação no ticket médio" field="revenueGrowthPct"
          value={data.scenario.revenueGrowthPct} onChange={data.onScenarioChange}
          icon={Banknote} iconBg="bg-emerald-50" iconColor="text-emerald-600" accentColor="accent-emerald-600" />
        <ScenarioInput label="Variação na meta" field="goalGrowthPct"
          value={data.scenario.goalGrowthPct} onChange={data.onScenarioChange}
          icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600" accentColor="accent-purple-600" />
      </section>

      {/* Velocímetros compactos com cores dinâmicas por percentual */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Gauge title="Quantidade vs Projeção" value={summary.quantity} destination={quantityDestination}
          icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <Gauge title="Faturamento vs Projeção" value={summary.revenue} destination={revenueDestination} currency
          icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <Gauge title="Faturamento vs Meta" value={summary.revenue} destination={summary.goal} currency
          icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </section>

      {/* Tabela de Acompanhamento */}
      <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 border-b border-slate-100 gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">{data.rowLabel ? 'Acompanhamento semanal de Projeções vs Realizados' : 'Acompanhamento detalhado de Projeções vs Realizados'}</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Clique para ordenar | Arraste as bordas das colunas para ajustar a largura.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 relative self-end sm:self-auto">
            {/* Seletor da altura da View Report (Linhas visíveis até rolar) */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium">Linhas visíveis sem rolagem:</span>
              <select
                value={effectiveViewReportRows}
                onChange={(e) => setViewReportRows(Number(e.target.value))}
                className="bg-transparent font-bold text-blue-700 focus:outline-none cursor-pointer text-xs"
              >
                <option value={7}>7 registros (Padrão)</option>
                <option value={15}>15 registros</option>
                <option value={20}>20 registros</option>
                <option value={30}>30 registros (Ver quase tudo)</option>
              </select>
            </div>

            {data.isRefreshing && <span className="text-[11px] font-semibold text-blue-600 animate-pulse">Atualizando…</span>}
            <button onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5 text-slate-500" /><span>Exportar</span>
            </button>
            <button onClick={() => setColumnConfigOpen(!columnConfigOpen)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /><span>Configurar colunas</span>
            </button>
            {columnConfigOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setColumnConfigOpen(false)} />
                <div className="absolute right-0 top-10 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Exibir Colunas</span>
                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {Object.keys(columnLabels).map(k => (
                      <button key={k} onClick={() => setVisibleColumns(prev => ({ ...prev, [k]: !prev[k] }))}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded font-medium">
                        <span>{columnLabels[k]}</span>
                        {visibleColumns[k] && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* View Report da tabela: Altura dinâmica definida pelas opções do usuário (7, 15, 20 ou 30 registros visíveis) */}
        <div 
          className="overflow-auto transition-all duration-300 ease-in-out"
          style={{ maxHeight: `${tableMaxHeight}px` }}
        >
          <table className="w-full text-xs border-collapse">
            <thead className="select-none sticky top-0 z-10 shadow-sm">
              <tr>
                {visibleColumns.date                  && <Th columnKey="date" label={data.rowLabel ? 'Semana' : 'Data'} align="left" />}
                {visibleColumns.quantitySold          && <Th columnKey="quantitySold" label="Qtd de Vendas" />}
                {visibleColumns.quantityProjected     && <Th columnKey="quantityProjected" label="Qtd. Proj Vendas" infoTooltip={data.rowLabel ? 'Projeção semanal somada a partir da média histórica de cada dia da semana para a empresa selecionada.' : 'Projeção calculada com base na média histórica dos mesmos dias da semana (ex: sextas-feiras) para a empresa selecionada.'} />}
                {visibleColumns.quantityCompletionPct && <Th columnKey="quantityCompletionPct" label="% Qtd Realizada" />}
                {visibleColumns.revenue               && <Th columnKey="revenue" label="R$ Faturado" />}
                {visibleColumns.revenueProjected      && <Th columnKey="revenueProjected" label="R$ Projetado" infoTooltip={data.rowLabel ? 'Projeção semanal somada a partir do faturamento médio histórico de cada dia da semana para a empresa selecionada.' : 'Projeção financeira baseada no faturamento médio histórico dos mesmos dias da semana para a empresa selecionada.'} />}
                {visibleColumns.revenueCompletionPct  && <Th columnKey="revenueCompletionPct" label="% P. Realizado" />}
                {visibleColumns.goal                  && <Th columnKey="goal" label="Meta" infoTooltip={data.rowLabel ? 'Meta semanal somada a partir do faturamento realizado nos mesmos dias do ano anterior + variação da meta.' : 'Meta baseada no faturamento realizado no mesmo dia do ano anterior + variação da meta.'} />}
                {visibleColumns.goalCompletionPct     && <Th columnKey="goalCompletionPct" label="% M. Realizada" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* TODOS os dias do mês são mantidos intactos na renderização (30, 31 ou 28 dias) */}
              {sortedRows.map((row) => (
                <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                  {visibleColumns.date                  && <td style={{ width: columnWidths.date, minWidth: columnWidths.date, maxWidth: columnWidths.date }} className="p-3 font-semibold text-slate-700 whitespace-nowrap truncate">{data.rowLabel ? data.rowLabel(row) : new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${row.date}T00:00:00Z`))}</td>}
                  {visibleColumns.quantitySold          && <td style={{ width: columnWidths.quantitySold, minWidth: columnWidths.quantitySold, maxWidth: columnWidths.quantitySold }} className="p-3 text-right text-slate-800 font-medium whitespace-nowrap truncate">{number.format(row.quantitySold)}</td>}
                  {visibleColumns.quantityProjected     && <td style={{ width: columnWidths.quantityProjected, minWidth: columnWidths.quantityProjected, maxWidth: columnWidths.quantityProjected }} className="p-3 text-right font-semibold text-amber-900 bg-amber-50/30 whitespace-nowrap truncate" title={row.quantityProjected == null ? (data.rowLabel ? 'Sem histórico prévio de vendas para os dias desta semana' : 'Sem histórico prévio de vendas para este dia da semana nesta empresa') : (data.rowLabel ? `Projeção semanal: ${number.format(row.quantityProjected)} vendas` : `Média histórica do dia da semana: ${number.format(row.quantityProjected)} vendas`)}>{row.quantityProjected == null ? '—' : number.format(row.quantityProjected)}</td>}
                  {visibleColumns.quantityCompletionPct && <td style={{ width: columnWidths.quantityCompletionPct, minWidth: columnWidths.quantityCompletionPct, maxWidth: columnWidths.quantityCompletionPct }} className="p-3 text-right whitespace-nowrap"><ProgressBarCell value={row.quantityCompletionPct} /></td>}
                  {visibleColumns.revenue               && <td style={{ width: columnWidths.revenue, minWidth: columnWidths.revenue, maxWidth: columnWidths.revenue }} className="p-3 text-right text-slate-800 font-medium whitespace-nowrap truncate">{money.format(row.revenue)}</td>}
                  {visibleColumns.revenueProjected      && <td style={{ width: columnWidths.revenueProjected, minWidth: columnWidths.revenueProjected, maxWidth: columnWidths.revenueProjected }} className="p-3 text-right font-semibold text-amber-900 bg-amber-50/30 whitespace-nowrap truncate" title={row.revenueProjected == null ? (data.rowLabel ? 'Sem histórico prévio de faturamento para os dias desta semana' : 'Sem histórico prévio de vendas para este dia da semana nesta empresa') : (data.rowLabel ? `Projeção semanal: ${money.format(row.revenueProjected)}` : `Média histórica do dia da semana: ${money.format(row.revenueProjected)}`)}>{row.revenueProjected == null ? '—' : money.format(row.revenueProjected)}</td>}
                  {visibleColumns.revenueCompletionPct  && <td style={{ width: columnWidths.revenueCompletionPct, minWidth: columnWidths.revenueCompletionPct, maxWidth: columnWidths.revenueCompletionPct }} className="p-3 text-right whitespace-nowrap"><ProgressBarCell value={row.revenueCompletionPct} /></td>}
                  {visibleColumns.goal                  && <td style={{ width: columnWidths.goal, minWidth: columnWidths.goal, maxWidth: columnWidths.goal }} className="p-3 text-right text-slate-800 font-medium whitespace-nowrap truncate" title={row.goal == null ? (data.rowLabel ? 'Sem histórico equivalente nos dias do ano anterior para esta semana' : 'Sem histórico equivalente no mesmo dia do ano anterior para esta empresa') : (data.rowLabel ? 'Meta semanal baseada no ano anterior' : 'Meta baseada no mesmo dia do ano anterior')}>{row.goal == null ? '—' : money.format(row.goal)}</td>}
                  {visibleColumns.goalCompletionPct     && <td style={{ width: columnWidths.goalCompletionPct, minWidth: columnWidths.goalCompletionPct, maxWidth: columnWidths.goalCompletionPct }} className="p-3 text-right whitespace-nowrap"><ProgressBarCell value={row.goalCompletionPct} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 font-medium shrink-0">
          <span>
            {data.rowLabel ? (
              <>Mostrando todas as <strong className="text-slate-900">{sortedRows.length} semanas do mês</strong></>
            ) : (
              <>Mostrando todos os <strong className="text-slate-900">{sortedRows.length} dias do mês</strong> ({compact ? '5 linhas visíveis antes da rolagem' : `View Report: ${effectiveViewReportRows} registros visíveis antes do scroll`})</>
            )}
          </span>
        </div>

        {summary.goalDays === 0 && (
          <p className="px-5 py-3 text-xs text-amber-800 bg-amber-50 border-t border-amber-100 font-medium shrink-0 rounded-b-xl">
            Não há histórico equivalente no ano anterior para calcular a meta deste mês.
          </p>
        )}
      </section>
    </div>
  );
};
