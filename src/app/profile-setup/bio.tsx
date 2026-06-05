import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX = 70;
const TOTAL_OPT = 8;
const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function BioScreen() {
  const { session } = useAuth();
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!session?.accessToken) return;
    setSaving(true);
    setError('');
    try {
      await profileApi.updateProfile(session.accessToken, { bio: bio.trim() || undefined });
      router.push('/profile-setup/rel-goal' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <OptStepper idx={1} total={TOTAL_OPT} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>کمی درباره خودت</Text>
        <Text style={styles.sub}>حداکثر {toPersian(MAX)} کاراکتر — کوتاه و گویا</Text>

        <TextInput
          style={styles.bioInput}
          value={bio}
          onChangeText={v => setBio(v.slice(0, MAX))}
          placeholder="بیو خودت رو بنویس…"
          placeholderTextColor={Colors.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={MAX}
        />
        <Text style={styles.counter}>{toPersian(bio.length)} / {toPersian(MAX)}</Text>

        <Card soft style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Sparkles size={14} color={Colors.purple} strokeWidth={2} />
            <Text style={styles.aiTitle}>کمک از AI Coach</Text>
            <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>پیشنهاد</Text></View>
          </View>
          <Text style={styles.aiBody}>
            می‌تونی به AI Coach بگی درباره چی هستی، یه Bio کوتاه برات بسازه.
          </Text>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button variant="ghost" onPress={() => router.push('/profile-setup/account-ready' as any)} full={false} style={styles.btnSkip}>فعلاً نه</Button>
          <Button variant="accent" onPress={handleSave} disabled={saving} full={false} style={styles.btnSave}>
            {saving ? 'در حال ذخیره…' : 'ذخیره و ادامه'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function OptStepper({ idx, total }: { idx: number; total: number }) {
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
  bioInput: {
    borderWidth: 1.5, borderColor: Colors.ink, borderRadius: 10,
    padding: 12, minHeight: 100, fontSize: 14, fontFamily: Fonts.regular,
    color: Colors.ink, lineHeight: 22, backgroundColor: Colors.surface,
    textAlignVertical: 'top',
  },
  counter: { fontSize: 11, color: Colors.muted, textAlign: 'left', marginTop: 5, fontFamily: Fonts.regular },
  aiCard: { marginTop: 16 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiTitle: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink, flex: 1 },
  aiBadge: {
    backgroundColor: Colors.accentSoft, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: Radius.pill,
  },
  aiBadgeText: { fontSize: 10, color: Colors.accent, fontFamily: Fonts.semiBold },
  aiBody: { fontSize: 11, color: Colors.muted, lineHeight: 17 },
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
