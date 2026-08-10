export class ApiClientError extends Error {
  public readonly status: number;
  public readonly payload?: unknown;

  constructor(
    message: string,
    status: number,
    payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const buildDefaultHeaders = (headers?: HeadersInit): HeadersInit => {
  const token = localStorage.getItem('bhs_auth_token');
  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  return {
    ...defaultHeaders,
    ...headers,
  };
};

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 800;

type RetryCallback = (attempt: number, maxAttempts: number, error: unknown) => void;
const retryListeners = new Set<RetryCallback>();

export const subscribeApiRetry = (callback: RetryCallback) => {
  retryListeners.add(callback);
  return () => {
    retryListeners.delete(callback);
  };
};

const notifyRetry = (attempt: number, maxAttempts: number, error: unknown) => {
  retryListeners.forEach((listener) => listener(attempt, maxAttempts, error));
};

async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const isTransientHttp = err instanceof ApiClientError && [502, 503, 504, 500].includes(err.status);
      const isNetworkFailure = !(err instanceof ApiClientError);

      const shouldRetry = (isTransientHttp || isNetworkFailure) && attempt < maxRetries;
      if (!shouldRetry) {
        throw err;
      }

      notifyRetry(attempt + 1, maxRetries, err);
      const delay = RETRY_DELAY_BASE_MS * attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export const apiClient = {
  async get<T>(path: string, init?: RequestInit): Promise<T> {
    return executeWithRetry(async () => {
      const response = await fetch(buildUrl(path), {
        ...init,
        method: 'GET',
        headers: buildDefaultHeaders(init?.headers),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json') ? await response.json() : undefined;

      if (!response.ok) {
        throw new ApiClientError(`API retornou HTTP ${response.status}`, response.status, payload);
      }

      return payload as T;
    });
  },

  async post<TRequest, TResponse>(path: string, body: TRequest, init?: RequestInit): Promise<TResponse> {
    return executeWithRetry(async () => {
      const response = await fetch(buildUrl(path), {
        ...init,
        method: 'POST',
        headers: buildDefaultHeaders({
          'Content-Type': 'application/json',
          ...init?.headers,
        }),
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json') ? await response.json() : undefined;

      if (!response.ok) {
        throw new ApiClientError(`API retornou HTTP ${response.status}`, response.status, payload);
      }

      return payload as TResponse;
    });
  },

  async patch<TRequest, TResponse>(path: string, body: TRequest, init?: RequestInit): Promise<TResponse> {
    return executeWithRetry(async () => {
      const response = await fetch(buildUrl(path), {
        ...init,
        method: 'PATCH',
        headers: buildDefaultHeaders({
          'Content-Type': 'application/json',
          ...init?.headers,
        }),
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json') ? await response.json() : undefined;

      if (!response.ok) {
        throw new ApiClientError(`API retornou HTTP ${response.status}`, response.status, payload);
      }

      return payload as TResponse;
    });
  },

  async put<TRequest, TResponse>(path: string, body: TRequest, init?: RequestInit): Promise<TResponse> {
    return executeWithRetry(async () => {
      const response = await fetch(buildUrl(path), {
        ...init,
        method: 'PUT',
        headers: buildDefaultHeaders({
          'Content-Type': 'application/json',
          ...init?.headers,
        }),
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json') ? await response.json() : undefined;

      if (!response.ok) {
        throw new ApiClientError(`API retornou HTTP ${response.status}`, response.status, payload);
      }

      return payload as TResponse;
    });
  },

  async delete<T>(path: string, init?: RequestInit): Promise<T> {
    return executeWithRetry(async () => {
      const response = await fetch(buildUrl(path), {
        ...init,
        method: 'DELETE',
        headers: buildDefaultHeaders(init?.headers),
      });
      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json') ? await response.json() : undefined;
      if (!response.ok) {
        throw new ApiClientError(`API retornou HTTP ${response.status}`, response.status, payload);
      }
      return payload as T;
    });
  },
};
