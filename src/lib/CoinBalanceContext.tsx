import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from './auth/AuthContext';
import { useTerms } from './terms/TermsContext';
import { useCentrifugoCtx } from './chat/CentrifugoContext';
import { paymentsApi } from './api/payments';
import { coinBalanceStore } from './coinBalanceStore';

export function CoinBalanceProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const { canUseApp } = useTerms();
  const { addUserEventHandler, onConnect } = useCentrifugoCtx();
  const accountId = session?.userId ?? user?.id ?? null;
  const token = canUseApp ? session?.accessToken ?? null : null;

  useLayoutEffect(() => {
    coinBalanceStore.activate(accountId, token);
  }, [accountId, token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const refresh = () => {
      if (!active || AppState.currentState === 'background') return;
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.hidden) return;
      void paymentsApi.getWallet(token).catch(() => undefined);
    };
    refresh();
    const unsubscribeInvalidation = coinBalanceStore.onInvalidate(refresh);
    const unsubscribeConnect = onConnect(refresh);
    const unsubscribeEvents = addUserEventHandler(event => {
      if (event.event === 'wallet.updated' || event.event === 'wallet.balance_updated') { refresh(); return; }
      if (event.event !== 'notification.created') return;
      const data = (event.payload ?? event) as { notification?: {type?:string} };
      if (/gift|coin|payment|referral/.test(data.notification?.type ?? '')) refresh();
    });
    const appState = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    // Reconcile changes made by another device/admin even when realtime is unavailable.
    const timer = setInterval(refresh, 30_000);
    if (Platform.OS === 'web') {
      window.addEventListener('focus', refresh);
      document.addEventListener('visibilitychange', refresh);
    }
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribeInvalidation(); unsubscribeConnect(); unsubscribeEvents(); appState.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('focus', refresh);
        document.removeEventListener('visibilitychange', refresh);
      }
    };
  }, [token, addUserEventHandler, onConnect]);

  return children;
}

export function useCoinBalance() {
  const { session, user } = useAuth();
  const accountId = session?.userId ?? user?.id ?? null;
  const token = session?.accessToken;
  const coins = useSyncExternalStore(coinBalanceStore.subscribe,
    () => coinBalanceStore.accountId === accountId ? coinBalanceStore.balance : null,
    () => null);
  useFocusEffect(useCallback(() => {
    if (token) void paymentsApi.getWallet(token).catch(() => undefined);
  }, [token]));
  return { coins };
}
