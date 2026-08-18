const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const TOKEN_KEY = 'bhs_auth_token';
const REFRESH_WINDOW_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000;

const AUTH_EXPIRED_EVENT = 'bhs:auth-expired';

const decodeExp = (token: string): number | null => {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const payload: unknown = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload === 'object' && payload !== null && typeof (payload as { exp?: unknown }).exp === 'number'
      ? (payload as { exp: number }).exp * 1000
      : null;
  } catch {
    return null;
  }
};

const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const notifyAuthExpired = () => window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let refreshing: Promise<string> | null = null;

const cancelTimers = () => {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  refreshTimer = undefined;
  heartbeatTimer = undefined;
};

const scheduleAutoRefresh = (token: string) => {
  cancelTimers();
  const exp = decodeExp(token);
  if (!exp) return;
  const refreshDelay = Math.max(60_000, exp - Date.now() - REFRESH_WINDOW_MS);
  refreshTimer = setTimeout(() => {
    refreshAuthToken().catch(() => notifyAuthExpired());
  }, refreshDelay);
  heartbeatTimer = setInterval(() => {
    ensureFreshToken().catch(() => notifyAuthExpired());
  }, HEARTBEAT_INTERVAL_MS);
};

export const storeSession = (accessToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  scheduleAutoRefresh(accessToken);
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  cancelTimers();
};

export const refreshAuthToken = async (): Promise<string> => {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const current = getStoredToken();
    if (!current) throw new Error('Sem sessao ativa para renovar.');
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${current}` },
    });
    if (!response.ok) throw new Error(`Falha ao renovar sessao (HTTP ${response.status}).`);
    const payload = (await response.json()) as { access_token?: unknown };
    if (typeof payload.access_token !== 'string') throw new Error('Resposta de renovacao invalida.');
    storeSession(payload.access_token);
    return payload.access_token;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
};

export const ensureFreshToken = async (): Promise<string | null> => {
  const token = getStoredToken();
  if (!token) return null;
  const exp = decodeExp(token);
  if (exp == null) return token;
  if (Date.now() <= exp - REFRESH_WINDOW_MS) return token;
  return refreshAuthToken();
};
