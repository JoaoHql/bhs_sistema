import type { SalesProjectionTemplateData } from '../types';

export const buildMockSalesProjectionData = (
  scenario: SalesProjectionTemplateData['scenario'],
  onScenarioChange: SalesProjectionTemplateData['onScenarioChange'],
): SalesProjectionTemplateData => ({
  scenario,
  onScenarioChange,
  rows: [{
    date: '2026-01-02',
    quantitySold: 108,
    quantityProjected: 113,
    quantityCompletionPct: 108 / 113,
    revenue: 16894.72,
    revenueProjected: 18584.19,
    revenueCompletionPct: 16894.72 / 18584.19,
    goal: 16760.12,
    goalCompletionPct: 16894.72 / 16760.12,
  }],
});
