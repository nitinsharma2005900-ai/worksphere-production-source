import { reconnectSocket } from './socket';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  public status: number;
  public code: string;
  public details?: any;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

const clearStoredSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('worksphere_token');
  localStorage.removeItem('worksphere_refresh_token');
  localStorage.removeItem('worksphere_org_id');
  localStorage.removeItem('worksphere_role');
  window.dispatchEvent(new Event('worksphere:session-expired'));
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem('worksphere_refresh_token');
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.data?.accessToken || !payload.data?.refreshToken) {
        clearStoredSession();
        return null;
      }

      localStorage.setItem('worksphere_token', payload.data.accessToken);
      localStorage.setItem('worksphere_refresh_token', payload.data.refreshToken);
      reconnectSocket();
      return payload.data.accessToken as string;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  retriedAfterRefresh = false
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('worksphere_token') : null;
  const currentOrgId = typeof window !== 'undefined' ? localStorage.getItem('worksphere_org_id') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (currentOrgId) {
    headers['X-Organization-ID'] = currentOrgId;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  const isRefreshableRequest = !['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].includes(endpoint);
  if (response.status === 401 && !retriedAfterRefresh && isRefreshableRequest) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return apiClient<T>(endpoint, options, true);
    }
  }

  if (!response.ok) {
    const errorObj = data.error || {};
    throw new ApiError(
      errorObj.message || `API error (${response.status})`,
      response.status,
      errorObj.code || 'UNKNOWN_ERROR',
      errorObj.details
    );
  }

  return data.data as T;
}
