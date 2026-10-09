import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, loadSession, saveSession, store } from './storage';
vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) };
}
beforeEach(() => {
  vi.stubGlobal('sessionStorage', memoryStorage());
  vi.stubGlobal('localStorage', memoryStorage());
});
describe('web account storage', () => {
  it('isolates four accounts in four tab sessions while retaining each after reload', async () => {
    const tabs = Array.from({ length: 4 }, memoryStorage);
    for (let index = 0; index < tabs.length; index++) {
      vi.stubGlobal('sessionStorage', tabs[index]);
      await saveSession({ userId: index + 1, accessToken: `a${index}`, refreshToken: `r${index}`, expiresAt: 9999999999999 });
    }
    for (let index = 0; index < tabs.length; index++) {
      vi.stubGlobal('sessionStorage', tabs[index]);
      expect((await loadSession())?.userId).toBe(index + 1);
    }
    await clearSession();
    vi.stubGlobal('sessionStorage', tabs[0]);
    expect((await loadSession())?.userId).toBe(1);
  });
  it('does not import a legacy shared refresh token', async () => {
    localStorage.setItem('session', JSON.stringify({ accessToken: 'legacy', refreshToken: 'shared', expiresAt: 9999999999999 }));
    expect(await loadSession()).toBeNull();
    expect(localStorage.getItem('session')).toBeNull();
  });
  it('keeps non-session preferences in persistent storage', async () => {
    await store.set('preferences', 'saved');
    expect(localStorage.getItem('preferences')).toBe('saved');
  });
  it('handles malformed saved sessions without crashing startup', async () => {
    sessionStorage.setItem('session', 'invalid');
    expect(await loadSession()).toBeNull();
  });
});
