const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export function getAuthToken(): string | null {
  return localStorage.getItem('token'); // adjust key if yours differs
}

export function setAuthToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('token');
}

// ─── Core request ─────────────────────────────────────────────────────────────

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Inject Bearer token when available — fixes 401/404 from protected routes
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // Always try to parse JSON — even error responses carry a message/detail body
  let json: {
    success?: boolean;
    message?: string;
    detail?: string;
    data?: unknown;
  } | null = null;

  try {
    json = await res.json();
  } catch {
    json = null;
  }

  // 401 = token missing or expired → clear stale token and redirect to login
  if (res.status === 401) {
    clearAuthToken();
    window.location.href = '/login'; // adjust to your router path
    throw new Error('Session expired. Please log in again.');
  }

  // 403 = authenticated but not authorised
  if (res.status === 403) {
    throw new Error(json?.detail || json?.message || 'You do not have permission to perform this action.');
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || json?.detail || `API error ${res.status}`);
  }

  // Your backend wraps responses in { success, data, message }
  // Fall back to the whole json body for endpoints that don't wrap (e.g. raw lists)
  return (json?.data ?? json) as T;
}

// ─── Typed API surface ────────────────────────────────────────────────────────

export const api = {
  get:    <T>(path: string)                => apiRequest<T>(path),
  post:   <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST',   body: JSON.stringify(body ?? {}) }),
  patch:  <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH',  body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string)                => apiRequest<T>(path, { method: 'DELETE' }),
};