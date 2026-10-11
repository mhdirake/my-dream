import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, loadAccountSession, loadSession, refreshRememberedSession, saveSession, store } from './storage';
vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) };
}
beforeEach(() => {
  vi.stubGlobal('sessionStorage', memoryStorage());
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('navigator', {});
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
  it('restores the last account after closing all tabs for less than thirty days', async () => {
    const rememberUntil = Date.now() + 30 * 86400000;
    await saveSession({ userId: 10, accessToken: 'a', refreshToken: 'r', expiresAt: 1, rememberUntil });
    vi.stubGlobal('sessionStorage', memoryStorage());
    expect(await loadSession()).toMatchObject({ userId: 10, refreshToken: 'r', rememberUntil });
  });
  it('does not restore sessions past their thirty-day local deadline', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    await saveSession({ userId: 10, accessToken: 'a', refreshToken: 'r', expiresAt: now, rememberUntil: now + 30 * 86400000 });
    vi.stubGlobal('sessionStorage', memoryStorage());
    vi.spyOn(Date, 'now').mockReturnValue(now + 31 * 86400000);
    expect(await loadSession()).toBeNull();
    vi.restoreAllMocks();
  });
  it('removes the account backup on logout without removing other accounts', async () => {
    const tab = memoryStorage();
    vi.stubGlobal('sessionStorage', tab);
    await saveSession({ userId: 1, accessToken: 'a1', refreshToken: 'r1', expiresAt: 9999999999999 });
    vi.stubGlobal('sessionStorage', memoryStorage());
    await saveSession({ userId: 2, accessToken: 'a2', refreshToken: 'r2', expiresAt: 9999999999999 });
    await clearSession();
    expect(loadAccountSession(2)).toBeNull();
    expect(loadAccountSession(1)?.userId).toBe(1);
  });
  it('uses the rotated account token instead of replaying a stale tab token', async () => {
    const stale = { userId: 1, accessToken: 'old', refreshToken: 'old-r', expiresAt: 1 };
    const fresh = { ...stale, accessToken: 'fresh', refreshToken: 'fresh-r', expiresAt: Date.now() + 60000 };
    await saveSession(fresh);
    const renew = vi.fn();
    expect((await refreshRememberedSession(stale, renew)).accessToken).toBe('fresh');
    expect(renew).not.toHaveBeenCalled();
  });
  it('cannot restore a session after logout while refresh was in flight', async () => {
    const session = { userId: 1, accessToken: 'old', refreshToken: 'old-r', expiresAt: 1 };
    await saveSession(session);
    let accept = true;
    const refreshed = await refreshRememberedSession(session, async current => {
      await clearSession();
      accept = false;
      return { ...current, accessToken: 'new', refreshToken: 'new-r' };
    }, () => accept);
    expect(refreshed.accessToken).toBe('new');
    expect(await loadSession()).toBeNull();
    expect(loadAccountSession(1)).toBeNull();
  });
  it('serializes simultaneous same-account tab refreshes with Web Locks', async () => {
    let queue = Promise.resolve();
    const request = vi.fn((_key: string, run: () => Promise<unknown>) => {
      const next = queue.then(run);
      queue = next.then(() => undefined);
      return next;
    });
    vi.stubGlobal('navigator', { locks: { request } });
    const old = { userId: 1, accessToken: 'old', refreshToken: 'old-r', expiresAt: 1 };
    await saveSession(old);
    const renew = vi.fn(async current => ({ ...current, accessToken: 'new', refreshToken: 'new-r', expiresAt: Date.now() + 60000 }));
    const sessions = await Promise.all([refreshRememberedSession(old, renew), refreshRememberedSession(old, renew)]);
    expect(sessions.map(session => session.accessToken)).toEqual(['new', 'new']);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
