import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { TermsReader } from '@/components/terms/TermsReader';
import { Colors, Fonts } from '@/constants/colors';
import { termsApi } from '@/lib/api/terms';
import { ApiError } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTerms } from '@/lib/terms/TermsContext';
import { registrationStore } from '@/lib/registrationStore';
import type { TermsDocument } from '@/lib/termsPolicy';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function TermsScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { session } = useAuth(); const { refreshTerms } = useTerms();
  const [document, setDocument] = useState<TermsDocument | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('در حال دریافت قوانین…');
  const load = async () => { try { const next = await termsApi.current(); setDocument(next); setMessage(next ? '' : 'قوانین هنوز منتشر نشده است.'); } catch { setMessage('دریافت قوانین ممکن نشد. دوباره تلاش کنید.'); } };
  useEffect(() => {
    let active = true;
    termsApi.current().then(next => { if (active) { setDocument(next); setMessage(next ? '' : 'قوانین هنوز منتشر نشده است.'); } })
      .catch(() => { if (active) setMessage('دریافت قوانین ممکن نشد. دوباره تلاش کنید.'); });
    return () => { active = false; };
  }, []);
  const accept = async () => {
    if (!document) return; setBusy(true);
    try {
      if (session) { await termsApi.accept(session.accessToken, document.id); await refreshTerms(); }
      else {
        const token = registrationStore.get().registration_token;
        if (token) {
          try { await termsApi.registrationAccept(token, document.id); }
          catch (error) {
            if (!(error instanceof ApiError) || error.status !== 422) throw error;
            registrationStore.set({ registration_token: '', terms_version_id: document.id, terms_accepted: true });
            toast.error('جلسه ثبت‌نام منقضی شده؛ دوباره کد تأیید دریافت کنید. اطلاعات واردشده حفظ شده‌اند.');
            router.replace('/onboarding/phone');
            return;
          }
        }
        registrationStore.set({ terms_version_id: document.id, terms_accepted: true });
      }
      if (returnTo && router.canGoBack()) router.back();
      else if (session) router.back();
      else router.replace('/onboarding/phone');
    } catch { setMessage('تأیید ثبت نشد یا نسخه جدیدی منتشر شده است؛ متن را دوباره بررسی کنید.'); await load(); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
    <AppBar title="قوانین و حریم خصوصی" back />
    {!!message && <View style={{ padding: 20 }}><Text style={{ color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center' }}>{message}</Text><Button variant="ghost" onPress={() => { void load(); }}>تلاش مجدد</Button></View>}
    {document && <TermsReader key={document.id} document={document} onAccept={accept} busy={busy} />}
  </SafeAreaView>;
}
