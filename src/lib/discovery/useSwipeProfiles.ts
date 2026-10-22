import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { discoverApi, type DiscoverProfile } from '../api/discover';
import { profileCache } from '../cache/profileCache';
import { discoveryFilterSession, EMPTY_DISCOVERY_FILTERS, filterCount, filtersAvailable, toDiscoveryFilters } from './filters';
import { emptySwipeState, SwipeProfilesLoader, type SwipeProfilesState } from './swipeProfiles';

export function useSwipeProfiles(token: string | undefined, viewerId: number | undefined, enabled: boolean, safeMode: boolean) {
  const selection = useSyncExternalStore(discoveryFilterSession.subscribe,
    useCallback(() => discoveryFilterSession.get(viewerId), [viewerId]), () => EMPTY_DISCOVERY_FILTERS);
  const [access, setAccess] = useState<{ token?: string; viewerId?: number; tier?: string; available?: boolean; until?: string | null }>({});
  const entitled = access.token === token && access.viewerId === viewerId && access.available === true && filtersAvailable(access.tier);
  const appliedKey = entitled && filterCount(selection, access.tier) ? JSON.stringify(toDiscoveryFilters(selection, access.tier)) : '';
  const key = JSON.stringify([token, viewerId, safeMode, appliedKey]);
  const [owned, setOwned] = useState<{ key: string; state: SwipeProfilesState }>(() => ({ key, state: emptySwipeState() }));
  const state = owned.key === key ? owned.state : emptySwipeState();
  const loader = useRef<SwipeProfilesLoader | null>(null);
  const refreshCurrent = useRef<() => void>(() => {});
  const swiped = useRef<{ owner?: number; ids: Set<number> }>({ ids: new Set() });

  useFocusEffect(useCallback(() => {
    if (!token || viewerId == null || !enabled) return;
    const filters = appliedKey ? JSON.parse(appliedKey) : undefined;
    const current = new SwipeProfilesLoader(
      value => discoverApi.getProfiles(token, 15, safeMode, value),
      update => {
        const profiles = Array.from(new Map(update.profiles.map(profile => [profile.id, profile])).values())
          .filter(profile => swiped.current.owner !== viewerId || !swiped.current.ids.has(profile.id));
        if (!update.loading && !update.error && update.meta) {
          setAccess({ token, viewerId, tier: update.meta.tier, available: update.meta.filters_available, until: update.meta.filters_valid_until });
          profileCache.setMany(profiles);
        }
        setOwned({ key, state: { ...update, profiles } });
      },
    );
    loader.current = current;
    const visible = () => AppState.currentState === 'active'
      && (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
    const refresh = () => { if (visible()) void current.load(filters); };
    refreshCurrent.current = refresh;
    const sync = () => { if (visible()) refresh(); else current.stop(); };
    sync();
    const subscription = AppState.addEventListener('change', sync);
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', sync);
    return () => {
      current.stop();
      if (loader.current === current) { loader.current = null; refreshCurrent.current = () => {}; }
      subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', sync);
    };
  }, [token, viewerId, enabled, safeMode, key, appliedKey]));

  useFocusEffect(useCallback(() => {
    if (!enabled || !entitled || !access.until) return;
    const deadline = Date.parse(access.until);
    if (!Number.isFinite(deadline)) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) { refreshCurrent.current(); return; }
      timer = setTimeout(() => { if (remaining > 2_147_000_000) schedule(); else refreshCurrent.current(); },
        Math.min(remaining, 2_147_000_000));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [enabled, entitled, access.until]));

  const refresh = useCallback(() => refreshCurrent.current(), []);
  const patchProfile = useCallback((id: number, patch: Partial<DiscoverProfile>) => {
    setOwned(previous => previous.key !== key ? previous : ({ ...previous,
      state: { ...previous.state, profiles: previous.state.profiles.map(profile => profile.id === id ? { ...profile, ...patch } : profile) },
    }));
  }, [key]);
  const rememberSwipe = useCallback((id: number) => {
    if (swiped.current.owner !== viewerId) swiped.current = { owner: viewerId, ids: new Set() };
    swiped.current.ids.add(id);
  }, [viewerId]);

  return { ...state, selection, entitled, tier: access.tier, filtersActive: entitled && filterCount(selection, access.tier) > 0,
    refresh, patchProfile, rememberSwipe };
}
