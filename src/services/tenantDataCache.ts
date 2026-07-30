type CacheEntry<T> = {
  data?: T;
  promise?: Promise<T>;
};

const cache = new Map<string, CacheEntry<unknown>>();
const keyVersions = new Map<string, number>();
const pendingByScreen = new Map<string, number>();
const activityListeners = new Set<() => void>();
let cacheGeneration = 0;

const screenPrefixFromKey = (key: string) => key.split('|').slice(0, 2).join('|');

const updatePending = (key: string, delta: number) => {
  const prefix = screenPrefixFromKey(key);
  const next = Math.max(0, (pendingByScreen.get(prefix) ?? 0) + delta);
  if (next === 0) pendingByScreen.delete(prefix);
  else pendingByScreen.set(prefix, next);
  activityListeners.forEach(listener => listener());
};

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

export const tenantSessionKey = (clientSlug?: string | null, userId?: string | null) =>
  `${clientSlug || 'staff'}:${userId || 'anonymous'}`;

export const tenantCacheKey = (
  sessionKey: string,
  screenId: string,
  resourceId: string,
  params: unknown,
) => `${sessionKey}|${screenId}|${resourceId}|${stableSerialize(params)}`;

export const getCachedTenantData = <T>(key: string): T | undefined =>
  cache.get(key)?.data as T | undefined;

export const loadTenantData = <T>(key: string, loader: () => Promise<T>): Promise<T> => {
  const current = cache.get(key) as CacheEntry<T> | undefined;
  if (current?.data !== undefined) return Promise.resolve(current.data);
  if (current?.promise) return current.promise;

  const generation = cacheGeneration;
  const keyVersion = keyVersions.get(key) ?? 0;
  updatePending(key, 1);
  const promise = loader()
    .then((data) => {
      if (cacheGeneration === generation && (keyVersions.get(key) ?? 0) === keyVersion) {
        cache.set(key, { data });
      }
      return data;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    })
    .finally(() => updatePending(key, -1));

  cache.set(key, { promise });
  return promise;
};

export const invalidateTenantScreen = (sessionKey: string, screenId: string) => {
  const prefix = `${sessionKey}|${screenId}|`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      keyVersions.set(key, (keyVersions.get(key) ?? 0) + 1);
    }
  }
};

export const clearTenantDataCache = () => {
  cacheGeneration += 1;
  cache.clear();
  keyVersions.clear();
  pendingByScreen.clear();
  activityListeners.forEach(listener => listener());
};

export const subscribeTenantDataActivity = (listener: () => void) => {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
};

export const getTenantScreenPending = (sessionKey: string, screenId: string) =>
  pendingByScreen.get(`${sessionKey}|${screenId}`) ?? 0;
