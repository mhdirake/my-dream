import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { lookupsApi, type ProfilePrompt } from '@/lib/api/onboarding';
import { profileApi } from '@/lib/api/profile';
import { router } from 'expo-router';
import { RefreshCw, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function AboutMeScreen() {
  const { session } = useAuth();
  const [allPrompts, setAllPrompts] = useState<ProfilePrompt[]>([]);
  const [shown, setShown] = useState<ProfilePrompt[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.accessToken) return;
    setLoading(true);
    lookupsApi
      .getProfilePrompts(session.accessToken)
      .then(data => {
        setAllPrompts(data);
        setShown(pickRandom(data, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const pickRandom = (arr: ProfilePrompt[], n: number) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  const refreshPrompts = () => {
    setShown(pickRandom(allPrompts, 5));
    setAnswers({});
  };

  const filledCount = Object.values(answers).filter(a => a.trim()).length;

  const handleSave = async () => {
    if (!session?.accessToken) return;
    const answered = shown
      .filter(p => answers[p.id]?.trim())
      .map(p => ({ profile_prompt_id: p.id, answer: answers[p.id].trim() }));
    if (answered.length === 0) {
      router.replace('/(tabs)/' as any);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/client/profile/prompts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ answers: answered }),
        },
      );
      router.replace('/(tabs)/' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <OptStepper idx={8} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>آشنایی با من</Text>
        <Text style={styles.sub}>
          {toPersian(5)} سؤال تصادفی — به اونایی که دوست داری جواب بده
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : (
          shown.map(p => (
            <View key={p.id} style={styles.promptBlock}>
              <Text style={styles.question}>{p.body}</Text>
              <TextInput
                style={[styles.answerInput, answers[p.id]?.trim() && styles.answerFilled]}
                value={answers[p.id] ?? ''}
                onChangeText={v => setAnswers(prev => ({ ...prev, [p.id]: v }))}
                placeholder="پاسخت رو بنویس…"
                placeholderTextColor={Colors.muted}
                multiline
                textAlignVertical="top"
                numberOfLines={2}
              />
            </View>
          ))
        )}

        <Pressable style={styles.refreshBtn} onPress={refreshPrompts}>
          <RefreshCw size={14} color={Colors.accent} strokeWidth={2} />
          <Text style={styles.refreshText}>سؤال‌های دیگر</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button variant="ghost" onPress={() => router.replace('/(tabs)/' as any)} full={false} style={styles.btnSkip}>
            بعداً
          </Button>
          <Button variant="accent" onPress={handleSave} disabled={saving} full={false} style={styles.btnSave}>
            {saving ? 'در حال ذخیره…' : filledCount > 0 ? 'ذخیره و ورود' : 'ورود به اپ'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function OptStepper({ idx }: { idx: number }) {
  const total = 8;
  return (
    <View style={styles.stepper}>
      <View style={styles.stepperTop}>
        <View style={styles.badge}>
          <Sparkles size={11} color={Colors.ok} strokeWidth={2} />
          <Text style={styles.badgeText}>اختیاری · هر وقت خواستی</Text>
        </View>
        <Text style={styles.stepCounter}>{toPersian(idx)} از {toPersian(total)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((idx - 1) / total) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  stepper: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, backgroundColor: Colors.surface },
  stepperTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.okSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.ok },
  stepCounter: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  progressTrack: { height: 5, borderRadius: Radius.pill, backgroundColor: 'rgba(36,33,42,0.08)' },
  progressFill: { height: 5, borderRadius: Radius.pill, backgroundColor: Colors.ok },
  content: { padding: Spacing.xl, paddingBottom: 30 },
  title: { fontSize: 19, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.3, marginBottom: 4 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 20 },
  promptBlock: { marginBottom: 14 },
  question: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.ink, marginBottom: 6, lineHeight: 18 },
  answerInput: {
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderStyle: 'dashed',
    borderRadius: 10, padding: 10, fontSize: 12,
    fontFamily: Fonts.regular, color: Colors.ink, minHeight: 44,
    backgroundColor: Colors.surface,
  },
  answerFilled: { borderStyle: 'solid', borderColor: Colors.ink },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 8, padding: 8,
  },
  refreshText: { fontSize: 12, color: Colors.accent, fontFamily: Fonts.semiBold },
  error: { fontSize: 12, color: Colors.danger, fontFamily: Fonts.regular, marginTop: 8 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnSkip: { flex: 1 },
  btnSave: { flex: 2 },
});
