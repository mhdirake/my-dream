import { localizeErrorMessage } from '@/lib/localization';
import { apiUrl } from './url';

export class ApiError extends Error {
  constructor(
    public status: number,
    public rawMessage: string,
    public data?: unknown,
  ) {
    super(localizeErrorMessage(rawMessage, status));
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: object,
  token?: string,
): Promise<T> {
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
    const validationMessage = data?.errors
      ? Object.values(data.errors).flat().find(value => typeof value === 'string')
      : undefined;
    throw new ApiError(
      res.status,
      String(validationMessage ?? data?.error_description ?? data?.message ?? data?.detail ?? data?.error ?? `HTTP ${res.status}`),
      data,
    );
  }

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
