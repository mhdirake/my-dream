import { Platform } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from './url';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  Object.assign(Platform, { OS: 'ios' });
});

describe('apiUrl', () => {
  it('uses the same-origin proxy on local development web', () => {
    vi.stubGlobal('__DEV__', true);
    vi.stubGlobal('window', {});
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://mydream-api.mikdev.ir');
    Object.assign(Platform, { OS: 'web' });

    expect(apiUrl('/api/client/profile')).toBe('/__dev_api/api/client/profile');
  });

  it('keeps the configured API URL for native and production web', () => {
    vi.stubGlobal('__DEV__', true);
    vi.stubGlobal('window', {});
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://mydream-api.mikdev.ir');

    expect(apiUrl('/api/client/profile')).toBe('https://mydream-api.mikdev.ir/api/client/profile');

    Object.assign(Platform, { OS: 'web' });
    vi.stubGlobal('__DEV__', false);
    expect(apiUrl('/api/client/profile')).toBe('https://mydream-api.mikdev.ir/api/client/profile');
  });
});
