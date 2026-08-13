import type { SalesProjectionWeeklyResponse } from '../../../../types';
import { buildGelobelSalesProjectionData } from '../../sales-projection/adapters/gelobelSalesProjectionAdapter';
import type { SalesProjectionScenario } from '../../sales-projection/types';
import type { SalesProjectionWeeklyTemplateData } from '../types';

export const buildGelobelSalesProjectionWeeklyData = (
  response: SalesProjectionWeeklyResponse,
  scenario: SalesProjectionScenario,
  onScenarioChange: SalesProjectionWeeklyTemplateData['onScenarioChange'],
  storageKey: string,
  isRefreshing = false,
): SalesProjectionWeeklyTemplateData => ({
  ...buildGelobelSalesProjectionData(response, scenario, onScenarioChange, isRefreshing),
  groupTotals: response.groupTotals ?? [],
  productTotals: response.productTotals ?? [],
  attendantTotals: response.attendantTotals ?? [],
  monthlySeries: response.monthlySeries ?? [],
  storageKey,
});
