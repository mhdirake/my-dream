import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError } from '../api/client';
import { authApi, type MeResponse } from '../api/auth';
import { clearSession, isExpired, loadSession, saveSession, type Session } from './storage';

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
  const sessionRef = useRef<Session | null>(null);
  const refreshInFlightRef = useRef(false);

  const doRefresh = useCallback(async (s: Session, blocking = false) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    if (blocking) setIsLoading(true);
    try {
      const token = await authApi.refresh(s.refreshToken);
      const next: Session = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? s.refreshToken,
        expiresAt: Date.now() + (token.expires_in ?? 300) * 1000,
      };
      await saveSession(next);
      sessionRef.current = next;
      setSession(next);
    } catch (error) {
      if (isAuthFailure(error)) {
        await clearSession();
        sessionRef.current = null;
        setSession(null);
        setUser(null);
      }
    } finally {
      refreshInFlightRef.current = false;
      if (blocking) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Auto-refresh: schedule refresh 60s before token expires
  useEffect(() => {
    if (!session) return;
    if (isExpired(session)) {
      doRefresh(session);
      return;
    }
    const msUntilRefresh = session.expiresAt - Date.now() - 60_000;
    const timer = setTimeout(() => doRefresh(session), Math.max(msUntilRefresh, 0));
    return () => clearTimeout(timer);
  }, [session, doRefresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      const current = sessionRef.current;
      if (current && isExpired(current)) doRefresh(current, true);
    });
    return () => sub.remove();
  }, [doRefresh]);

  useEffect(() => {
    (async () => {
      try {
        const s = await loadSession();
        if (!s) return;

        let active = s;
        if (isExpired(s)) {
          if (!s.refreshToken) {
            await clearSession();
            return;
          }
          try {
            const token = await authApi.refresh(s.refreshToken);
            active = {
              accessToken: token.access_token,
              refreshToken: token.refresh_token ?? s.refreshToken,
              expiresAt: Date.now() + (token.expires_in ?? 300) * 1000,
            };
            await saveSession(active);
          } catch (error) {
            if (isAuthFailure(error)) {
              await clearSession();
              return;
            }
            setSession(active);
            return;
          }
        }

        const me = await authApi.me(active.accessToken);
        setSession(active);
        setUser(me);
      } catch (error) {
        if (isAuthFailure(error)) {
          await clearSession();
          setSession(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const loginWithPassword = useCallback(async (username: string, password: string): Promise<Session> => {
    const token = await authApi.login({ username, password });
    const newSession: Session = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? '',
      expiresAt: Date.now() + (token.expires_in ?? 300) * 1000,
    };
    const me = await authApi.me(newSession.accessToken);
    await saveSession(newSession);
    setSession(newSession);
    setUser(me);
    return newSession;
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setSession(null);
    setUser(null);
  }, []);

  const saveRegistrationSession = useCallback(
    async (accessToken: string, refreshToken: string, expiresIn: number) => {
      const newSession: Session = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      // Save session before calling /api/me so the account is never lost
      // even if the me() call fails (e.g. timing issue after registration)
      await saveSession(newSession);
      setSession(newSession);
      try {
        const me = await authApi.me(accessToken);
        setUser(me);
      } catch {
        // Session is saved; user info will load on next app start
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, isAuthenticated: !!session, loginWithPassword, logout, saveRegistrationSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
