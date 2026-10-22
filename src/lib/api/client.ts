import { coinBalanceStore, isCoinMutation } from '../coinBalanceStore';
import { localizeErrorMessage } from '@/lib/localization';
import { apiUrl } from './url';

export class ApiError extends Error {
  constructor(
    public status: number,
    public rawMessage: string,
    public data?: unknown,
    public retryAfterSeconds?: number,
  ) {
    super(localizeErrorMessage(rawMessage, status));
    this.name = 'ApiError';
  }
}

type AuthHandlers = {
  accessToken: (token: string, forceRefresh?: boolean) => Promise<string | undefined>;
};
let authHandlers: AuthHandlers | null = null;
export function registerAuthHandlers(handlers: AuthHandlers): () => void {
  authHandlers = handlers;
  return () => { if (authHandlers === handlers) authHandlers = null; };
}

const termsListeners = new Set<(token?: string) => void>();
export function onTermsRequired(listener: (token?: string) => void): () => void {
  termsListeners.add(listener); return () => { termsListeners.delete(listener); };
}

async function request<T>(
  method: string,
  path: string,
  body?: object,
  token?: string,
  retried = false,
): Promise<T> {
  const authenticated = !!token && !path.startsWith('/api/auth/');
  if (authenticated && !retried && authHandlers) {
    token = await authHandlers.accessToken(token!) ?? token;
  }
  const walletStamp = coinBalanceStore.capture(token);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let res: Response;

  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(408, 'Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && authenticated && !retried && authHandlers) {
      const renewed = await authHandlers.accessToken(token!, true);
      if (renewed) return request<T>(method, path, body, renewed, true);
    }
    if (data?.code === 'TERMS_ACCEPTANCE_REQUIRED') termsListeners.forEach(listener => listener(token));
    const validationMessage = data?.errors
      ? Object.values(data.errors).flat().find(value => typeof value === 'string')
      : undefined;
    throw new ApiError(
      res.status,
      String(validationMessage ?? data?.error_description ?? data?.message ?? data?.detail ?? data?.error ?? `HTTP ${res.status}`),
      data,
      Number(res.headers.get('Retry-After')) || undefined,
    );
  }

  coinBalanceStore.observe(token, data, walletStamp, method === 'GET');
  if (method !== 'GET' && isCoinMutation(path)) coinBalanceStore.invalidate(token);
  return data as T;
}

export const api = {
  post: <T>(path: string, body?: object, token?: string) =>
    request<T>('POST', path, body, token),
  get: <T>(path: string, token?: string) =>
    request<T>('GET', path, undefined, token),
  put: <T>(path: string, body?: object, token?: string) =>
    request<T>('PUT', path, body, token),
  patch: <T>(path: string, body?: object, token?: string) =>
    request<T>('PATCH', path, body, token),
  delete: <T>(path: string, token?: string) =>
    request<T>('DELETE', path, undefined, token),
};
