import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { profileApi } from '@/lib/api/profile';
import { useVoiceRecorder } from '@/lib/chat/useVoiceRecorder';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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

  const remaining = status.playing || status.currentTime > 0
    ? Math.max(0, Math.ceil((status.duration || durationSeconds) - status.currentTime))
    : durationSeconds;

  return (
    <View style={styles.previewRow}>
      <TouchableOpacity style={styles.previewBtn} onPress={toggle} activeOpacity={0.8}>
        {status.playing
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
  const { session } = useAuth();
  const recorder = useVoiceRecorder();
  const [uploading, setUploading] = useState(false);

  const handleMicPress = async () => {
    if (recorder.isRecording) {
      await recorder.stop();
      return;
    }
    const started = await recorder.start();
    if (!started) toast.error('دسترسی به میکروفون داده نشد');
  };

  const handleSave = async () => {
    if (!session?.accessToken || !recorder.recordedUri || uploading) return;
    setUploading(true);
    try {
      await profileApi.uploadVoiceIntro(session.accessToken, recorder.recordedUri, recorder.recordedDuration);
      toast.success('معرفی صوتی ذخیره شد');
      router.back();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'ذخیره معرفی صوتی ناموفق بود');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppBar title="معرفی صوتی" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>
          یک معرفی صوتی کوتاه (حداکثر ۶۰ ثانیه) ضبط کن تا کاربران دیگر صدات رو بشنون.
        </Text>

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
          ) : recorder.recordedUri ? (
            <>
              <PreviewPlayer uri={recorder.recordedUri} durationSeconds={recorder.recordedDuration} />
              <TouchableOpacity style={styles.discardBtn} onPress={recorder.reset} activeOpacity={0.8}>
                <Trash2 size={15} color={Colors.danger} strokeWidth={2} />
                <Text style={styles.discardTxt}>حذف و ضبط دوباره</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.micBtn} onPress={handleMicPress} activeOpacity={0.85}>
              <Mic size={28} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {recorder.recordedUri && !recorder.isRecording && (
        <View style={styles.bottomBar}>
          {uploading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            <Button onPress={handleSave}>ذخیره معرفی صوتی</Button>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 140 },
  hint: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xxl,
  },
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
