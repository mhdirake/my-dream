import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { KC, KC_DISCOVERY } from './config';
import { clearSession, isExpired, loadSession, saveSession, type Session } from './storage';

// Required: closes the browser tab when Keycloak redirects back
WebBrowser.maybeCompleteAuthSession();

// ── Types ─────────────────────────────────────────────────────────
export type AuthUser = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  preferred_username?: string;
};

type AuthCtx = {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoginReady: boolean;
  login: () => void;
  logout: () => Promise<void>;
  saveRegistrationSession: (accessToken: string, refreshToken: string, expiresIn: number, idToken?: string) => Promise<void>;
};

// ── Context ───────────────────────────────────────────────────────
const AuthContext = createContext<AuthCtx | null>(null);

// ── Shared request config ─────────────────────────────────────────
const redirectUri = AuthSession.makeRedirectUri({ scheme: KC.scheme });
console.log('[Auth] redirectUri =', redirectUri);

// clientSecret goes to token exchange only, NOT to the auth request
const requestConfig: AuthSession.AuthRequestConfig = {
  clientId: KC.clientId,
  scopes: KC.scopes,
  redirectUri,
  usePKCE: true,
};

// ── Provider ──────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [loginReq, loginResp, loginPrompt] = AuthSession.useAuthRequest(requestConfig, KC_DISCOVERY);

  // ── Load persisted session on mount ──────────────────────────
  useEffect(() => {
    loadSession()
      .then((s) => {
        // Discard expired sessions without refresh token
        if (s && isExpired(s) && !s.refreshToken) return null;
        return s;
      })
      .then(setSession)
      .finally(() => setIsLoading(false));
  }, []);

  // ── Handle auth code → token exchange ────────────────────────
  const exchange = useCallback(
    async (resp: AuthSession.AuthSessionResult, req: AuthSession.AuthRequest | null) => {
      if (resp.type !== 'success' || !req?.codeVerifier || !KC_DISCOVERY) return;

      try {
        const token = await AuthSession.exchangeCodeAsync(
          {
            clientId: KC.clientId,
            clientSecret: KC.clientSecret || undefined,
            code: resp.params.code,
            redirectUri,
            extraParams: { code_verifier: req.codeVerifier },
          },
          KC_DISCOVERY,
        );

        const newSession: Session = {
          accessToken:  token.accessToken,
          refreshToken: token.refreshToken ?? '',
          idToken:      token.idToken ?? '',
          expiresAt:    (token.issuedAt + (token.expiresIn ?? 300)) * 1000,
        };

        await saveSession(newSession);
        setSession(newSession);
      } catch (err) {
        console.error('[Auth] Token exchange failed:', err);
      }
    },
    [KC_DISCOVERY],
  );

  useEffect(() => { if (loginResp) exchange(loginResp, loginReq); }, [loginResp]);

  // ── Public actions ────────────────────────────────────────────
  // Guard: KC_DISCOVERY + request must be ready before prompting
  const login = useCallback(() => {
    if (!loginReq) return;
    console.log('[Auth] auth URL =', loginReq.url);
    loginPrompt();
  }, [loginPrompt, loginReq]);

  const logout = useCallback(async () => {
    await clearSession();
    setSession(null);
    // Optional: also end Keycloak server session
    if (KC_DISCOVERY?.endSessionEndpoint) {
      await WebBrowser.openBrowserAsync(
        `${KC_DISCOVERY.endSessionEndpoint}?client_id=${KC.clientId}&post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`,
      ).catch(() => {});
    }
  }, [KC_DISCOVERY]);

  const saveRegistrationSession = useCallback(
    async (accessToken: string, refreshToken: string, expiresIn: number, idToken = '') => {
      const newSession: Session = {
        accessToken,
        refreshToken,
        idToken,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      await saveSession(newSession);
      setSession(newSession);
    },
    [],
  );

  const user = session?.idToken ? parseIdToken(session.idToken) : null;

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, isAuthenticated: !!session, isLoginReady: !!loginReq && !!KC_DISCOVERY, login, logout, saveRegistrationSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────
export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────
function base64UrlDecode(str: string): string {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
  return atob(padded);
}

function parseIdToken(idToken: string): AuthUser | null {
  try {
    const payload = idToken.split('.')[1];
    return JSON.parse(base64UrlDecode(payload)) as AuthUser;
  } catch {
    return null;
  }
}
