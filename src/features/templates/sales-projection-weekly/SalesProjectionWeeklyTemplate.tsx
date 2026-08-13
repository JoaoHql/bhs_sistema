import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SalesProjectionTemplate } from '../sales-projection/SalesProjectionTemplate';
import type { SalesProjectionAggregateRow, SalesProjectionMonthlySeriesPoint } from '../../../types';
import { formatChartLabelValue, reserveLabelMargins, selectAdaptiveLabelIndexes } from '../../../utils/chartLabels';
import { ResizableChartPanel } from './ResizableChartPanel';
import type { SalesProjectionWeeklyTemplateData } from './types';

const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const box = element.getBoundingClientRect();
      setSize(current => current.width === box.width && current.height === box.height ? current : { width: box.width, height: box.height });
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-full min-h-[180px] items-center justify-center px-5 text-center text-[11px] font-medium text-slate-400">Nenhum dado disponível para {label.toLowerCase()}.</div>;
}

interface TooltipEntry { name?: string; value?: unknown; color?: string; dataKey?: string }
function CorporateTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: unknown }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] shadow-lg">
      <p className="mb-1.5 border-b border-slate-100 pb-1 font-bold text-slate-800">{String(label ?? '')}</p>
      {payload.map((entry, index) => (
        <div key={`${entry.dataKey ?? entry.name ?? 'value'}-${index}`} className="flex items-center gap-2 py-0.5 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? '#3b82f6' }} />
          <span className="font-semibold">{entry.name ?? 'Total'}:</span>
          <span className="font-bold text-slate-900">{entry.value == null ? '—' : currency.format(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
}

function CustomYAxisTick(props: { y?: number; payload?: { value?: string } }) {
  const { y, payload } = props;
  const rawValue = String(payload?.value ?? '');
  const displayValue = rawValue.length > 15 ? `${rawValue.slice(0, 14)}…` : rawValue;
  return (
    <g transform={`translate(0, ${y ?? 0})`}>
      <text x={82} y={0} dy={3} textAnchor="end" fill="#475569" fontSize={8.5} fontWeight={700}>
        <title>{rawValue}</title>
        {displayValue}
      </text>
    </g>
  );
}

function renderValueLabel(props: { x?: number; y?: number; width?: number; height?: number; value?: unknown; index?: number }, chartWidth: number) {
  if (props.value == null) return null;
  const label = formatChartLabelValue(props.value, 'currency.full');
  const labelWidth = label.length * 6;
  const endX = (props.x ?? 0) + (props.width ?? 0);
  const outside = endX + labelWidth + 10 <= chartWidth - 4;
  return (
    <text
      x={outside ? endX + 6 : Math.max((props.x ?? 0) + 6, endX - 5)}
      y={(props.y ?? 0) + (props.height ?? 0) / 2}
      textAnchor={outside ? 'start' : 'end'}
      dominantBaseline="middle"
      fill={outside ? '#475569' : '#ffffff'}
      fontSize={8.5}
      fontWeight={700}
    >{label}</text>
  );
}

function RankingChart({ title, description, rows, storageKey, panelId, color, ariaLabel }: { title: string; description: string; rows: SalesProjectionAggregateRow[]; storageKey: string; panelId: string; color: string; ariaLabel: string }) {
  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.total - a.total), [rows]);
  const { ref, size } = useElementSize<HTMLDivElement>();
  const margins = useMemo(() => ({ top: 8, right: 95, bottom: 8, left: 4 }), []);
  const visibleRows = Math.max(1, Math.min(sortedRows.length, 10));
  const chartHeight = Math.max(220, sortedRows.length * 28 + 44);
  const defaultHeight = Math.max(290, Math.min(360, visibleRows * 28 + 104));

  return (
    <ResizableChartPanel panelId={panelId} title={title} description={description} storageKey={storageKey} defaultSize={{ width: 420, height: defaultHeight }} ariaLabel={ariaLabel}>
      {sortedRows.length === 0 ? <EmptyChart label={title} /> : (
        <div ref={ref} className="h-full min-h-0 overflow-auto" role="img" aria-label={ariaLabel}>
          <div style={{ minWidth: 300, height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart accessibilityLayer data={sortedRows} layout="vertical" margin={margins} barCategoryGap={4}>
                <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }} tickFormatter={(value) => formatChartLabelValue(value, 'currency.compact')} />
                <YAxis type="category" dataKey="label" width={88} interval={0} tick={<CustomYAxisTick />} tickLine={false} axisLine={false} />
                <Tooltip content={<CorporateTooltip />} />
                <Bar dataKey="total" name="Total" fill={color} radius={[0, 4, 4, 0]} barSize={16} maxBarSize={16}>
                  <LabelList position="right" content={(props) => renderValueLabel(props as { x?: number; y?: number; width?: number; height?: number; value?: unknown; index?: number }, size.width)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ResizableChartPanel>
  );
}

function MonthlyChart({ series, storageKey, year }: { series: SalesProjectionMonthlySeriesPoint[]; storageKey: string; year: number | null }) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const indexes = useMemo(() => selectAdaptiveLabelIndexes({
    kind: 'line', data: series as unknown as Record<string, unknown>[], metricKeys: ['total', 'goal'], width: size.width, height: size.height, policy: 'adaptive', budget: { compact: 4, medium: 7, expanded: 12 },
  }), [series, size.height, size.width]);
  const margins = useMemo(() => reserveLabelMargins({ top: 20, right: 24, bottom: 10, left: 14 }, 'line', indexes.length), [indexes.length]);
  const data = useMemo(() => series.map(point => ({ ...point, monthLabel: monthLabels[Math.max(0, Number(point.month.slice(-2)) - 1)] ?? point.month })), [series]);
  const renderLineLabel = (props: { x?: number; y?: number; value?: unknown; index?: number }) => {
    if (props.index == null || !indexes.includes(props.index) || props.value == null) return null;
    return <text x={props.x} y={(props.y ?? 0) - 7} textAnchor="middle" fill="#475569" fontSize={9} fontWeight={700}>{formatChartLabelValue(props.value, 'currency.compact')}</text>;
  };

  return (
    <ResizableChartPanel panelId="monthly-series" title="Total x Meta" description={year ? `Acompanhamento mensal de ${year}` : 'Acompanhamento mensal'} storageKey={storageKey} defaultSize={{ width: 1400, height: 410 }} ariaLabel="Gráfico temporal anual com Total e Meta">
      {data.length === 0 ? <EmptyChart label="a série anual" /> : (
        <div ref={ref} className="h-full min-h-0" role="img" aria-label="Total e Meta por mês, em reais">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart accessibilityLayer data={data} margin={margins}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={(value) => formatChartLabelValue(value, 'currency.compact')} width={72} />
              <Tooltip content={<CorporateTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700, color: '#475569' }} />
              <Area type="monotone" dataKey="total" name="Total" legendType="none" fill="#3b82f6" fillOpacity={0.1} stroke="none" isAnimationActive={false} />
              <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} isAnimationActive={false}>
                <LabelList content={(props) => renderLineLabel(props as { x?: number; y?: number; value?: unknown; index?: number })} />
              </Line>
              <Line type="monotone" dataKey="goal" name="Meta" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: '#9333ea' }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </ResizableChartPanel>
  );
}

export const SalesProjectionWeeklyTemplate: React.FC<{ data: SalesProjectionWeeklyTemplateData }> = ({ data }) => (
  <div className="flex flex-col space-y-4 pb-5">
    <SalesProjectionTemplate data={data} compact />
    <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]" aria-label="Rankings de faturamento">
      <RankingChart title="Total por Grupo" description="Mês selecionado" rows={data.groupTotals} storageKey={data.storageKey} panelId="groups" color="#3b82f6" ariaLabel="Barras horizontais de faturamento por grupo" />
      <RankingChart title="Total por Produto" description="Mês selecionado" rows={data.productTotals} storageKey={data.storageKey} panelId="products" color="#10b981" ariaLabel="Barras horizontais de faturamento por produto" />
      <RankingChart title="Total por Atendente" description="Mês selecionado" rows={data.attendantTotals} storageKey={data.storageKey} panelId="attendants" color="#8b5cf6" ariaLabel="Barras horizontais de faturamento por atendente" />
    </section>
    <MonthlyChart series={data.monthlySeries} storageKey={data.storageKey} year={data.monthlySeries[0]?.month ? Number(data.monthlySeries[0].month.slice(0, 4)) : null} />
  </div>
);
