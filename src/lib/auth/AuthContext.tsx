import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, registerAuthHandlers } from '../api/client';
import { authApi, type MeResponse } from '../api/auth';
import { clearSession, isExpired, loadSession, refreshRememberedSession, saveSession, type Session } from './storage';
import { SessionController } from './sessionController';

export type AuthUser = MeResponse;
type AuthCtx = {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithPassword: (username: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
  saveRegistrationSession: (accessToken: string, refreshToken: string, expiresIn: number) => Promise<void>;
};
const AuthContext = createContext<AuthCtx | null>(null);
function isAuthFailure(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [controller] = useState<SessionController>((): SessionController => new SessionController(
      async (s): Promise<Session> => {
        const version: number = controller.version;
        return refreshRememberedSession(s, async current => {
        s = current;
        if (!s.refreshToken) throw new ApiError(401, 'Unauthenticated');
        const token = await authApi.refresh(s.refreshToken);
        return {
          ...s, accessToken: token.access_token,
          refreshToken: token.refresh_token ?? s.refreshToken,
          expiresAt: Date.now() + (token.expires_in ?? 300) * 1000,
        };
        }, (): boolean => controller.version === version);
      },
      s => s ? saveSession(s) : clearSession(),
      s => { setSession(s); if (!s) setUser(null); },
      isAuthFailure,
    ));

  const doRefresh = useCallback(async function refreshWithRetry() {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    try { await controller.refresh(); }
    catch (error) {
      if (!isAuthFailure(error) && controller.session) {
        const delay = error instanceof ApiError ? error.retryAfterSeconds ?? 30 : 30;
        retryTimer.current = setTimeout(() => { void refreshWithRetry(); }, Math.max(5, delay) * 1000);
      }
    }
  }, [controller]);

  useEffect(() => registerAuthHandlers({ accessToken: (token, force) => controller.accessToken(token, force) }), [controller]);

  useEffect(() => {
    if (!session) return;
    const delay = Math.max(session.expiresAt - Date.now() - 60_000, 0);
    const timer = setTimeout(() => { void doRefresh(); }, delay);
    return () => clearTimeout(timer);
  }, [session, doRefresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && controller.session && isExpired(controller.session)) void doRefresh();
    });
    return () => { sub.remove(); if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [controller, doRefresh]);

  useEffect(() => {
    let cancelled = false;
    const version = controller.version;
    (async () => {
      try {
        const saved = await loadSession();
        if (cancelled || controller.version !== version || !saved) return;
        await controller.replace(saved);
        const restoredVersion = controller.version;
        let active = saved;
        if (isExpired(saved)) {
          const renewed = await controller.refresh();
          if (!renewed || cancelled || controller.version !== restoredVersion) return;
          active = renewed;
        }
        const me = await authApi.me(active.accessToken);
        if (cancelled || controller.version !== restoredVersion || !controller.session) return;
        await controller.replace({ ...controller.session, userId: me.id });
        setUser(me);
      } catch (error) {
        if (!cancelled && isAuthFailure(error) && controller.version <= version + 1) await controller.replace(null);
        else if (!cancelled && controller.session) void doRefresh();
      } finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [controller, doRefresh]);

  const loginWithPassword = useCallback(async (username: string, password: string): Promise<Session> => {
    const version = controller.version;
    const token = await authApi.login({ username, password });
    const next: Session = {
      accessToken: token.access_token, refreshToken: token.refresh_token ?? '',
      expiresAt: Date.now() + (token.expires_in ?? 300) * 1000,
      rememberUntil: Date.now() + 30 * 86400000,
    };
    const me = await authApi.me(next.accessToken);
    if (controller.version !== version) throw new ApiError(409, 'Login was cancelled');
    next.userId = me.id;
    await controller.replace(next);
    setUser(me);
    return next;
  }, [controller]);

  const logout = useCallback(async () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const previous = controller.session;
    await controller.replace(null);
    if (previous?.refreshToken) {
      await authApi.logout(previous.accessToken, previous.refreshToken).catch(() => {
        // Local logout still completes if the identity service is unavailable.
      });
    }
  }, [controller]);

  const saveRegistrationSession = useCallback(async (accessToken: string, refreshToken: string, expiresIn: number) => {
    const next: Session = { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000, rememberUntil: Date.now() + 30 * 86400000 };
    await controller.replace(next);
    const version = controller.version;
    try {
      const me = await authApi.me(accessToken);
      if (controller.version !== version) return;
      await controller.replace({ ...controller.session!, userId: me.id });
      setUser(me);
    } catch { /* The saved account remains available for offline terms checks. */ }
  }, [controller]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAuthenticated: !!session, loginWithPassword, logout, saveRegistrationSession }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
