import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { lookupsApi, type RelationshipGoal } from '@/lib/api/onboarding';
import { profileApi } from '@/lib/api/profile';
import { router } from 'expo-router';
import { Check, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EMOJI_MAP: Record<string, string> = {
  marriage: '💍',
  serious_dating: '🤝',
  long_term: '❤️',
  short_term: '💫',
  casual: '☕',
  friendship: '🫂',
  online_only: '💬',
  not_sure: '🤷',
  activity_partner: '🎬',
  travel_partner: '🧳',
  networking: '🌐',
};

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function RelGoalScreen() {
  const { session } = useAuth();
  const [goals, setGoals] = useState<RelationshipGoal[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.accessToken) return;
    setLoading(true);
    lookupsApi
      .getRelationshipGoals(session.accessToken)
      .then(setGoals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleSave = async () => {
    if (!session?.accessToken || selected === null) return;
    setSaving(true);
    setError('');
    try {
      await profileApi.updateProfile(session.accessToken, { relationship_goal_id: selected });
      router.push('/profile-setup/lifestyle' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <OptStepper idx={2} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>هدفت از حضور در اپ؟</Text>
        <Text style={styles.sub}>فقط یک گزینه. در Match وزن بالایی دارد.</Text>

        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : (
          goals.map(g => (
            <Pressable
              key={g.id}
              onPress={() => setSelected(g.id)}
              style={[styles.option, selected === g.id && styles.optionActive]}
            >
              <Text style={styles.optionEmoji}>{EMOJI_MAP[g.label] ?? '•'}</Text>
              <Text style={[styles.optionLabel, selected === g.id && styles.optionLabelActive]}>
                {g.label}
              </Text>
              <View style={[styles.radio, selected === g.id && styles.radioActive]}>
                {selected === g.id && <Check size={11} color="#fff" strokeWidth={3} />}
              </View>
            </Pressable>
          ))
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button variant="ghost" onPress={() => router.back()} full={false} style={styles.btnSkip}>فعلاً نه</Button>
          <Button variant="accent" onPress={handleSave} disabled={selected === null || saving} full={false} style={styles.btnSave}>
            {saving ? 'در حال ذخیره…' : 'ذخیره و ادامه'}
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
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 16 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  optionActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  optionEmoji: { fontSize: 18 },
  optionLabel: { flex: 1, fontSize: 13, color: Colors.ink, fontFamily: Fonts.regular },
  optionLabelActive: { color: Colors.accent, fontFamily: Fonts.semiBold },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.lineSoft,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.accent, backgroundColor: Colors.accent },
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
