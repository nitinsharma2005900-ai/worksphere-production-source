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

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
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
