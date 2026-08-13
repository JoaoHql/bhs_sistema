export interface SalesProjectionDay {
  date: string;
  quantitySold: number;
  quantityProjected: number | null;
  quantityCompletionPct: number | null;
  revenue: number;
  revenueProjected: number | null;
  revenueCompletionPct: number | null;
  goal: number | null;
  goalCompletionPct: number | null;
}

export interface SalesProjectionScenario {
  quantityGrowthPct: number;
  revenueGrowthPct: number;
  goalGrowthPct: number;
}

export interface SalesProjectionTemplateData {
  rows: SalesProjectionDay[];
  scenario: SalesProjectionScenario;
  onScenarioChange: (field: keyof SalesProjectionScenario, value: number) => void;
  isRefreshing?: boolean;
  /** Rótulo opcional exibido na coluna Data (ex.: "Semana 1"). Recebe a linha. */
  rowLabel?: (row: SalesProjectionDay) => string;
}
