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

export const apiClient = {
  async get<T>(path: string, init?: RequestInit): Promise<T> {
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
  },

  async post<TRequest, TResponse>(path: string, body: TRequest, init?: RequestInit): Promise<TResponse> {
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
  },

  async patch<TRequest, TResponse>(path: string, body: TRequest, init?: RequestInit): Promise<TResponse> {
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
  },

  async put<TRequest, TResponse>(path: string, body: TRequest, init?: RequestInit): Promise<TResponse> {
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
  },

  async delete<T>(path: string, init?: RequestInit): Promise<T> {
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
  },
};
