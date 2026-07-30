export interface OverviewKpis {
  totalSales: number;
  customerCount: number;
  targetProgress: number;
  averageTicket: number;
}

export interface OverviewTrendPoint {
  name: string;
  faturamento: number;
  meta?: number;
}

export interface OverviewCategoryPoint {
  name: string;
  Realizado: number;
  Meta?: number;
  percentual?: number;
}

export interface OverviewSegmentPoint {
  name: string;
  value: number;
}

export interface OverviewTopClientPoint {
  name: string;
  fullName: string;
  value: number;
}

export interface OverviewTemplateLabels {
  targetKpiLabel?: string;
  targetKpiFormat?: 'percent' | 'number';
  segmentTitle?: string;
  segmentSubtitle?: string;
  segmentCenterLabel?: string;
  categoryTitle?: string;
  categorySubtitle?: string;
  categoryTableTitle?: string;
  categoryTableSubtitle?: string;
}

export interface OverviewTemplateActions {
  resetFilters: () => void;
  selectPeriod: (period: string) => void;
  toggleCategorySearch: (category: string) => void;
  toggleSegment: (segment: string) => void;
  toggleClientSearch: (clientFullName: string) => void;
}

export interface OverviewTemplateData {
  kpis: OverviewKpis;
  trendData: OverviewTrendPoint[];
  categoryData: OverviewCategoryPoint[];
  segmentData: OverviewSegmentPoint[];
  topClients: OverviewTopClientPoint[];
}
