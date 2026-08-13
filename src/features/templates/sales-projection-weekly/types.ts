import type {
  SalesProjectionAggregateRow,
  SalesProjectionMonthlySeriesPoint,
} from '../../../types';
import type {
  SalesProjectionScenario,
  SalesProjectionTemplateData,
} from '../sales-projection/types';

export interface SalesProjectionWeeklyTemplateData extends SalesProjectionTemplateData {
  groupTotals: SalesProjectionAggregateRow[];
  productTotals: SalesProjectionAggregateRow[];
  attendantTotals: SalesProjectionAggregateRow[];
  monthlySeries: SalesProjectionMonthlySeriesPoint[];
  storageKey: string;
}

export type { SalesProjectionScenario };
