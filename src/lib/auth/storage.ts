import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'kc_session';

export type Session = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number; // Unix ms
};

// ── Platform-aware storage ────────────────────────────────────────
// expo-secure-store is native-only; fall back to localStorage on web
const store = {
  get: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return Promise.resolve(localStorage.getItem(key)); }
      catch { return Promise.resolve(null); }
    }
    return SecureStore.getItemAsync(key);
  },
  set: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  del: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
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
  const raw = await store.get(KEY);
  if (!raw) return null;
  return JSON.parse(raw) as Session;
}

export async function clearSession(): Promise<void> {
  await store.del(KEY);
}

export function isExpired(session: Session): boolean {
  return Date.now() >= session.expiresAt - 30_000; // 30 s buffer
}
