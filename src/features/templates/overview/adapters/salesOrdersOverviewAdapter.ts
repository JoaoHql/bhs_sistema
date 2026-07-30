import type { TenantSalesOrderRow } from '../../../../types';
import type { OverviewTemplateData } from '../types';

interface BuildSalesOrdersOverviewDataInput {
  rows: TenantSalesOrderRow[];
  period: string;
  branch: string;
  searchQuery: string;
}

const normalize = (value: unknown) => String(value ?? '').toLowerCase().trim();

const formatDay = (dateText: string) => {
  const [year, month, day] = dateText.split('-');
  if (!year || !month || !day) return dateText;
  return `${day}/${month}`;
};

const addToMap = (map: Record<string, number>, key: string, value: number) => {
  map[key] = (map[key] || 0) + value;
};

export const buildSalesOrdersOverviewData = ({
  rows,
  period,
  branch,
  searchQuery,
}: BuildSalesOrdersOverviewDataInput): OverviewTemplateData => {
  const query = normalize(searchQuery);
  const filteredRows = rows.filter((row) => {
    if (period !== 'All' && !row.order_date.startsWith(period)) return false;
    if (branch !== 'All' && row.branch !== branch) return false;
    if (!query) return true;
    return [row.channel, row.branch, row.customer_name].some((value) => normalize(value).includes(query));
  });

  const totalSales = filteredRows.reduce((acc, row) => acc + Number(row.revenue || 0), 0);
  const totalOrders = filteredRows.reduce((acc, row) => acc + Number(row.orders_count || 0), 0);
  const customers = new Set(filteredRows.map((row) => row.customer_name).filter(Boolean));
  const customerCount = customers.size;
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  const trendMap: Record<string, number> = {};
  const categoryMap: Record<string, number> = {};
  const segmentMap: Record<string, number> = {};
  const clientMap: Record<string, number> = {};

  filteredRows.forEach((row) => {
    const revenue = Number(row.revenue || 0);
    addToMap(trendMap, row.order_date, revenue);
    addToMap(categoryMap, row.channel || 'Sem canal', revenue);
    addToMap(segmentMap, row.branch || 'Sem filial', revenue);
    addToMap(clientMap, row.customer_name || 'Cliente nao informado', revenue);
  });

  const trendData = Object.entries(trendMap)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, faturamento]) => ({
      name: formatDay(date),
      faturamento,
    }));

  const maxCategoryValue = Math.max(...Object.values(categoryMap), 1);
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({
      name,
      Realizado: value,
      percentual: (value / maxCategoryValue) * 100,
    }))
    .sort((a, b) => b.Realizado - a.Realizado);

  const segmentData = Object.entries(segmentMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topClients = Object.entries(clientMap)
    .map(([name, value]) => ({
      name: name.split(' ').slice(0, 2).join(' '),
      fullName: name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    kpis: {
      totalSales,
      customerCount,
      targetProgress: totalOrders,
      averageTicket,
    },
    trendData,
    categoryData,
    segmentData,
    topClients,
  };
};
