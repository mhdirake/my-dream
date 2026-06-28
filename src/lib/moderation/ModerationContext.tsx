import { moderationApi, type ModerationStatus } from '@/lib/api/moderation';
import { useAuth } from '@/lib/auth/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const ACKED_KEY = 'acknowledged_restriction_level';

type ModerationCtx = {
  moderationStatus: ModerationStatus | null;
  isLoading: boolean;
  hasUnacknowledgedRestriction: boolean;
  acknowledgeRestriction: () => Promise<void>;
  refreshModeration: () => Promise<void>;
};

const Ctx = createContext<ModerationCtx>({
  moderationStatus: null,
  isLoading: true,
  hasUnacknowledgedRestriction: false,
  acknowledgeRestriction: async () => {},
  refreshModeration: async () => {},
});

export function useModerationCtx() {
  return useContext(Ctx);
}

export function ModerationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ackedLevel, setAckedLevel] = useState<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchStatus = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const status = await moderationApi.getStatus(session.accessToken);
      setModerationStatus(status);
    } catch {
      // silent — don't block the app on moderation fetch failure
    }
  }, [session?.accessToken]);

  // Load acked level from storage on mount
  useEffect(() => {
    SecureStore.getItemAsync(ACKED_KEY)
      .then(val => setAckedLevel(val !== null ? Number(val) : null))
      .catch(() => setAckedLevel(null));
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!session?.accessToken) { setIsLoading(false); return; }
    fetchStatus().finally(() => setIsLoading(false));
  }, [session?.accessToken, fetchStatus]);

  // Refresh on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        fetchStatus();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [fetchStatus]);

  const currentLevel = moderationStatus?.active_restrictions?.[0]?.level ?? null;
  const hasUnacknowledgedRestriction =
    (moderationStatus?.has_active_restriction ?? false) &&
    currentLevel !== null &&
    currentLevel !== ackedLevel;

  const acknowledgeRestriction = useCallback(async () => {
    if (currentLevel === null) return;
    await SecureStore.setItemAsync(ACKED_KEY, String(currentLevel));
    setAckedLevel(currentLevel);
  }, [currentLevel]);

  const refreshModeration = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return (
    <Ctx.Provider value={{
      moderationStatus,
      isLoading,
      hasUnacknowledgedRestriction,
      acknowledgeRestriction,
      refreshModeration,
    }}>
      {children}
    </Ctx.Provider>
  );
}
