import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { router } from 'expo-router';
import { Check, Info, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LEVELS = [
  'اصلاً مذهبی نیستم',
  'خیلی کم',
  'متوسط',
  'نسبتاً مذهبی',
  'مذهبی',
];

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function ReligionScreen() {
  const { session } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!session?.accessToken || selected === null) return;
    setSaving(true);
    setError('');
    try {
      await profileApi.updateProfile(session.accessToken, { religiosity_level: selected + 1 });
      router.push('/profile-setup/red-flags' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <OptStepper idx={5} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>میزان مذهبی بودن</Text>
        <Text style={styles.sub}>اختیاری · فقط برای تطابق بهتر، طیفی محاسبه می‌شود</Text>

        {LEVELS.map((l, i) => (
          <Pressable
            key={i}
            onPress={() => setSelected(i)}
            style={[styles.option, selected === i && styles.optionActive]}
          >
            <View style={[styles.num, selected === i && styles.numActive]}>
              <Text style={[styles.numText, selected === i && styles.numTextActive]}>
                {toPersian(i + 1)}
              </Text>
            </View>
            <Text style={[styles.optionLabel, selected === i && styles.optionLabelActive]}>
              {l}
            </Text>
            {selected === i && <Check size={16} color={Colors.accent} strokeWidth={2.5} />}
          </Pressable>
        ))}

        <Card tint="trust" style={styles.note}>
          <View style={styles.noteRow}>
            <Info size={13} color={Colors.trust} strokeWidth={2} />
            <Text style={styles.noteText}>
              در Match به‌صورت طیفی محاسبه می‌شود، نه تطابق دقیق
            </Text>
          </View>
        </Card>

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
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderRadius: 10,
    padding: 12, marginBottom: 8, backgroundColor: Colors.surface,
  },
  optionActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  num: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  numActive: { backgroundColor: Colors.accent },
  numText: { fontSize: 11, fontFamily: Fonts.bold, color: '#fff' },
  numTextActive: { color: '#fff' },
  optionLabel: { flex: 1, fontSize: 13, color: Colors.ink, fontFamily: Fonts.regular },
  optionLabelActive: { color: Colors.accent, fontFamily: Fonts.semiBold },
  note: { marginTop: 8 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { fontSize: 12, color: Colors.trust, fontFamily: Fonts.regular, flex: 1, lineHeight: 18 },
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
