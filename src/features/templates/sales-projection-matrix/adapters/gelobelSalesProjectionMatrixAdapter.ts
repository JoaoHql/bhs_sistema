import type { SalesProjectionMatrixResponse } from '../../../../types';
import { buildGelobelSalesProjectionData } from '../../sales-projection/adapters/gelobelSalesProjectionAdapter';
import type { SalesProjectionScenario } from '../../sales-projection/types';
import type { SalesProjectionMatrixTemplateData } from '../types';

export const buildGelobelSalesProjectionMatrixData = (
  response: SalesProjectionMatrixResponse,
  scenario: SalesProjectionScenario,
  onScenarioChange: SalesProjectionMatrixTemplateData['onScenarioChange'],
  storageKey: string,
  isRefreshing = false,
): SalesProjectionMatrixTemplateData => {
  const base = buildGelobelSalesProjectionData(response, scenario, onScenarioChange, isRefreshing);
  // weeklyRows mapeadas para rows da tabela diária (compat)
  const rows = (response.weeklyRows ?? []).map((row) => ({
    date: `week-${row.week}`,
    quantitySold: row.quantity_sold,
    quantityProjected: row.quantity_projected,
    quantityCompletionPct: row.quantity_completion_pct,
    revenue: row.revenue,
    revenueProjected: row.revenue_projected,
    revenueCompletionPct: row.revenue_completion_pct,
    goal: row.goal,
    goalCompletionPct: row.goal_completion_pct,
  }));
  return {
    ...base,
    rows,
    rowLabel: (row) => {
      const m = /^week-(\d+)$/.exec(row.date);
      return m ? `Semana ${m[1]}` : row.date;
    },
    groupTotals: response.groupTotals ?? [],
    productTotals: response.productTotals ?? [],
    attendantTotals: response.attendantTotals ?? [],
    monthlySeries: response.monthlySeries ?? [],
    storageKey,
    matrixRows: response.matrixRows ?? [],
  };
};
