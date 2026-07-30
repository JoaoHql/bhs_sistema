import type { AppModule, LabelPolicy, LayoutPreset, ValueFormat, WidgetPresentation } from '../types';

export interface WidgetLayoutMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface WidgetLabelBudget {
  compact: number;
  medium: number;
  expanded: number;
}

export interface WidgetLayoutDefinition {
  gridColumns: 3 | 4 | 6 | 9 | 12;
  contentHeight: number;
  chartMargins: WidgetLayoutMargins;
  labelBudget: WidgetLabelBudget;
}

export interface ResolvedWidgetPresentation extends Omit<WidgetLayoutDefinition, 'contentHeight'> {
  /** Undefined keeps the current visual-specific height for legacy widgets. */
  contentHeight?: number;
  source: 'preset' | 'legacy';
  layoutPreset?: LayoutPreset;
  labelPolicy: LabelPolicy;
  valueFormat: ValueFormat;
}

export const WIDGET_LAYOUT_PRESETS: Readonly<Record<LayoutPreset, WidgetLayoutDefinition>> = {
  'kpi.compact': {
    gridColumns: 3,
    contentHeight: 160,
    chartMargins: { top: 16, right: 16, bottom: 16, left: 16 },
    labelBudget: { compact: 0, medium: 0, expanded: 0 },
  },
  'chart.simple': {
    gridColumns: 4,
    contentHeight: 320,
    chartMargins: { top: 24, right: 24, bottom: 48, left: 32 },
    labelBudget: { compact: 4, medium: 6, expanded: 8 },
  },
  'chart.comparison': {
    gridColumns: 6,
    contentHeight: 380,
    chartMargins: { top: 28, right: 28, bottom: 56, left: 40 },
    labelBudget: { compact: 6, medium: 10, expanded: 16 },
  },
  'chart.detailed': {
    gridColumns: 12,
    contentHeight: 460,
    chartMargins: { top: 32, right: 36, bottom: 64, left: 48 },
    labelBudget: { compact: 10, medium: 18, expanded: 30 },
  },
  'table.compact': {
    gridColumns: 6,
    contentHeight: 300,
    chartMargins: { top: 0, right: 0, bottom: 0, left: 0 },
    labelBudget: { compact: 0, medium: 0, expanded: 0 },
  },
  'table.wide': {
    gridColumns: 12,
    contentHeight: 360,
    chartMargins: { top: 0, right: 0, bottom: 0, left: 0 },
    labelBudget: { compact: 0, medium: 0, expanded: 0 },
  },
};

export const WIDGET_LAYOUT_PRESET_OPTIONS: ReadonlyArray<{ value: LayoutPreset; label: string; description: string }> = [
  { value: 'kpi.compact', label: 'KPI compacto', description: 'Cartão de indicador em 3 de 12 colunas.' },
  { value: 'chart.simple', label: 'Gráfico simples', description: 'Até três visuais simples por linha.' },
  { value: 'chart.comparison', label: 'Gráfico comparativo', description: 'Dois gráficos de comparação por linha.' },
  { value: 'chart.detailed', label: 'Gráfico detalhado', description: 'Linha inteira para leitura com alta densidade.' },
  { value: 'table.compact', label: 'Tabela compacta', description: 'Tabela operacional de até quatro colunas úteis.' },
  { value: 'table.wide', label: 'Tabela ampla', description: 'Tabela larga para busca e mais colunas.' },
];

export const LABEL_POLICY_OPTIONS: ReadonlyArray<{ value: LabelPolicy; label: string }> = [
  { value: 'adaptive', label: 'Adaptativos ao espaço' },
  { value: 'all', label: 'Todos quando seguro' },
  { value: 'hidden', label: 'Ocultar no visual' },
];

export const VALUE_FORMAT_OPTIONS: ReadonlyArray<{ value: ValueFormat; label: string }> = [
  { value: 'auto', label: 'Automático' },
  { value: 'number.compact', label: 'Número resumido' },
  { value: 'number.full', label: 'Número completo' },
  { value: 'currency.compact', label: 'Moeda resumida' },
  { value: 'currency.full', label: 'Moeda completa (2 casas)' },
  { value: 'percent', label: 'Percentual' },
];

export function isLayoutPreset(value: unknown): value is LayoutPreset {
  return typeof value === 'string' && Object.hasOwn(WIDGET_LAYOUT_PRESETS, value);
}

export function getPresentationValidationError(presentation: unknown): string | undefined {
  if (presentation === undefined) return undefined;
  if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)) return 'presentation deve ser um objeto.';
  const value = presentation as Record<string, unknown>;
  const invalidKey = Object.keys(value).find(key => !['layoutPreset', 'labelPolicy', 'valueFormat'].includes(key));
  if (invalidKey) return `presentation.${invalidKey} não é permitido.`;
  if (!isLayoutPreset(value.layoutPreset)) return 'presentation.layoutPreset é inválido.';
  if (value.labelPolicy !== undefined && !LABEL_POLICY_OPTIONS.some(option => option.value === value.labelPolicy)) return 'presentation.labelPolicy é inválido.';
  if (value.valueFormat !== undefined && !VALUE_FORMAT_OPTIONS.some(option => option.value === value.valueFormat)) return 'presentation.valueFormat é inválido.';
  return undefined;
}

export function getModulePresentationValidationErrors(module: AppModule): string[] {
  return module.screens.flatMap(screen => screen.components.flatMap((widget, index) => {
    const error = getPresentationValidationError(widget.presentation);
    return error ? [`Widget '${widget.title || widget.id || index}' na tela '${screen.label}': ${error}`] : [];
  }));
}

const LEGACY_PRESENTATION: Omit<WidgetLayoutDefinition, 'contentHeight'> = {
  gridColumns: 6,
  chartMargins: { top: 24, right: 24, bottom: 48, left: 32 },
  labelBudget: { compact: 0, medium: 0, expanded: 0 },
};

const LEGACY_GRID_COLUMNS: Record<1 | 2 | 3 | 4, 3 | 6 | 9 | 12> = {
  1: 3,
  2: 6,
  3: 9,
  4: 12,
};

export function resolveWidgetPresentation(
  presentation: WidgetPresentation | undefined,
  legacyGridSpan: 1 | 2 | 3 | 4 | undefined,
): ResolvedWidgetPresentation {
  if (presentation && isLayoutPreset(presentation.layoutPreset)) {
    return {
      ...WIDGET_LAYOUT_PRESETS[presentation.layoutPreset],
      source: 'preset',
      layoutPreset: presentation.layoutPreset,
      labelPolicy: presentation.labelPolicy ?? 'adaptive',
      valueFormat: presentation.valueFormat ?? 'auto',
    };
  }

  return {
    ...LEGACY_PRESENTATION,
    gridColumns: LEGACY_GRID_COLUMNS[legacyGridSpan ?? 2],
    source: 'legacy',
    labelPolicy: 'hidden',
    valueFormat: 'auto',
  };
}
