import type { SalesProjectionResponse } from '../../../../types';
import type { SalesProjectionTemplateData } from '../types';

export const buildGelobelSalesProjectionData = (
  response: SalesProjectionResponse,
  scenario: SalesProjectionTemplateData['scenario'],
  onScenarioChange: SalesProjectionTemplateData['onScenarioChange'],
  isRefreshing = false,
): SalesProjectionTemplateData => ({
  scenario,
  onScenarioChange,
  isRefreshing,
  rows: response.rows.map((row) => ({
    date: row.sales_date,
    quantitySold: row.quantity_sold,
    quantityProjected: row.quantity_projected,
    quantityCompletionPct: row.quantity_completion_pct,
    revenue: row.revenue,
    revenueProjected: row.revenue_projected,
    revenueCompletionPct: row.revenue_completion_pct,
    goal: row.goal,
    goalCompletionPct: row.goal_completion_pct,
  })),
});
