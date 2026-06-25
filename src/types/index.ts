export type RFVCluster = 'Champions' | 'Loyal' | 'At Risk' | 'About to Sleep' | 'New';

export interface Customer {
  id: string;
  name: string;
  recency: number; // days since last order
  frequency: number; // number of orders
  value: number; // total spent
  region: string; // State abbreviation (e.g. SP, RJ, MG)
  cluster: RFVCluster;
}

export interface Meta {
  id: string;
  category: string;
  branch: string; // Branch name (e.g. Filial SP, Filial RJ)
  vendedor?: string;
  empresa?: string;
  target: number; // Target monetary value
  actual: number; // Actual monetary value achieved
  period: string; // Month/Year (e.g. "Jun/2026")
}

export type UserRole = 'Admin' | 'Analista' | 'Leitor';

export interface UserPermission {
  screen: string;
  access: 'None' | 'Read' | 'Write';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: UserPermission[];
}

export interface SyncLog {
  id: string;
  timestamp: string;
  status: 'Success' | 'Failed';
  rowsProcessed: number;
  durationSeconds: number;
  initiatedBy: string;
}

export type DataMode = 'mock' | 'api';

export type DataStatus = 'ready' | 'loading' | 'fallback' | 'error';

export interface DashboardDataSnapshot {
  customers: Customer[];
  metas: Meta[];
  users: User[];
  syncLogs: SyncLog[];
  lastUpdated: string;
}

export type AdsPlatform = 'meta' | 'google-analytics';

export interface AdsKpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export interface AdsTimeSeriesPoint {
  label: string;
  investimento?: number;
  receita?: number;
  leads?: number;
  cpl?: number;
  sessoes?: number;
  usuarios?: number;
  conversoes?: number;
  engajamento?: number;
}

export interface AdsBreakdownItem {
  name: string;
  value: number;
  color: string;
}

export interface AdsRankingItem {
  name: string;
  value: number;
  secondary?: string;
}

export interface AdsPlatformSummary {
  title: string;
  spend?: number;
  revenue?: number;
  conversions?: number;
  roas?: number;
  sessions?: number;
  engagementRate?: number;
}

export interface AdsDashboard {
  platform: AdsPlatform;
  title: string;
  subtitle: string;
  kpis: AdsKpi[];
  timeline: AdsTimeSeriesPoint[];
  summaryCards: AdsPlatformSummary[];
  breakdown: AdsBreakdownItem[];
  ranking: AdsRankingItem[];
  channelPerformance: AdsRankingItem[];
}

export interface AdsDashboardSnapshot {
  meta: AdsDashboard;
  googleAnalytics: AdsDashboard;
  lastUpdated: string;
}
