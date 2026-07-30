import type { LabelPolicy, ValueFormat } from '../types';
import type { WidgetLabelBudget, WidgetLayoutMargins } from '../config/widgetPresentation';

export type AdaptiveChartKind = 'bar' | 'bar-horizontal' | 'line' | 'pie';

export interface ChartLabelSelectionInput {
  kind: AdaptiveChartKind;
  data: Record<string, unknown>[];
  metricKeys: string[];
  width: number;
  height: number;
  policy: LabelPolicy;
  budget: WidgetLabelBudget;
}

const uniqueSorted = (indexes: number[]) => [...new Set(indexes)].sort((a, b) => a - b);

const numericPointValue = (row: Record<string, unknown>, metricKeys: string[]) =>
  metricKeys.reduce((total, key) => total + Math.abs(Number(row[key]) || 0), 0);

const evenlySpacedIndexes = (length: number, amount: number) => {
  if (amount <= 0 || length === 0) return [];
  if (amount >= length) return Array.from({ length }, (_, index) => index);
  return uniqueSorted(Array.from({ length: amount }, (_, index) => Math.round((index * (length - 1)) / (amount - 1 || 1))));
};

export function getSafeLabelCapacity({ kind, data, width, height, policy, budget }: ChartLabelSelectionInput): number {
  if (policy === 'hidden' || data.length === 0 || width <= 0 || height <= 0) return 0;

  const dimensionCapacity = kind === 'bar-horizontal'
    ? Math.floor(height / 28)
    : kind === 'pie'
      ? Math.floor(Math.min(width, height) / 38)
      : Math.floor(width / 62);
  const budgetCapacity = width >= 900 || height >= 430
    ? budget.expanded
    : width >= 560 || height >= 300
      ? budget.medium
      : budget.compact;
  const safeCapacity = Math.max(1, Math.min(data.length, dimensionCapacity, budgetCapacity));

  // "all" never draws beyond physical capacity; the tooltip remains the complete source of truth.
  return policy === 'all' ? safeCapacity : Math.min(safeCapacity, budgetCapacity);
}

export function selectAdaptiveLabelIndexes(input: ChartLabelSelectionInput): number[] {
  const { kind, data, metricKeys } = input;
  const capacity = getSafeLabelCapacity(input);
  if (capacity === 0) return [];
  if (capacity >= data.length) return Array.from({ length: data.length }, (_, index) => index);

  const ranked = data
    .map((row, index) => ({ index, value: numericPointValue(row, metricKeys) }))
    .sort((a, b) => b.value - a.value);

  if (kind === 'line') {
    const min = [...ranked].reverse()[0]?.index;
    const max = ranked[0]?.index;
    const last = data.length - 1;
    const priorities = [min, max, last].filter((index): index is number => index !== undefined);
    const selected = uniqueSorted(priorities);
    for (const index of evenlySpacedIndexes(data.length, capacity)) {
      if (selected.length >= capacity) break;
      if (!selected.includes(index)) selected.push(index);
    }
    return uniqueSorted(selected);
  }

  if (kind === 'bar' || kind === 'bar-horizontal' || kind === 'pie') {
    const priorities = ranked.slice(0, capacity).map(item => item.index);
    return uniqueSorted(priorities);
  }

  return evenlySpacedIndexes(data.length, capacity);
}

export function formatChartLabelValue(value: unknown, format: ValueFormat, metricFormat?: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value ?? '');

  const resolvedFormat: ValueFormat = format === 'auto'
    ? metricFormat === 'currency'
      ? 'currency.compact'
      : metricFormat === 'percent'
        ? 'percent'
        : 'number.compact'
    : format;

  if (resolvedFormat === 'currency.compact') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(numericValue);
  }
  if (resolvedFormat === 'currency.full') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numericValue);
  }
  if (resolvedFormat === 'number.full') {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
    }).format(numericValue);
  }
  if (resolvedFormat === 'percent') {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(numericValue / 100);
  }
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(numericValue);
}

// Formatos preservados dos dashboards especializados; não alteram dados ou tooltip.
export const formatSpecializedCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

export const formatSpecializedNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

export const formatSpecializedCompactCurrency = (value: unknown) => `R$${Math.round((Number(value) || 0) / 1000)}k`;

export function reserveLabelMargins(
  margins: WidgetLayoutMargins,
  kind: AdaptiveChartKind,
  labelCount: number,
): WidgetLayoutMargins {
  if (labelCount === 0) return margins;
  if (kind === 'bar-horizontal') return { ...margins, left: Math.max(margins.left, 88), right: margins.right + 36 };
  if (kind === 'pie') return { ...margins, top: margins.top + 8, right: margins.right + 8, bottom: margins.bottom + 16, left: margins.left + 8 };
  return { ...margins, top: margins.top + 18, right: margins.right + 8, bottom: margins.bottom + 8 };
}
