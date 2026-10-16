import { useAuth } from '@/lib/auth/AuthContext';
import { store } from '@/lib/auth/storage';
import { termsApi } from '@/lib/api/terms';
import { onTermsRequired } from '@/lib/api/client';
import { TermsReader } from '@/components/terms/TermsReader';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts } from '@/constants/colors';
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, AppState, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TermsSessionController } from './termsSession';

const Context = createContext({ refreshTerms: async () => {}, canUseApp: false });
export const useTerms = () => useContext(Context);

export function TermsProvider({ children }: { children: React.ReactNode }) {
  const { session, user, logout } = useAuth();
  const token = session?.accessToken;
  const userId = session?.userId ?? user?.id;
  const identity = session ? (userId !== undefined ? String(userId) : `pending:${token}`) : null;
  const key = userId !== undefined ? `terms-status-${userId}` : null;
  const [controller] = useState(() => new TermsSessionController({
    load: store.get, save: store.set,
    status: termsApi.status, current: termsApi.current, accept: termsApi.accept,
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    void controller.connect(identity, token, key);
    return controller.cancel;
  }, [controller, identity, token, key]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => { if (next === 'active') void controller.refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void controller.refresh(); }, 60000);
    const remove = onTermsRequired(requestToken => { void controller.require(requestToken); });
    return () => { sub.remove(); clearInterval(timer); remove(); };
  }, [controller]);

  const phase = state.identity === identity ? state.phase : 'checking';
  const blocked = !!session && phase !== 'allowed';
  const message = phase === 'error'
    ? 'بررسی وضعیت حساب ممکن نشد. اتصال را بررسی و دوباره تلاش کنید.'
    : state.acceptError ? 'تأیید ثبت نشد یا نسخه جدیدی منتشر شده است. دوباره بررسی کنید.'
      : 'برای ادامه، قوانین و حریم خصوصی را تأیید کنید. اگر متن دریافت نشد، بررسی مجدد را بزنید.';

  return <Context.Provider value={{ refreshTerms: controller.refresh, canUseApp: !blocked }}>
    {children}
    <Modal visible={blocked} animationType="none" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        {phase === 'checking' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={{ color: Colors.muted, fontFamily: Fonts.regular }}>در حال آماده‌سازی…</Text>
          </View>
        ) : (
          <>
            <Text style={{ color: Colors.ink, fontFamily: Fonts.bold, fontSize: 18, textAlign: 'center', padding: 16 }}>
              {phase === 'required' ? 'قوانین و حریم خصوصی' : 'بررسی اتصال'}
            </Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center', paddingHorizontal: 20 }}>{message}</Text>
            {phase === 'required' && state.document
              ? <TermsReader key={state.document.id} document={state.document} onAccept={controller.accept} busy={state.busy} />
              : <View style={{ flex: 1 }} />}
            <View style={{ padding: 16, gap: 8 }}>
              <Button variant="ghost" disabled={state.busy} onPress={() => { void controller.refresh(); }}>بررسی مجدد</Button>
              <Button variant="ghost" disabled={state.busy} onPress={() => { void logout(); }}>خروج از حساب</Button>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  </Context.Provider>;
}
