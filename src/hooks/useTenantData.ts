import { useCallback, useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from 'react';
import {
  getTenantScreenPending,
  getTotalPendingCount,
  getCachedTenantData,
  loadTenantData,
  tenantCacheKey,
  subscribeTenantDataActivity,
} from '../services/tenantDataCache';

interface UseTenantDataOptions<T> {
  enabled?: boolean;
  sessionKey: string;
  screenId: string;
  resourceId: string;
  params: unknown;
  refreshVersion: number;
  loader: () => Promise<T>;
}

interface TenantDataState<T> {
  requestId: string;
  data?: T;
  error: Error | null;
  loading: boolean;
}

export const useTenantData = <T>({
  enabled = true,
  sessionKey,
  screenId,
  resourceId,
  params,
  refreshVersion,
  loader,
}: UseTenantDataOptions<T>) => {
  const key = useMemo(
    () => tenantCacheKey(sessionKey, screenId, resourceId, params),
    [params, resourceId, screenId, sessionKey],
  );
  const requestId = `${key}@${refreshVersion}@${enabled}`;
  const runLoader = useEffectEvent(loader);

  const [state, setState] = useState<TenantDataState<T>>(() => {
    const data = enabled ? getCachedTenantData<T>(key) : undefined;
    return { requestId, data, error: null, loading: enabled && data === undefined };
  });

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    loadTenantData(key, runLoader)
      .then((data) => {
        if (active) setState({ requestId, data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          requestId,
          data: undefined,
          error: error instanceof Error ? error : new Error('Falha ao carregar dados.'),
          loading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [enabled, key, refreshVersion, requestId]);

  if (state.requestId !== requestId) {
    const cached = enabled ? getCachedTenantData<T>(key) : undefined;
    return { data: cached, error: null, isLoading: enabled && cached === undefined };
  }

  return { data: state.data, error: state.error, isLoading: state.loading };
};

export const useTenantScreenActivity = (sessionKey: string, screenId: string) => {
  const getSnapshot = useCallback(
    () => getTenantScreenPending(sessionKey, screenId),
    [screenId, sessionKey],
  );
  return useSyncExternalStore(subscribeTenantDataActivity, getSnapshot, getSnapshot);
};

export const useGlobalActivity = () => {
  return useSyncExternalStore(subscribeTenantDataActivity, getTotalPendingCount, getTotalPendingCount);
};
