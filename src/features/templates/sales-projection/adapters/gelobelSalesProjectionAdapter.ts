import type { SalesProjectionResponse } from '../../../../types';
import type { SalesProjectionTemplateData } from '../types';

export const buildGelobelSalesProjectionData = (
  response: SalesProjectionResponse,
  scenario: SalesProjectionTemplateData['scenario'],
  onScenarioChange: SalesProjectionTemplateData['onScenarioChange'],
  isRefreshing = false,
): SalesProjectionTemplateData => {
  const byDate = new Map<string, SalesProjectionResponse['rows'][number]>();
  for (const row of response.rows) {
    const prev = byDate.get(row.sales_date);
    if (!prev) byDate.set(row.sales_date, row);
    else {
      byDate.set(row.sales_date, {
        ...row,
        quantity_sold: (prev.quantity_sold ?? 0) + (row.quantity_sold ?? 0),
        revenue: (prev.revenue ?? 0) + (row.revenue ?? 0),
        quantity_projected: row.quantity_projected ?? prev.quantity_projected,
        quantity_completion_pct: row.quantity_completion_pct ?? prev.quantity_completion_pct,
        revenue_projected: row.revenue_projected ?? prev.revenue_projected,
        revenue_completion_pct: row.revenue_completion_pct ?? prev.revenue_completion_pct,
        goal: row.goal ?? prev.goal,
        goal_completion_pct: row.goal_completion_pct ?? prev.goal_completion_pct,
      });
    }
  }
  const rows = [...byDate.values()]
    .sort((a, b) => a.sales_date.localeCompare(b.sales_date))
    .map((row) => ({
      date: row.sales_date,
      quantitySold: row.quantity_sold,
      quantityProjected: row.quantity_projected,
      quantityCompletionPct: row.quantity_completion_pct,
      revenue: row.revenue,
      revenueProjected: row.revenue_projected,
      revenueCompletionPct: row.revenue_completion_pct,
      goal: row.goal,
      goalCompletionPct: row.goal_completion_pct,
    }));
  return { scenario, onScenarioChange, isRefreshing, rows };
};
