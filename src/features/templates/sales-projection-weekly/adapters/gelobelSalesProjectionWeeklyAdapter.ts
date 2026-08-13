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
): SalesProjectionWeeklyTemplateData => {
  const base = buildGelobelSalesProjectionData(response, scenario, onScenarioChange, isRefreshing);
  return {
    ...base,
    // A tabela da tela semanal usa as linhas semanais calculadas no backend
    // com semente SBM (mesma posicao de semana nos 4 meses anteriores).
    rows: (response.weeklyRows ?? []).map((row) => ({
      date: `week-${row.week}`,
      quantitySold: row.quantity_sold,
      quantityProjected: row.quantity_projected,
      quantityCompletionPct: row.quantity_completion_pct,
      revenue: row.revenue,
      revenueProjected: row.revenue_projected,
      revenueCompletionPct: row.revenue_completion_pct,
      goal: row.goal,
      goalCompletionPct: row.goal_completion_pct,
    })),
    rowLabel: (row) => {
      const match = /^week-(\d+)$/.exec(row.date);
      return match ? `Semana ${match[1]}` : row.date;
    },
    groupTotals: response.groupTotals ?? [],
    productTotals: response.productTotals ?? [],
    attendantTotals: response.attendantTotals ?? [],
    monthlySeries: response.monthlySeries ?? [],
    storageKey,
  };
};
