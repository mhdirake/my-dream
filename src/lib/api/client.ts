const BASE = process.env.EXPO_PUBLIC_API_URL!;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: object,
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? data?.detail ?? `HTTP ${res.status}`);
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
};
