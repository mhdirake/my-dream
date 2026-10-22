import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { AppSwitch } from '@/components/ui/AppSwitch';
import { api } from '@/lib/api/client';
import * as DocumentPicker from 'expo-document-picker';
import { profileApi } from '@/lib/api/profile';
import { useVoiceRecorder } from '@/lib/chat/useVoiceRecorder';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { toFaDigits } from '@/lib/localization';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router, useFocusEffect } from 'expo-router';
import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return toFaDigits(`${m}:${String(s).padStart(2, '0')}`);
}

function PreviewPlayer({ uri, durationSeconds }: { uri: string; durationSeconds: number }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.currentTime >= (status.duration || durationSeconds)) player.seekTo(0);
      player.play();
    }
  };

  const totalDuration = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : durationSeconds;
  const remaining = status.playing || status.currentTime > 0
    ? Math.max(0, Math.ceil(totalDuration - status.currentTime))
    : Math.ceil(totalDuration);

  if (status.error) return <Text style={styles.hint}>پیش‌نمایش این فایل در دستگاهت پخش نشد؛ می‌توانی آن را ذخیره کنی یا دوباره ضبط کنی.</Text>;

  return (
    <View style={styles.previewRow}>
      <TouchableOpacity style={styles.previewBtn} disabled={!status.isLoaded} onPress={toggle} activeOpacity={0.8}>
        {!status.isLoaded ? <ActivityIndicator size="small" color="#fff" /> : status.playing
          ? <Pause size={18} color="#fff" fill="#fff" strokeWidth={0} />
          : <Play size={18} color="#fff" fill="#fff" strokeWidth={0} />
        }
      </TouchableOpacity>
      <View style={styles.previewWave} />
      <Text style={styles.previewDuration}>{formatDuration(remaining)}</Text>
    </View>
  );
}

export default function VoiceIntroScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const recorder = useVoiceRecorder();
  const [uploading, setUploading] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [access, setAccess] = useState<'loading' | 'allowed' | 'locked' | 'error'>('loading');
  const [visibility, setVisibility] = useState<'public' | 'hidden'>('hidden');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);

  const loadAccess = useCallback(async (isActive: () => boolean = () => true) => {
    if (!session?.accessToken) return;
    setAccess('loading');
    try {
      const [profile, privacy] = await Promise.all([
        profileApi.getProfile(session.accessToken),
        api.get<{ data: { voice_intro_visibility: 'public' | 'hidden' } }>('/api/client/privacy-settings', session.accessToken),
      ]);
      if (!isActive()) return;
      const plan = profile.active_subscription?.plan?.slug;
      setAccess(plan === 'silver' || plan === 'gold' ? 'allowed' : 'locked');
      setVisibility(privacy.data.voice_intro_visibility);
    } catch { if (isActive()) setAccess('error'); }
  }, [session]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadAccess(() => active);
    return () => { active = false; };
  }, [loadAccess]));

  const pickFile = async () => {
    if (access !== 'allowed' || uploading || recorder.isRecording) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size != null && file.size > 20 * 1024 * 1024) {
        toast.error('حجم فایل صوتی باید حداکثر ۲۰ مگابایت باشد');
        return;
      }
      recorder.reset();
      setSelectedFile({ uri: file.uri, name: file.name, mimeType: file.mimeType || 'audio/mp4' });
    } catch {
      toast.error('انتخاب فایل صوتی انجام نشد؛ دوباره تلاش کن');
    }
  };

  const changeVisibility = async (value: boolean) => {
    if (!session?.accessToken || savingVisibility || uploading) return;
    setSavingVisibility(true);
    const next = value ? 'public' : 'hidden';
    try {
      await api.patch('/api/client/privacy-settings', { voice_intro_visibility: next }, session.accessToken);
      setVisibility(next);
    } catch {
      toast.error('تغییر نمایش ذخیره نشد؛ دوباره تلاش کن');
    } finally { setSavingVisibility(false); }
  };

  const previewUri = selectedFile?.uri ?? recorder.recordedUri;

  const handleMicPress = async () => {
    if (access !== 'allowed' || uploading) return;
    if (recorder.isRecording) {
      await recorder.stop();
      return;
    }
    try {
      setSelectedFile(null);
      const started = await recorder.start();
      if (!started) toast.error('دسترسی به میکروفون داده نشد');
    } catch {
      toast.error('ضبط صدا شروع نشد؛ دسترسی میکروفون را بررسی کن');
    }
  };

  const handleSave = async () => {
    if (!session?.accessToken || !previewUri || uploading || savingVisibility || access !== 'allowed') return;
    if (!selectedFile && recorder.recordedDuration < 5) {
      toast.error('معرفی صوتی باید حداقل ۵ ثانیه باشد');
      return;
    }
    setUploading(true);
    try {
      await profileApi.uploadVoiceIntro(session.accessToken, previewUri, selectedFile ? undefined : recorder.recordedDuration, selectedFile?.mimeType, visibility);
      toast.success(visibility === 'public' ? 'معرفی صوتی ذخیره شد و برای مشترکان قابل شنیدن است' : 'معرفی صوتی ذخیره شد؛ نمایش آن مخفی است');
      router.back();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'ذخیره معرفی صوتی ناموفق بود');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <AppBar title="معرفی صوتی" back backFallback="/profile-edit" contentGap />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {access === 'loading' ? <ActivityIndicator color={Colors.accent} /> : access === 'locked' ? <View style={styles.recordArea}>
          <Text style={styles.hint}>برای ضبط، آپلود و شنیدن معرفی صوتی دیگران به اشتراک فعال نقره‌ای یا طلایی نیاز داری.</Text>
          <Button onPress={() => router.push('/subscription' as never)}>ارتقای اشتراک</Button>
        </View> : access === 'error' ? <View style={styles.recordArea}>
          <Text style={styles.hint}>بررسی دسترسی انجام نشد؛ دوباره تلاش کن.</Text>
          <Button onPress={() => { void loadAccess(); }}>تلاش مجدد</Button>
        </View> : <>
        <Text style={styles.hint}>یک معرفی صوتی ۵ تا ۶۰ ثانیه‌ای ضبط کن یا فایل صوتی انتخاب کن. حداکثر حجم فایل ۲۰ مگابایت است.</Text>
        <View style={styles.visibilityRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.visibilityTitle}>نمایش معرفی صوتی در پروفایل</Text>
            <Text style={styles.visibilityHint}>{visibility === 'public' ? 'فقط کاربران دارای اشتراک فعال می‌توانند صدایت را بشنوند.' : 'صدایت ذخیره می‌شود، اما برای دیگران مخفی می‌ماند.'}</Text>
          </View>
          <AppSwitch value={visibility === 'public'} disabled={uploading || savingVisibility} accessibilityLabel="نمایش معرفی صوتی برای مشترکان"
            onValueChange={value => { void changeVisibility(value); }} />
        </View>
        <View style={styles.recordArea}>
          {recorder.isRecording ? (
            <>
              <View style={styles.recDot} />
              <Text style={styles.recTimer}>{formatDuration(Math.floor(recorder.durationMillis / 1000))}</Text>
              <TouchableOpacity style={styles.stopBtn} onPress={handleMicPress} activeOpacity={0.85}>
                <Square size={22} color="#fff" fill="#fff" strokeWidth={0} />
              </TouchableOpacity>
              <Text style={styles.recSub}>در حال ضبط…</Text>
            </>
          ) : previewUri ? (
            <>
              <PreviewPlayer key={previewUri} uri={previewUri} durationSeconds={selectedFile ? 0 : recorder.recordedDuration} />
              {selectedFile && <Text style={styles.hint}>{selectedFile.name}</Text>}
              <TouchableOpacity style={styles.discardBtn} disabled={uploading} onPress={() => { setSelectedFile(null); recorder.reset(); }} activeOpacity={0.8}>
                <Trash2 size={15} color={Colors.danger} strokeWidth={2} />
                <Text style={styles.discardTxt}>حذف انتخاب و شروع دوباره</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.micBtn} onPress={handleMicPress} activeOpacity={0.85}>
              <Mic size={28} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        {!recorder.isRecording && !uploading && <Button variant="outline" onPress={pickFile}>
          انتخاب فایل صوتی
        </Button>}
        </>}
      </ScrollView>

      {access === 'allowed' && previewUri && !recorder.isRecording && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.xxl }]}>
          {uploading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            <Button onPress={handleSave} disabled={savingVisibility}>ذخیره معرفی صوتی</Button>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 140, flexGrow: 1, justifyContent: 'center' },
  hint: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xxl,
  },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: Colors.surface },
  visibilityTitle: { fontFamily: Fonts.bold, color: Colors.ink, fontSize: 13, textAlign: 'right' },
  visibilityHint: { fontFamily: Fonts.regular, color: Colors.muted, fontSize: 12, lineHeight: 21, textAlign: 'right', marginTop: 6 },
  recordArea: { alignItems: 'center', gap: 14, paddingVertical: Spacing.xxl },
  micBtn: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.danger },
  recTimer: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ink },
  stopBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  recSub: { fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.muted },

  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.hair,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    width: '100%',
  },
  previewBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  previewWave: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.lineSoft },
  previewDuration: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.ink },

  discardBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  discardTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.danger },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xxl,
    backgroundColor: Colors.bg,
    borderTopWidth: 1, borderTopColor: Colors.hair,
  },
});
