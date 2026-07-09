export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ACCESS_KEY = 'arb_access';
const REFRESH_KEY = 'arb_refresh';

export const tokenStore = {
  get access() {
    return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;
  },
  get refresh() {
    return typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  details?: any;
  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface Opts {
  method?: string;
  body?: any;
  auth?: boolean;
  isForm?: boolean;
  retry?: boolean;
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  tokenStore.set(data.accessToken, data.refreshToken);
  return true;
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  let body: any = undefined;
  if (opts.body !== undefined) {
    if (opts.isForm) {
      body = opts.body; // FormData
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, { method: opts.method ?? 'GET', headers, body });

  if (res.status === 401 && opts.auth && !opts.retry) {
    if (await refreshTokens()) return api<T>(path, { ...opts, retry: true });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || 'Request failed', data?.details);
  }
  return data as T;
}
