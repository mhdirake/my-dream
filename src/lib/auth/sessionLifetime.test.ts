import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleSessionDeadline, sessionDeadline } from './sessionLifetime';

afterEach(() => { vi.useRealTimers(); });

describe('thirty-day backend session lifetime', () => {
  it('uses the fixed server deadline instead of the compatibility lifetime', () => {
    const deadline = Date.now() + 30 * 86400000;
    expect(sessionDeadline({ expires_in: 86400, session_expires_at: new Date(deadline).toISOString() })).toBe(deadline);
    expect(sessionDeadline({ expires_in: 300 }, 1000)).toBe(301000);
  });

  it('does not overflow timers or refresh during the thirty-day session', () => {
    vi.useFakeTimers();
    const expired = vi.fn();
    const cancel = scheduleSessionDeadline({ accessToken: 'local', refreshToken: 'local', backendManaged: true, expiresAt: Date.now() + 30 * 86400000 }, expired);
    vi.advanceTimersByTime(29 * 86400000);
    expect(expired).not.toHaveBeenCalled();
    vi.advanceTimersByTime(86400000);
    expect(expired).toHaveBeenCalledTimes(1);
    cancel();
  });

  it('cancels pending expiry on logout or account changes', () => {
    vi.useFakeTimers();
    const expired = vi.fn();
    const cancel = scheduleSessionDeadline({ accessToken: 'a', refreshToken: 'r', backendManaged: true, expiresAt: Date.now() + 86400000 }, expired);
    cancel();
    vi.advanceTimersByTime(30 * 86400000);
    expect(expired).not.toHaveBeenCalled();
  });

  it('retains the legacy early-refresh deadline', () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    scheduleSessionDeadline({ accessToken: 'jwt', refreshToken: 'offline', expiresAt: Date.now() + 300000 }, refresh);
    vi.advanceTimersByTime(240000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
