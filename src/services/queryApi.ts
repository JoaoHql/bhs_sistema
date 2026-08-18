import type { ComboSimulatorProductsResponse, QueryRequest, QueryResponse, SalesOverviewResponse, SalesProjectionMatrixResponse, SalesProjectionResponse, SalesProjectionWeeklyResponse, SavedComboSimulation } from '../types';
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

  comboSimulations(request: { screenId: string; company: string }): Promise<SavedComboSimulation[]> {
    const params = new URLSearchParams({ screenId: request.screenId, company: request.company });
    return apiClient.get<SavedComboSimulation[]>(`/api/v1/tenant/combo-simulations?${params.toString()}`);
  },

  createComboSimulation(request: {
    screenId: string;
    company: string;
    name: string;
    products: SavedComboSimulation['products'];
  }): Promise<SavedComboSimulation> {
    return apiClient.post<typeof request, SavedComboSimulation>('/api/v1/tenant/combo-simulations', request);
  },

  deleteComboSimulation(request: { screenId: string; company: string; id: string }): Promise<void> {
    const params = new URLSearchParams({ screenId: request.screenId, company: request.company });
    return apiClient.delete<void>(`/api/v1/tenant/combo-simulations/${request.id}?${params.toString()}`);
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

  salesProjectionMatrix(request: {
    screenId: string;
    month?: string;
    company?: string;
    quantityGrowthPct: number;
    revenueGrowthPct: number;
    goalGrowthPct: number;
  }): Promise<SalesProjectionMatrixResponse> {
    return apiClient.post<typeof request, SalesProjectionMatrixResponse>('/api/v1/query/sales-projection-matrix', request);
  },
};
