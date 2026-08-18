import type {
  SalesProjectionAggregateRow,
  SalesProjectionMatrixRow,
  SalesProjectionMonthlySeriesPoint,
} from '../../../types';
import type { SalesProjectionScenario, SalesProjectionTemplateData } from '../sales-projection/types';

export interface SalesProjectionMatrixTemplateData extends SalesProjectionTemplateData {
  groupTotals: SalesProjectionAggregateRow[];
  productTotals: SalesProjectionAggregateRow[];
  attendantTotals: SalesProjectionAggregateRow[];
  monthlySeries: SalesProjectionMonthlySeriesPoint[];
  storageKey: string;
  matrixRows: SalesProjectionMatrixRow[];
}
export type { SalesProjectionScenario };
