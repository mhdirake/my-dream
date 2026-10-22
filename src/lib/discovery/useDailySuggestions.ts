import { useCallback, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { discoverApi, type DiscoverProfile } from '../api/discover';
import { DailySuggestionsLoader, emptyDailyState } from './dailySuggestions';

export function useDailySuggestions(token: string | undefined, enabled: boolean, viewerId?: number, currentTier?: string) {
  const [owned, setOwned] = useState(() => ({ token, viewerId, tier: currentTier, state: emptyDailyState() }));
  const loader = useRef<DailySuggestionsLoader | null>(null);
  const state = owned.token === token && owned.viewerId === viewerId && owned.tier === currentTier ? owned.state : emptyDailyState();

  useFocusEffect(useCallback(() => {
    if (!token || !enabled) return;
    const current = new DailySuggestionsLoader(
      () => discoverApi.getDailySuggestions(token, viewerId, currentTier),
      update => setOwned(previous => ({
        token, viewerId, tier: currentTier,
        state: update(previous.token === token && previous.viewerId === viewerId && previous.tier === currentTier
          ? previous.state : emptyDailyState()),
      })),
    );
    loader.current = current;
    const syncActivity = () => {
      const visible = Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden';
      if (AppState.currentState === 'active' && visible) current.start();
      else current.stop();
    };
    syncActivity();
    const subscription = AppState.addEventListener('change', syncActivity);
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', syncActivity);
    return () => {
      current.stop();
      if (loader.current === current) loader.current = null;
      subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', syncActivity);
    };
  }, [token, enabled, viewerId, currentTier]));

  const refresh = useCallback(() => loader.current?.retry(), []);
  const patchProfile = useCallback((id: number, patch: Partial<DiscoverProfile>) => {
    setOwned(previous => previous.token !== token ? previous : ({ ...previous, state: { ...previous.state,
      profiles: previous.state.profiles.map(profile => profile.id === id ? { ...profile, ...patch } : profile),
    } }));
  }, [token]);
  const removeProfile = useCallback((id: number) => {
    setOwned(previous => {
      if (previous.token !== token) return previous;
      const profiles = previous.state.profiles.filter(profile => profile.id !== id);
      return { ...previous, state: { ...previous.state, profiles,
        meta: previous.state.meta ? { ...previous.state.meta, count: profiles.length } : null,
      } };
    });
  }, [token]);

  return {
    ...state,
    loading: state.loading || (enabled && !state.meta && !state.error && !state.restricted),
    refresh, patchProfile, removeProfile,
  };
}
