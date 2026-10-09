import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'session';

function webStorage(key: string): Storage {
  return key === KEY ? sessionStorage : localStorage;
}

export type Session = {
  accessToken: string;
  userId?: number;
  refreshToken: string;
  expiresAt: number; // Unix ms
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
  await store.set(KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  // Legacy web sessions shared single-use refresh tokens across all account tabs.
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(KEY); } catch {}
  }
  const raw = await store.get(KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (typeof session.accessToken !== 'string' || typeof session.refreshToken !== 'string'
      || !Number.isFinite(session.expiresAt)) return null;
    return session;
  } catch { return null; }
}

export async function clearSession(): Promise<void> {
  await store.del(KEY);
}

export function isExpired(session: Session): boolean {
  return Date.now() >= session.expiresAt - 30_000; // 30 s buffer
}
