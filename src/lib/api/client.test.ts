import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, registerAuthHandlers } from './client';
vi.mock('./url', () => ({ apiUrl: (path: string) => `https://api.test${path}` }));
let unregister: (() => void) | undefined;
afterEach(() => { unregister?.(); vi.unstubAllGlobals(); });

describe('authenticated API retries', () => {
  it('retries an authenticated request only once after a shared refresh', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}'));
    vi.stubGlobal('fetch', fetcher);
    const accessToken = vi.fn(async (_token: string, force?: boolean) => force ? 'new' : 'old');
    unregister = registerAuthHandlers({ accessToken });
    expect(await api.get('/api/client/conversations', 'old')).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer new');
    expect(accessToken).toHaveBeenLastCalledWith('old', true);
  });
  it('does not loop when the retried token is rejected', async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    unregister = registerAuthHandlers({ accessToken: async () => 'new' });
    await expect(api.get('/api/me', 'old')).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not try to refresh a rejected refresh request', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    const accessToken = vi.fn();
    unregister = registerAuthHandlers({ accessToken });
    await expect(api.post('/api/auth/refresh', { refresh_token: 'invalid' })).rejects.toBeInstanceOf(ApiError);
    expect(accessToken).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('exposes Retry-After without retrying a rate-limited mutation', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 429, headers: { 'Retry-After': '45' } }));
    vi.stubGlobal('fetch', fetcher);
    await expect(api.post('/api/auth/refresh', {})).rejects.toMatchObject({ status: 429, retryAfterSeconds: 45 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
