import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'session';
const ACCOUNT_PREFIX = 'mydream.session.account.';
const LAST_ACCOUNT = 'mydream.session.last-account';
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

function webStorage(key: string): Storage {
  return key === KEY ? sessionStorage : localStorage;
}

export type Session = {
  accessToken: string;
  userId?: number;
  refreshToken: string;
  expiresAt: number; // Unix ms
  rememberUntil?: number;
};

// ── Platform-aware storage ────────────────────────────────────────
// Keep authentication tab-local on web; native sessions remain in SecureStore.
export const store = {
  get: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return Promise.resolve(webStorage(key).getItem(key)); }
      catch { return Promise.resolve(null); }
    }
    return SecureStore.getItemAsync(key);
  },
  set: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { webStorage(key).setItem(key, value); } catch {}
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  del: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { webStorage(key).removeItem(key); } catch {}
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// ── Public API ────────────────────────────────────────────────────
export async function saveSession(session: Session): Promise<void> {
  const saved = { ...session, rememberUntil: session.rememberUntil ?? Date.now() + REMEMBER_MS };
  await store.set(KEY, JSON.stringify(saved));
  if (Platform.OS === 'web' && saved.userId && saved.rememberUntil > Date.now()) {
    try {
      localStorage.setItem(ACCOUNT_PREFIX + saved.userId, JSON.stringify(saved));
      localStorage.setItem(LAST_ACCOUNT, String(saved.userId));
    } catch { /* Private browsing may disallow durable storage. */ }
  }
}

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (typeof session.accessToken !== 'string' || typeof session.refreshToken !== 'string'
      || !Number.isFinite(session.expiresAt)
      || (session.rememberUntil !== undefined && (!Number.isFinite(session.rememberUntil) || session.rememberUntil <= Date.now()))) return null;
    return session;
  } catch { return null; }
}

export function loadAccountSession(userId: number): Session | null {
  if (Platform.OS !== 'web') return null;
  try {
    const saved = parseSession(localStorage.getItem(ACCOUNT_PREFIX + userId));
    return saved?.userId === userId ? saved : null;
  } catch { return null; }
}

export async function loadSession(): Promise<Session | null> {
  // Legacy web sessions shared single-use refresh tokens across all account tabs.
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(KEY); } catch {}
  }
  const raw = await store.get(KEY);
  // An existing tab always owns its account, including malformed/expired sessions.
  if (raw !== null) return parseSession(raw);
  if (Platform.OS === 'web') {
    try {
      const saved = loadAccountSession(Number(localStorage.getItem(LAST_ACCOUNT)));
      if (saved) await store.set(KEY, JSON.stringify(saved));
      return saved;
    } catch { return null; }
  }
  return null;
}

export async function clearSession(): Promise<void> {
  const saved = parseSession(await store.get(KEY));
  if (Platform.OS === 'web' && saved?.userId) {
    try {
      localStorage.removeItem(ACCOUNT_PREFIX + saved.userId);
      if (localStorage.getItem(LAST_ACCOUNT) === String(saved.userId)) localStorage.removeItem(LAST_ACCOUNT);
    } catch {}
  }
  await store.del(KEY);
}

export async function refreshRememberedSession(session: Session, renew: (current: Session) => Promise<Session>, canPersist: () => boolean = () => true): Promise<Session> {
  const run = async () => {
    const latest = session.userId ? loadAccountSession(session.userId) : null;
    if (latest && latest.refreshToken !== session.refreshToken && !isExpired(latest)) return latest;
    const next = await renew(latest ?? session);
    if (canPersist()) await saveSession(next);
    return next;
  };
  if (Platform.OS === 'web' && session.userId && globalThis.navigator?.locks) {
    return navigator.locks.request(`mydream-session-refresh-${session.userId}`, run);
  }
  return run();
}

export function isExpired(session: Session): boolean {
  return Date.now() >= session.expiresAt - 30_000; // 30 s buffer
}
