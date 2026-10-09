import { describe, expect, it, vi } from 'vitest';
import { SessionController } from './sessionController';
import type { Session } from './storage';

function session(id = 'a'): Session {
  return { accessToken: `access-${id}`, refreshToken: `refresh-${id}`, expiresAt: Date.now() + 300_000 };
}
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function controller(renew: (s: Session) => Promise<Session>) {
  const persist = vi.fn<(value: Session | null) => Promise<void>>().mockResolvedValue(undefined);
  const changed = vi.fn();
  return { auth: new SessionController(renew, persist, changed, e => e === 'invalid'), persist, changed };
}

describe('session refresh', () => {
  it('shares one refresh across startup, foreground and parallel API requests', async () => {
    const task = pending<Session>();
    const renew = vi.fn(() => task.promise);
    const { auth } = controller(renew);
    await auth.replace({ ...session(), expiresAt: 0 });
    const requests = [auth.refresh(), auth.refresh(), auth.accessToken('access-a')];
    expect(renew).toHaveBeenCalledTimes(1);
    task.resolve(session('rotated'));
    await Promise.all(requests);
    expect(auth.session?.refreshToken).toBe('refresh-rotated');
    expect(await auth.accessToken('access-a', true)).toBe('access-rotated');
    expect(renew).toHaveBeenCalledTimes(1);
  });

  it('does not restore an old account after logout or a new login', async () => {
    const task = pending<Session>();
    const { auth, persist } = controller(() => task.promise);
    await auth.replace(session('old'));
    const refreshing = auth.accessToken('access-old', true);
    await auth.replace(null);
    const newAccount = session('new');
    await auth.replace(newAccount);
    task.resolve(session('stale'));
    expect(await refreshing).toBeUndefined();
    expect(auth.session).toEqual(newAccount);
    expect(persist.mock.calls.some(([value]) => (value as Session | null)?.accessToken === 'access-stale')).toBe(false);
    expect(await auth.accessToken('access-old', true)).toBeUndefined();
  });

  it('does not clear the new account when the previous refresh is rejected', async () => {
    const task = pending<Session>();
    const { auth } = controller(() => task.promise);
    await auth.replace(session('old-reject'));
    const refreshing = auth.refresh();
    await auth.replace(session('new-reject'));
    task.reject('invalid');
    await expect(refreshing).rejects.toBe('invalid');
    expect(auth.session?.accessToken).toBe('access-new-reject');
  });

  it('keeps the session on rate limiting and permits a later refresh', async () => {
    const renew = vi.fn().mockRejectedValueOnce('429').mockResolvedValueOnce(session('retry'));
    const { auth } = controller(renew);
    await auth.replace(session('rate'));
    await expect(auth.refresh()).rejects.toBe('429');
    expect(auth.session?.accessToken).toBe('access-rate');
    await auth.refresh();
    expect(auth.session?.accessToken).toBe('access-retry');
  });

  it('clears only the active invalid session', async () => {
    const { auth } = controller(async () => { throw 'invalid'; });
    await auth.replace(session('invalid'));
    await expect(auth.refresh()).rejects.toBe('invalid');
    expect(auth.session).toBeNull();
  });

  it('shares a network refresh across overlapping provider instances', async () => {
    const task = pending<Session>();
    const renew = vi.fn(() => task.promise);
    const first = controller(renew).auth;
    const second = controller(renew).auth;
    await first.replace(session('shared'));
    await second.replace(session('shared'));
    const requests = [first.refresh(), second.refresh()];
    task.resolve(session('shared-new'));
    await Promise.all(requests);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(first.session).toEqual(second.session);
  });
});
