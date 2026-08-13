import type { ComboSimulatorProductsResponse, QueryRequest, QueryResponse, SalesOverviewResponse, SalesProjectionResponse, SalesProjectionWeeklyResponse } from '../types';
import { apiClient } from './apiClient';

export const isQueryApiEnabled = () =>
  import.meta.env.VITE_QUERY_API_ENABLED === 'true' || import.meta.env.VITE_CONFIG_API_ENABLED === 'true';

export const queryApi = {
  query(request: QueryRequest): Promise<QueryResponse> {
    return apiClient.post<QueryRequest, QueryResponse>('/api/v1/query', request);
  },

  salesOverview(request: { screenId: string; limit?: number }): Promise<SalesOverviewResponse> {
    return apiClient.post<typeof request, SalesOverviewResponse>('/api/v1/query/sales-overview', request);
  },

  comboSimulatorProducts(request: { screenId: string; search?: string; company?: string; limit?: number }): Promise<ComboSimulatorProductsResponse> {
    return apiClient.post<typeof request, ComboSimulatorProductsResponse>('/api/v1/query/combo-simulator-products', request);
  },

  salesProjection(request: {
    screenId: string;
    month?: string;
    company?: string;
    quantityGrowthPct: number;
    revenueGrowthPct: number;
    goalGrowthPct: number;
  }): Promise<SalesProjectionResponse> {
    return apiClient.post<typeof request, SalesProjectionResponse>('/api/v1/query/sales-projection', request);
  },

  salesProjectionWeekly(request: {
    screenId: string;
    month?: string;
    company?: string;
    quantityGrowthPct: number;
    revenueGrowthPct: number;
    goalGrowthPct: number;
  }): Promise<SalesProjectionWeeklyResponse> {
    return apiClient.post<typeof request, SalesProjectionWeeklyResponse>('/api/v1/query/sales-projection-weekly', request);
  },
};
