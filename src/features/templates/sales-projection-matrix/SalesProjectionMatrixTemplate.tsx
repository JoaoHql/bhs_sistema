import React, { memo, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Target,
  TrendingUp,
  ShoppingCart,
  Banknote,
  Users,
  DollarSign,
  Download,
  SlidersHorizontal,
  Check,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  Info,
} from 'lucide-react';
import type { SalesProjectionMatrixRow } from '../../../types';
import type { SalesProjectionMatrixTemplateData, SalesProjectionScenario } from './types';

// ---- formatters ----
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const percentage = (value: number | null) => (value == null ? '—' : `${(value * 100).toFixed(2)}%`);

// ---- Gauge (copiado de SalesProjectionTemplate, preserva UX) ----
function arcPoint(cx: number, cy: number, r: number, pct: number): [number, number] {
  const angleDeg = 180 - Math.min(Math.max(pct, 0), 1) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(angleRad), cy - r * Math.sin(angleRad)];
}
function Gauge({
  title,
  value,
  destination,
  currency: isCurrency = false,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: number;
  destination: number | null;
  currency?: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  const maximum = Math.max((destination ?? 0) * 1.3, value * 1.1, 1);
  const valuePct = Math.min(Math.max(value / maximum, 0), 1);
  const destPct = destination == null ? 0 : Math.min(Math.max(destination / maximum, 0), 1);
  const format = (v: number) => (isCurrency ? money.format(v) : number.format(v));
  const completionPct = destination && destination > 0 ? (value / destination) * 100 : null;
  let colorStart = '#3b82f6';
  let colorEnd = '#1d4ed8';
  let statusBadge = { label: '', textClass: '', bgClass: '' };
  if (completionPct != null) {
    if (completionPct >= 100) {
      colorStart = '#10b981';
      colorEnd = '#059669';
      statusBadge = { label: 'Meta Atingida', textClass: 'text-emerald-700 font-bold', bgClass: 'bg-emerald-50 border-emerald-200' };
    } else if (completionPct >= 70) {
      colorStart = '#f59e0b';
      colorEnd = '#d97706';
      statusBadge = { label: `${completionPct.toFixed(1)}% atingido`, textClass: 'text-amber-700 font-bold', bgClass: 'bg-amber-50 border-amber-200' };
    } else {
      colorStart = '#ef4444';
      colorEnd = '#dc2626';
      statusBadge = { label: `${completionPct.toFixed(1)}% atingido`, textClass: 'text-rose-700 font-bold', bgClass: 'bg-rose-50 border-rose-200' };
    }
  }
  const cx = 140;
  const cy = 112;
  const r = 96;
  const SW = 20;
  const [vx, vy] = arcPoint(cx, cy, r, valuePct);
  const [dInX, dInY] = arcPoint(cx, cy, r - SW / 2 + 1, destPct);
  const [dOutX, dOutY] = arcPoint(cx, cy, r + SW / 2 - 1, destPct);
  const gradId = `gg-matrix-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl px-4 pt-3 pb-2.5 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between h-full">
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-800 leading-tight">{title}</span>
        </div>
        {statusBadge.label && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge.bgClass} ${statusBadge.textClass}`}>{statusBadge.label}</span>
        )}
      </div>
      <div className="relative w-full max-w-[260px] flex flex-col items-center justify-center">
        <svg viewBox="0 0 280 125" className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorStart} />
              <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
          </defs>
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#f1f5f9" strokeWidth={SW} strokeLinecap="round" />
          {valuePct > 0.004 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${vx} ${vy}`} fill="none" stroke={`url(#${gradId})`} strokeWidth={SW} strokeLinecap="round" />}
          {destPct > 0.004 && destPct <= 1 && <line x1={dInX} y1={dInY} x2={dOutX} y2={dOutY} stroke="#0f172a" strokeWidth={3.5} strokeLinecap="round" />}
        </svg>
        <div className="absolute bottom-1 flex flex-col items-center w-full px-4">
          <strong className="text-[1.15rem] sm:text-xl font-extrabold text-slate-900 tracking-tight leading-none whitespace-nowrap">{format(value)}</strong>
          <span className="text-[11px] text-slate-500 font-medium mt-1.5 whitespace-nowrap">Destino: {destination == null ? '—' : format(destination)}</span>
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
  label,
  field,
  value,
  onChange,
  icon: Icon,
  iconBg,
  iconColor,
  accentColor,
}: {
  label: string;
  field: keyof SalesProjectionScenario;
  value: number;
  onChange: SalesProjectionMatrixTemplateData['onScenarioChange'];
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}) {
  return (
    <label className="flex items-center space-x-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-all cursor-pointer h-full">
      <div className={`w-8 h-8 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-bold text-slate-700 w-44 shrink-0 leading-tight">{label}</span>
      <input aria-label={label} className={`flex-1 h-2 rounded-full cursor-pointer bg-slate-200 appearance-none range-slider-smooth ${accentColor}`} type="range" min="-50" max="100" step="0.1" value={value} onChange={(e) => onChange(field, Number(e.target.value))} />
      <output className="w-16 text-right text-sm font-extrabold text-slate-900 shrink-0">{value.toFixed(2)}%</output>
    </label>
  );
}
function ProgressBarCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-400">—</span>;
  const pct = Math.min(Math.max(value * 100, 0), 100);
  const isHigh = value >= 1;
  return (
    <div className="flex items-center justify-center space-x-2">
      <span className="font-semibold text-slate-800">{percentage(value)}</span>
      <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
        <div className={`h-full rounded-full transition-all ${isHigh ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---- Tree building (Data diária → Grupo → Produto → Atendente) ----
type TreeNode = {
  id: string;
  label: string;
  level: number; // 0 data,1 grupo,2 produto,3 atendente
  sales_date: string;
  week: number;
  grupo_id?: number;
  produto_id?: number;
  atendente_id?: number;
  quantity_sold: number;
  quantity_projected: number | null;
  quantity_completion_pct: number | null;
  revenue: number;
  revenue_projected: number | null;
  revenue_completion_pct: number | null;
  goal: number | null;
  goal_completion_pct: number | null;
  children: TreeNode[];
};

function formatDateLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}

function buildTree(rows: SalesProjectionMatrixRow[]): TreeNode[] {
  // group by sales_date (dia)
  const byDate = new Map<string, SalesProjectionMatrixRow[]>();
  for (const r of rows) {
    const key = r.sales_date;
    const arr = byDate.get(key) ?? [];
    arr.push(r);
    byDate.set(key, arr);
  }
  const dates: TreeNode[] = [];
  for (const [salesDate, dateRows] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const dow = dateRows[0]?.week ?? 0;
    const dateNode: TreeNode = {
      id: `d:${salesDate}`,
      label: formatDateLabel(salesDate),
      level: 0,
      sales_date: salesDate,
      week: dow,
      quantity_sold: 0,
      quantity_projected: 0,
      quantity_completion_pct: null,
      revenue: 0,
      revenue_projected: 0,
      revenue_completion_pct: null,
      goal: 0,
      goal_completion_pct: null,
      children: [],
    };
    // group by grupo
    const byGrupo = new Map<string, SalesProjectionMatrixRow[]>();
    for (const r of dateRows) {
      const key = `${r.grupo_id}:${r.grupo_label}`;
      const arr = byGrupo.get(key) ?? [];
      arr.push(r);
      byGrupo.set(key, arr);
    }
    for (const [, gRows] of [...byGrupo.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const sample = gRows[0];
      const grupoNode: TreeNode = {
        id: `d:${salesDate}|g:${sample.grupo_id}`,
        label: sample.grupo_label,
        level: 1,
        sales_date: salesDate,
        week: dow,
        grupo_id: sample.grupo_id,
        quantity_sold: 0,
        quantity_projected: 0,
        quantity_completion_pct: null,
        revenue: 0,
        revenue_projected: 0,
        revenue_completion_pct: null,
        goal: 0,
        goal_completion_pct: null,
        children: [],
      };
      const byProduto = new Map<string, SalesProjectionMatrixRow[]>();
      for (const r of gRows) {
        const key = `${r.produto_id}:${r.produto_label}`;
        const arr = byProduto.get(key) ?? [];
        arr.push(r);
        byProduto.set(key, arr);
      }
      for (const [, pRows] of [...byProduto.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const pSample = pRows[0];
        const produtoNode: TreeNode = {
          id: `d:${salesDate}|g:${sample.grupo_id}|p:${pSample.produto_id}`,
          label: pSample.produto_label,
          level: 2,
          sales_date: salesDate,
          week: dow,
          grupo_id: sample.grupo_id,
          produto_id: pSample.produto_id,
          quantity_sold: 0,
          quantity_projected: 0,
          quantity_completion_pct: null,
          revenue: 0,
          revenue_projected: 0,
          revenue_completion_pct: null,
          goal: 0,
          goal_completion_pct: null,
          children: [],
        };
        for (const r of [...pRows].sort((a, b) => a.atendente_label.localeCompare(b.atendente_label))) {
          const leaf: TreeNode = {
            id: `d:${salesDate}|g:${sample.grupo_id}|p:${pSample.produto_id}|a:${r.atendente_id}`,
            label: r.atendente_label,
            level: 3,
            sales_date: r.sales_date,
            week: r.week,
            grupo_id: r.grupo_id,
            produto_id: r.produto_id,
            atendente_id: r.atendente_id,
            quantity_sold: r.quantity_sold,
            quantity_projected: r.quantity_projected,
            quantity_completion_pct: r.quantity_completion_pct,
            revenue: r.revenue,
            revenue_projected: r.revenue_projected,
            revenue_completion_pct: r.revenue_completion_pct,
            goal: r.goal,
            goal_completion_pct: r.goal_completion_pct,
            children: [],
          };
          produtoNode.children.push(leaf);
          // aggregate produto
          produtoNode.quantity_sold += leaf.quantity_sold;
          produtoNode.revenue += leaf.revenue;
          if (leaf.quantity_projected != null) produtoNode.quantity_projected = (produtoNode.quantity_projected ?? 0) + leaf.quantity_projected;
          if (leaf.revenue_projected != null) produtoNode.revenue_projected = (produtoNode.revenue_projected ?? 0) + leaf.revenue_projected;
          if (leaf.goal != null) produtoNode.goal = (produtoNode.goal ?? 0) + leaf.goal;
        }
        // finalize produto pcts (null handling: if sum is 0 -> null)
        if (produtoNode.quantity_projected === 0) produtoNode.quantity_projected = null;
        if (produtoNode.revenue_projected === 0) produtoNode.revenue_projected = null;
        if (produtoNode.goal === 0) produtoNode.goal = null;
        produtoNode.quantity_completion_pct = produtoNode.quantity_projected ? produtoNode.quantity_sold / produtoNode.quantity_projected : null;
        produtoNode.revenue_completion_pct = produtoNode.revenue_projected ? produtoNode.revenue / produtoNode.revenue_projected : null;
        produtoNode.goal_completion_pct = produtoNode.goal ? produtoNode.revenue / produtoNode.goal : null;

        grupoNode.children.push(produtoNode);
        grupoNode.quantity_sold += produtoNode.quantity_sold;
        grupoNode.revenue += produtoNode.revenue;
        if (produtoNode.quantity_projected != null) grupoNode.quantity_projected = (grupoNode.quantity_projected ?? 0) + produtoNode.quantity_projected;
        if (produtoNode.revenue_projected != null) grupoNode.revenue_projected = (grupoNode.revenue_projected ?? 0) + produtoNode.revenue_projected;
        if (produtoNode.goal != null) grupoNode.goal = (grupoNode.goal ?? 0) + produtoNode.goal;
      }
      if (grupoNode.quantity_projected === 0) grupoNode.quantity_projected = null;
      if (grupoNode.revenue_projected === 0) grupoNode.revenue_projected = null;
      if (grupoNode.goal === 0) grupoNode.goal = null;
      grupoNode.quantity_completion_pct = grupoNode.quantity_projected ? grupoNode.quantity_sold / grupoNode.quantity_projected : null;
      grupoNode.revenue_completion_pct = grupoNode.revenue_projected ? grupoNode.revenue / grupoNode.revenue_projected : null;
      grupoNode.goal_completion_pct = grupoNode.goal ? grupoNode.revenue / grupoNode.goal : null;

      dateNode.children.push(grupoNode);
      dateNode.quantity_sold += grupoNode.quantity_sold;
      dateNode.revenue += grupoNode.revenue;
      if (grupoNode.quantity_projected != null) dateNode.quantity_projected = (dateNode.quantity_projected ?? 0) + grupoNode.quantity_projected;
      if (grupoNode.revenue_projected != null) dateNode.revenue_projected = (dateNode.revenue_projected ?? 0) + grupoNode.revenue_projected;
      if (grupoNode.goal != null) dateNode.goal = (dateNode.goal ?? 0) + grupoNode.goal;
    }
    if (dateNode.quantity_projected === 0) dateNode.quantity_projected = null;
    if (dateNode.revenue_projected === 0) dateNode.revenue_projected = null;
    if (dateNode.goal === 0) dateNode.goal = null;
    dateNode.quantity_completion_pct = dateNode.quantity_projected ? dateNode.quantity_sold / dateNode.quantity_projected : null;
    dateNode.revenue_completion_pct = dateNode.revenue_projected ? dateNode.revenue / dateNode.revenue_projected : null;
    dateNode.goal_completion_pct = dateNode.goal ? dateNode.revenue / dateNode.goal : null;
    dates.push(dateNode);
  }
  return dates;
}

function flattenVisible(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const out: TreeNode[] = [];
  function walk(list: TreeNode[]) {
    for (const n of list) {
      out.push(n);
      if (n.children.length > 0 && expanded.has(n.id)) walk(n.children);
    }
  }
  walk(nodes);
  return out;
}

// ---- MatrixTemplate ----
const columnLabels: Record<string, string> = { date: 'Nível (Data → Grupo → Produto → Atendente)', quantitySold: 'Qtd de Vendas', quantityProjected: 'Qtd. Projetada', quantityCompletionPct: '% Quantidade', revenue: 'R$ Faturado', revenueProjected: 'R$ Projetado', revenueCompletionPct: '% Projetado', goal: 'Meta', goalCompletionPct: '% Meta' };

const MatrixRow = memo(function MatrixRow({ node, isExpanded, columnWidths, visibleColumns, onToggle, lazy }: { node: TreeNode; isExpanded: boolean; columnWidths: Record<string, number>; visibleColumns: Record<string, boolean>; onToggle: (id: string) => void; lazy: boolean }) {
  const isExpandable = node.children.length > 0;
  const indent = node.level * 16;
  const lazyStyle = lazy ? { contentVisibility: 'auto', containIntrinsicSize: 'auto 41px' } as React.CSSProperties : undefined;
  return (
    <tr style={lazyStyle} className={`transition-colors ${node.level === 0 ? 'bg-slate-50/60 font-semibold' : 'hover:bg-slate-50/80'}`}>
      {visibleColumns.date && (
        <td data-col="date" style={{ width: columnWidths.date, minWidth: columnWidths.date, maxWidth: columnWidths.date, position: 'sticky', left: 0, zIndex: 20 }} className={`p-2.5 whitespace-nowrap border-b border-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.06)] ${node.level === 0 ? 'bg-slate-50' : 'bg-white'}`}>
          <div className="flex items-center" style={{ paddingLeft: indent }}>
            {isExpandable ? (
              <button onClick={() => onToggle(node.id)} className="mr-1.5 p-0.5 rounded hover:bg-slate-200 text-slate-600 shrink-0">
                {isExpanded ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <span className={`truncate ${node.level === 0 ? 'text-slate-900 font-bold' : node.level === 1 ? 'text-slate-800 font-semibold' : 'text-slate-700'}`}>{node.label}</span>
            {node.level === 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold">{node.children.length} grupos</span>}
          </div>
        </td>
      )}
      {visibleColumns.quantitySold && <td data-col="quantitySold" style={{ width: columnWidths.quantitySold, minWidth: columnWidths.quantitySold, maxWidth: columnWidths.quantitySold }} className="p-2.5 text-right font-medium whitespace-nowrap truncate border-b border-slate-100">{number.format(node.quantity_sold)}</td>}
      {visibleColumns.quantityProjected && <td data-col="quantityProjected" style={{ width: columnWidths.quantityProjected, minWidth: columnWidths.quantityProjected, maxWidth: columnWidths.quantityProjected }} className="p-2.5 text-right font-semibold text-amber-900 bg-amber-50/30 whitespace-nowrap truncate border-b border-slate-100">{node.quantity_projected == null ? '—' : number.format(node.quantity_projected)}</td>}
      {visibleColumns.quantityCompletionPct && <td data-col="quantityCompletionPct" style={{ width: columnWidths.quantityCompletionPct, minWidth: columnWidths.quantityCompletionPct, maxWidth: columnWidths.quantityCompletionPct }} className="p-2.5 text-center whitespace-nowrap border-b border-slate-100"><ProgressBarCell value={node.quantity_completion_pct} /></td>}
      {visibleColumns.revenue && <td data-col="revenue" style={{ width: columnWidths.revenue, minWidth: columnWidths.revenue, maxWidth: columnWidths.revenue }} className="p-2.5 text-right font-medium whitespace-nowrap truncate border-b border-slate-100">{money.format(node.revenue)}</td>}
      {visibleColumns.revenueProjected && <td data-col="revenueProjected" style={{ width: columnWidths.revenueProjected, minWidth: columnWidths.revenueProjected, maxWidth: columnWidths.revenueProjected }} className="p-2.5 text-right font-semibold text-amber-900 bg-amber-50/30 whitespace-nowrap truncate border-b border-slate-100">{node.revenue_projected == null ? '—' : money.format(node.revenue_projected)}</td>}
      {visibleColumns.revenueCompletionPct && <td data-col="revenueCompletionPct" style={{ width: columnWidths.revenueCompletionPct, minWidth: columnWidths.revenueCompletionPct, maxWidth: columnWidths.revenueCompletionPct }} className="p-2.5 text-center whitespace-nowrap border-b border-slate-100"><ProgressBarCell value={node.revenue_completion_pct} /></td>}
      {visibleColumns.goal && <td data-col="goal" style={{ width: columnWidths.goal, minWidth: columnWidths.goal, maxWidth: columnWidths.goal }} className="p-2.5 text-right font-medium whitespace-nowrap truncate border-b border-slate-100">{node.goal == null ? '—' : money.format(node.goal)}</td>}
      {visibleColumns.goalCompletionPct && <td data-col="goalCompletionPct" style={{ width: columnWidths.goalCompletionPct, minWidth: columnWidths.goalCompletionPct, maxWidth: columnWidths.goalCompletionPct }} className="p-2.5 text-center whitespace-nowrap border-b border-slate-100"><ProgressBarCell value={node.goal_completion_pct} /></td>}
    </tr>
  );
});

export const SalesProjectionMatrixTemplate: React.FC<{ data: SalesProjectionMatrixTemplateData }> = ({ data }) => {
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    date: true, quantitySold: true, quantityProjected: true, quantityCompletionPct: true, revenue: true, revenueProjected: true, revenueCompletionPct: true, goal: true, goalCompletionPct: true,
  });
  const [viewReportRows, setViewReportRows] = useState(15);
  const [page, setPage] = useState(0);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 260, quantitySold: 120, quantityProjected: 150, quantityCompletionPct: 150, revenue: 130, revenueProjected: 150, revenueCompletionPct: 150, goal: 130, goalCompletionPct: 150,
  });

  const tree = useMemo(() => buildTree(data.matrixRows), [data.matrixRows]);
  const totalPages = Math.max(1, Math.ceil(tree.length / viewReportRows));
  const safePage = Math.min(page, totalPages - 1);
  const firstDateId = tree[0]?.id;
  useEffect(() => { setPage(0); }, [firstDateId]);
  useEffect(() => { if (page > totalPages - 1) setPage(totalPages - 1); }, [page, totalPages]);
  const expandedStorageKey = `${data.storageKey}:matrix-expanded`;
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(expandedStorageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed.filter((item): item is string => typeof item === 'string'));
      }
    } catch { /* Preferencia local invalida e ignorada. */ }
    return new Set();
  });
  useEffect(() => {
    try { localStorage.setItem(expandedStorageKey, JSON.stringify([...expanded])); } catch { /* Persistencia opcional. */ }
  }, [expanded, expandedStorageKey]);

  const visibleNodes = useMemo(() => flattenVisible(tree.slice(safePage * viewReportRows, (safePage + 1) * viewReportRows), expanded), [tree, expanded, safePage, viewReportRows]);
  const tableMaxHeight = useMemo(() => 620, []);
  const [isExpanding, startExpandTransition] = useTransition();

  const toggle = (id: string) => startExpandTransition(() => setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }));
  const expandAll = () => startExpandTransition(() => setExpanded((prev) => { const next = new Set(prev); for (const dateNode of tree) next.add(dateNode.id); return next; }));
  const collapseAll = () => startExpandTransition(() => setExpanded(new Set()));

  // summary for gauges: total do mês
  const summary = useMemo(() => {
    const agg = tree.reduce((acc, w) => ({ quantity: acc.quantity + w.quantity_sold, quantityProjected: acc.quantityProjected + (w.quantity_projected ?? 0), revenue: acc.revenue + w.revenue, revenueProjected: acc.revenueProjected + (w.revenue_projected ?? 0), goal: acc.goal + (w.goal ?? 0), hasProj: acc.hasProj || w.quantity_projected != null, hasRevProj: acc.hasRevProj || w.revenue_projected != null, hasGoal: acc.hasGoal || w.goal != null }), { quantity: 0, quantityProjected: 0, revenue: 0, revenueProjected: 0, goal: 0, hasProj: false, hasRevProj: false, hasGoal: false });
    return { quantity: agg.quantity, quantityProjected: agg.hasProj ? agg.quantityProjected : null, revenue: agg.revenue, revenueProjected: agg.hasRevProj ? agg.revenueProjected : null, goal: agg.hasGoal ? agg.goal : null };
  }, [tree]);

  const tableRef = useRef<HTMLTableElement | null>(null);

  const handleResizeStart = (e: React.PointerEvent, key: string) => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[key] || 130;
    const table = tableRef.current;
    const affected: Element[] = table ? [...table.querySelectorAll(`[data-col="${key}"]`) as unknown as Element[]] : [];
    const updateWidth = (width: number) => {
      for (const cell of affected) {
        (cell as HTMLElement).style.width = `${width}px`;
        (cell as HTMLElement).style.minWidth = `${width}px`;
        (cell as HTMLElement).style.maxWidth = `${width}px`;
      }
    };
    const onPointerMove = (ev: globalThis.PointerEvent) => {
      const deltaX = ev.clientX - startX;
      updateWidth(Math.max(80, startWidth + deltaX));
    };
    const onPointerUp = (ev: globalThis.PointerEvent) => {
      const finalWidth = Math.max(80, startWidth + (ev.clientX - startX));
      updateWidth(finalWidth);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setColumnWidths((prev) => ({ ...prev, [key]: finalWidth }));
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };
  const Th = ({ columnKey, label, align = 'right', infoTooltip, stickyLeft = false }: { columnKey: string; label: string; align?: 'left' | 'right' | 'center'; infoTooltip?: string; stickyLeft?: boolean }) => {
    const width = columnWidths[columnKey] || 130;
    return (
      <th data-col={columnKey} style={{ width, minWidth: width, maxWidth: width, ...(stickyLeft ? { position: 'sticky', left: 0, zIndex: 30 } : {}) }} className={`p-3 font-bold tracking-wider whitespace-nowrap !text-white relative select-none !bg-[#0f172a] sticky top-0 z-10 shadow-sm ${stickyLeft ? 'shadow-[2px_0_4px_rgba(0,0,0,0.25)]' : ''} ${align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right'}`}>
        <div className={`flex items-center ${align === 'center' ? 'justify-center' : align === 'left' ? 'justify-start' : 'justify-end'} pr-1`}>
          {infoTooltip && <span className="inline-flex items-center mr-1 text-blue-300" title={infoTooltip}><Info className="w-3.5 h-3.5" /></span>}
          <span className="truncate">{label}</span>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/60 active:bg-blue-500 z-20" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => handleResizeStart(e, columnKey)} />
      </th>
    );
  };

  const tableMinWidth = useMemo(
    () => Object.keys(columnLabels).filter((key) => visibleColumns[key]).reduce((total, key) => total + (columnWidths[key] ?? 130), 0),
    [columnWidths, visibleColumns],
  );

  const handleExportCSV = () => {
    if (!data.matrixRows.length && !visibleNodes.length) return;
    const headers = ['Data', 'Grupo', 'Produto', 'Atendente', 'Qtd de Vendas', 'Qtd Projetada', '% Quantidade', 'R$ Faturado', 'R$ Projetado', '% Projetado', 'Meta', '% Meta'];
    const leafRows = data.matrixRows.map((r) => [r.sales_date, r.grupo_label, r.produto_label, r.atendente_label, String(r.quantity_sold), r.quantity_projected ?? '', r.quantity_completion_pct != null ? (r.quantity_completion_pct*100).toFixed(2)+'%' : '', r.revenue.toFixed(2), r.revenue_projected != null ? r.revenue_projected.toFixed(2) : '', r.revenue_completion_pct != null ? (r.revenue_completion_pct*100).toFixed(2)+'%' : '', r.goal != null ? r.goal.toFixed(2) : '', r.goal_completion_pct != null ? (r.goal_completion_pct*100).toFixed(2)+'%' : ''].join(';'));
    const blobRows = leafRows;
    const blob = new Blob([[headers.join(';'), ...blobRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.setAttribute('download', `projecao_matriz_${new Date().toISOString().slice(0,10)}.csv`); document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col space-y-4 pb-5" aria-busy={data.isRefreshing}>
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ScenarioInput label="Variação na qtd. vendas" field="quantityGrowthPct" value={data.scenario.quantityGrowthPct} onChange={data.onScenarioChange} icon={ShoppingCart} iconBg="bg-blue-50" iconColor="text-blue-600" accentColor="accent-blue-600" />
        <ScenarioInput label="Variação no ticket médio" field="revenueGrowthPct" value={data.scenario.revenueGrowthPct} onChange={data.onScenarioChange} icon={Banknote} iconBg="bg-emerald-50" iconColor="text-emerald-600" accentColor="accent-emerald-600" />
        <ScenarioInput label="Variação na meta" field="goalGrowthPct" value={data.scenario.goalGrowthPct} onChange={data.onScenarioChange} icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600" accentColor="accent-purple-600" />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Gauge title="Quantidade vs Projeção" value={summary.quantity} destination={summary.quantityProjected} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <Gauge title="Faturamento vs Projeção" value={summary.revenue} destination={summary.revenueProjected} currency icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <Gauge title="Faturamento vs Meta" value={summary.revenue} destination={summary.goal} currency icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </section>

      <section className="bg-white border border-slate-200/80 rounded-xl shadow-sm flex flex-col overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 border-b border-slate-100 gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><TrendingUp className="w-4 h-4" /></div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">Matriz 4 níveis — Data → Grupo → Produto → Atendente</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Linhas por dia do mês com expansão em 4 níveis. Projeção SBM por dia da semana filtrada por célula.</p>
              {isExpanding && <p className="text-[11px] font-semibold text-blue-600 animate-pulse mt-0.5">Expandindo…</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2 relative self-end sm:self-auto">
            <div className="hidden sm:flex items-center space-x-1">
              <button onClick={expandAll} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">Expandir datas</button>
              <button onClick={collapseAll} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">Recolher tudo</button>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
              <span className="text-[11px] text-slate-500 font-medium">Datas por página:</span>
              <select value={viewReportRows} onChange={(e) => { setViewReportRows(Number(e.target.value)); setPage(0); }} className="bg-transparent font-bold text-blue-700 focus:outline-none cursor-pointer text-xs">
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
            {data.isRefreshing && <span className="text-[11px] font-semibold text-blue-600 animate-pulse">Atualizando…</span>}
            <button onClick={handleExportCSV} className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200"><Download className="w-3.5 h-3.5 text-slate-500" /><span>Exportar</span></button>
            <button onClick={() => setColumnConfigOpen(!columnConfigOpen)} className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200"><SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /><span>Colunas</span></button>
            {columnConfigOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setColumnConfigOpen(false)} />
                <div className="absolute right-0 top-10 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Exibir Colunas</span>
                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {Object.keys(columnLabels).map((k) => (
                      <button key={k} onClick={() => setVisibleColumns((prev) => ({ ...prev, [k]: !prev[k] }))} className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded font-medium">
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

        <div className="overflow-x-auto overflow-y-auto data-table-scroll transition-all duration-300 ease-in-out" style={{ maxHeight: `${tableMaxHeight}px` }}>
          <table ref={tableRef} className="text-xs border-separate" style={{ minWidth: `${tableMinWidth}px`, width: 'max-content', borderSpacing: 0 }}>
            <thead className="select-none">
              <tr>
                {visibleColumns.date && <Th columnKey="date" label={columnLabels.date} align="left" stickyLeft />}
                {visibleColumns.quantitySold && <Th columnKey="quantitySold" label={columnLabels.quantitySold} />}
                {visibleColumns.quantityProjected && <Th columnKey="quantityProjected" label={columnLabels.quantityProjected} infoTooltip="Projeção SBM filtrada por célula (média 4 mesmos isodow × variação)" />}
                {visibleColumns.quantityCompletionPct && <Th columnKey="quantityCompletionPct" label={columnLabels.quantityCompletionPct} align="center" />}
                {visibleColumns.revenue && <Th columnKey="revenue" label={columnLabels.revenue} />}
                {visibleColumns.revenueProjected && <Th columnKey="revenueProjected" label={columnLabels.revenueProjected} infoTooltip="Projeção financeira filtrada por célula" />}
                {visibleColumns.revenueCompletionPct && <Th columnKey="revenueCompletionPct" label={columnLabels.revenueCompletionPct} align="center" />}
                {visibleColumns.goal && <Th columnKey="goal" label={columnLabels.goal} infoTooltip="Meta do mesmo período ano anterior + variação por célula" />}
                {visibleColumns.goalCompletionPct && <Th columnKey="goalCompletionPct" label={columnLabels.goalCompletionPct} align="center" />}
              </tr>
            </thead>
            <tbody>
              {visibleNodes.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400 font-medium">Nenhum dado detalhado para o período/empresa selecionados.</td></tr>
              ) : (
                visibleNodes.map((node) => (
                  <MatrixRow key={node.id} node={node} isExpanded={expanded.has(node.id)} columnWidths={columnWidths} visibleColumns={visibleColumns} onToggle={toggle} lazy={visibleNodes.length > 200} />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 font-medium shrink-0">
          <div className="flex items-center space-x-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">Anterior</button>
            <span className="text-slate-700">Página <strong className="text-slate-900">{safePage + 1} de {totalPages}</strong> — {tree.length} datas · {data.matrixRows.length} células no total</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">Próxima</button>
          </div>
          <span className="text-[11px] text-slate-500">Exibindo <strong className="text-slate-700">{visibleNodes.length} linhas</strong> nesta página. Clique no chevron para expandir Grupo → Produto → Atendente.</span>
        </div>
      </section>
    </div>
  );
};
