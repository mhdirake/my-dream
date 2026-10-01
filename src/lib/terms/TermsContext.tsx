import { useAuth } from '@/lib/auth/AuthContext';
import { store } from '@/lib/auth/storage';
import { termsApi } from '@/lib/api/terms';
import { onTermsRequired } from '@/lib/api/client';
import { hasOfflineAcceptance, type TermsDocument, type TermsStatus } from '@/lib/termsPolicy';
import { TermsReader } from '@/components/terms/TermsReader';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts } from '@/constants/colors';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Cache = { status: TermsStatus; document: TermsDocument | null };
const Context = createContext({ refreshTerms: async () => {}, canUseApp: false });
export const useTerms = () => useContext(Context);
export function TermsProvider({ children }: { children: React.ReactNode }) {
  const { session, user, logout } = useAuth();
  const token = session?.accessToken;
  const userId = user?.id ?? session?.userId;
  const identity = session ? String(userId ?? 'unknown') : null;
  const cache = useRef<Cache | null>(null);
  const generation = useRef(0);
  const required = useRef(false);
  const [allowedIdentity, setAllowedIdentity] = useState<string | null>(null);
  const [document, setDocument] = useState<TermsDocument | null>(null);
  const [message, setMessage] = useState('در حال بررسی قوانین…');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const key = userId ? `terms-status-${userId}` : null;
  const pendingWrite = useRef<Promise<void>>(Promise.resolve());
  const persist = useCallback(async (value: Cache) => {
    cache.current = value;
    if (key) {
      const write = pendingWrite.current.catch(() => {}).then(() => store.set(key, JSON.stringify(value)));
      pendingWrite.current = write;
      await write;
    }
  }, [key]);
  const refreshTerms = useCallback(async () => {
    if (!token || inFlight.current) return;
    const epoch = generation.current; inFlight.current = true;
    try {
      const status = await termsApi.status(token);
      if (epoch !== generation.current) return;
      required.current = !status.terms_accepted;
      // Persist a newly observed requirement before fetching the document: offline cannot undo it.
      await persist({ status, document: cache.current?.document ?? null });
      if (epoch !== generation.current) return;
      if (status.terms_accepted) { setAllowedIdentity(identity); setMessage(''); }
      else {
        setAllowedIdentity(null); setMessage('برای ادامه، قوانین و حریم خصوصی را تأیید کنید.');
        const current = await termsApi.current();
        if (epoch !== generation.current) return;
        setDocument(current); await persist({ status, document: current });
        if (!current) setMessage('قوانین هنوز منتشر نشده است. پس از انتشار می‌توانید ادامه دهید.');
      }
    } catch {
      if (epoch !== generation.current) return;
      if (!required.current && hasOfflineAcceptance(cache.current?.status ?? null)) setAllowedIdentity(identity);
      else { setAllowedIdentity(null); setDocument(cache.current?.document ?? null); setMessage('بررسی قوانین ممکن نشد. اتصال را بررسی و دوباره تلاش کنید.'); }
    } finally { if (epoch === generation.current) inFlight.current = false; }
  }, [token, identity, persist]);
  useEffect(() => {
    generation.current++; inFlight.current = false; required.current = false; cache.current = null;
    if (!token) return;
    const epoch = generation.current;
    const epochs = generation;
    void (async () => {
      try {
        const raw = key ? await store.get(key) : await Promise.resolve(null);
        if (epoch !== generation.current) return;
        setDocument(null); setAllowedIdentity(null); setMessage('در حال بررسی قوانین…'); setBusy(false);
        cache.current = raw ? JSON.parse(raw) : null;
        required.current = !!cache.current && !hasOfflineAcceptance(cache.current.status);
      } catch { if (epoch === generation.current) cache.current = null; }
      if (epoch === generation.current) await refreshTerms();
    })();
    return () => { epochs.current++; };
  }, [identity, token, key, refreshTerms]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void refreshTerms(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refreshTerms(); }, 60000);
    const remove = onTermsRequired(requestToken => {
      if (requestToken !== token || !token) return;
      generation.current++; inFlight.current = false;
      required.current = true; setAllowedIdentity(null);
      if (cache.current) void persist({ ...cache.current, status: { ...cache.current.status, terms_accepted: false } });
      void refreshTerms();
    });
    return () => { sub.remove(); clearInterval(timer); remove(); };
  }, [refreshTerms, token, identity, persist]);
  const blocked = !!session && allowedIdentity !== identity;
  const accept = async () => {
    if (!document || !session) return;
    const epoch = ++generation.current; inFlight.current = false;
    setBusy(true);
    try {
      const status = await termsApi.accept(session.accessToken, document.id);
      if (epoch !== generation.current) return;
      required.current = false; await persist({ status, document });
      if (epoch === generation.current) setAllowedIdentity(identity);
    } catch { setMessage('تأیید ثبت نشد یا نسخه جدیدی منتشر شده است. دوباره بررسی کنید.'); await refreshTerms(); }
    finally { setBusy(false); }
  };
  return <Context.Provider value={{ refreshTerms, canUseApp: !blocked }}>
    {children}
    <Modal visible={blocked} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <Text style={{ color: Colors.ink, fontFamily: Fonts.bold, fontSize: 18, textAlign: 'center', padding: 16 }}>قوانین و حریم خصوصی</Text>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center', paddingHorizontal: 20 }}>{message}</Text>
        {document ? <TermsReader key={document.id} document={document} onAccept={accept} busy={busy} /> : <View style={{ flex: 1 }} />}
        <View style={{ padding: 16, gap: 8 }}>
          <Button variant="ghost" disabled={busy} onPress={() => { void refreshTerms(); }}>بررسی مجدد</Button>
          <Button variant="ghost" disabled={busy} onPress={() => { void logout(); }}>خروج از حساب</Button>
        </View>
      </SafeAreaView>
    </Modal>
  </Context.Provider>;
}
