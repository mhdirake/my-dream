import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../../app/__dev_api/[...path]+api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('development API proxy', () => {
  it('forwards an authenticated GET and query to the configured API', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://mydream-api.mikdev.ir');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"data":[]}', {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://mydream.mikdev.ir',
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost:8081/__dev_api/api/client/profile?limit=2', {
      headers: { Authorization: 'Bearer test-token' },
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://mydream-api.mikdev.ir/api/client/profile?limit=2',
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer test-token');
    expect(headers.get('origin')).toBeNull();
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(await response.json()).toEqual({ data: [] });
  });

  it('forwards a multipart POST body and preserves the response status', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://mydream-api.mikdev.ir');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(new Request('http://localhost:8081/__dev_api/api/client/profile/voice-intro', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=test', Authorization: 'Bearer test-token' },
      body: 'multipart-body',
    }));

    const requestOptions = fetchMock.mock.calls[0][1];
    expect(requestOptions.headers.get('content-type')).toBe('multipart/form-data; boundary=test');
    expect(new TextDecoder().decode(requestOptions.body)).toBe('multipart-body');
    expect(response.status).toBe(201);
  });

  it('is unavailable in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('https://mydream.mikdev.ir/__dev_api/api/client/profile'));

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
