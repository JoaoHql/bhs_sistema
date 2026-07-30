import type { Customer, Meta } from '../../../../types';
import type { OverviewTemplateData } from '../types';

interface BuildMockOverviewDataInput {
  customers: Customer[];
  metas: Meta[];
}

export const buildMockOverviewData = ({ customers, metas }: BuildMockOverviewDataInput): OverviewTemplateData => {
  const totalSales = customers.reduce((acc, customer) => acc + customer.value, 0);
  const customerCount = customers.length;
  const totalTarget = metas.reduce((acc, meta) => acc + meta.target, 0);
  const totalActualMetas = metas.reduce((acc, meta) => acc + meta.actual, 0);
  const targetProgress = totalTarget > 0 ? (totalActualMetas / totalTarget) * 100 : 0;
  const averageTicket = customerCount > 0 ? totalSales / customerCount : 0;

  const scale = totalSales / 5000000;
  const trendData = [
    { name: 'Jan', faturamento: Math.round(650000 * scale), meta: Math.round(600000 * scale) },
    { name: 'Fev', faturamento: Math.round(720000 * scale), meta: Math.round(600000 * scale) },
    { name: 'Mar', faturamento: Math.round(850000 * scale), meta: Math.round(700000 * scale) },
    { name: 'Abr', faturamento: Math.round(890000 * scale), meta: Math.round(800000 * scale) },
    { name: 'Mai', faturamento: Math.round(1100000 * scale), meta: Math.round(900000 * scale) },
    { name: 'Jun', faturamento: Math.round(totalSales * 0.9), meta: Math.round(totalTarget * 0.9) },
  ];

  const categoryMap: Record<string, { target: number; actual: number }> = {};
  metas.forEach((meta) => {
    if (!categoryMap[meta.category]) categoryMap[meta.category] = { target: 0, actual: 0 };
    categoryMap[meta.category].target += meta.target;
    categoryMap[meta.category].actual += meta.actual;
  });
  const categoryData = Object.entries(categoryMap).map(([name, val]) => ({
    name,
    Realizado: val.actual,
    Meta: val.target,
    percentual: val.target > 0 ? (val.actual / val.target) * 100 : 0,
  }));

  const segmentMap: Record<string, number> = {};
  customers.forEach((customer) => {
    segmentMap[customer.region] = (segmentMap[customer.region] || 0) + customer.value;
  });
  const segmentData = Object.entries(segmentMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topClients = [...customers]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((customer) => ({
      name: `${customer.name.split(' ')[0]} ${customer.name.split(' ')[1] || ''}`.trim(),
      fullName: customer.name,
      value: customer.value,
    }));

  return {
    kpis: {
      totalSales,
      customerCount,
      targetProgress,
      averageTicket,
    },
    trendData,
    categoryData,
    segmentData,
    topClients,
  };
};

