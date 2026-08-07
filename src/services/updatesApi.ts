import type { AreaUpdateStatus, RefreshRequest, RefreshResponse, UpdateRun } from '../types';
import { apiClient } from './apiClient';

export const updatesApi = {
  getStatus(): Promise<AreaUpdateStatus[]> {
    return apiClient.get<AreaUpdateStatus[]>('/api/v1/tenant/updates');
  },

  listRuns(limit: number = 50): Promise<UpdateRun[]> {
    return apiClient.get<UpdateRun[]>(`/api/v1/tenant/updates/runs?limit=${limit}`);
  },

  deleteRun(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/tenant/updates/runs/${id}`);
  },

  refresh(request: RefreshRequest, signal?: AbortSignal): Promise<RefreshResponse> {
    return apiClient.post<RefreshRequest, RefreshResponse>('/api/v1/tenant/updates/refresh', request, { signal });
  },
};
