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
