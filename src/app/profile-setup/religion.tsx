import { Button } from '@/components/ui/Button';
import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { toast } from '@/lib/toast';
import { useSafeBack } from '@/lib/useSafeBack';
import { religiosityIndex, RELIGIOSITY_LEVELS } from '@/lib/religiosity';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Info, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function ReligionScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { mode, currentLevel } = useLocalSearchParams<{ mode?: string; currentLevel?: string }>();
  const isEdit = mode === 'edit';
  const safeBack = useSafeBack('/profile-edit');
  const [selected, setSelected] = useState<number | null>(() => religiosityIndex(currentLevel));
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !session?.accessToken) return;
    let active = true;
    profileApi.getProfile(session.accessToken)
      .then(profile => { if (active) setSelected(religiosityIndex(profile.religiosity_level)); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isEdit, session?.accessToken, reload]);

  const handleSave = async () => {
    if (!session?.accessToken || selected === null || loading || loadError || saving) return;
    setSaving(true);
    try {
      await profileApi.updateProfile(session.accessToken, { religiosity_level: selected + 1 });
      if (isEdit) {
        toast.success('میزان مذهبی بودن ذخیره شد');
        safeBack();
      } else router.push('/profile-setup/red-flags' as any);
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {isEdit ? <AppBar title="میزان مذهبی بودن" back backFallback="/profile-edit" /> : <OptStepper idx={5} />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>میزان مذهبی بودن</Text>
        <Text style={styles.sub}>اختیاری · فقط برای تطابق بهتر، طیفی محاسبه می‌شود</Text>

        {loading && <ActivityIndicator color={Colors.accent} />}
        {loadError && <Button variant="ghost" onPress={() => { setLoading(true); setLoadError(false); setReload(value => value + 1); }}>تلاش دوباره برای دریافت اطلاعات</Button>}
        {RELIGIOSITY_LEVELS.map((l, i) => (
          <Pressable
            key={i}
            disabled={loading || loadError || saving}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === i, disabled: loading || loadError || saving }}
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

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.btnRow}>
          <Button variant="ghost" onPress={() => isEdit ? safeBack() : router.push('/profile-setup/red-flags' as any)} disabled={saving} full={false} style={styles.btnSkip}>{isEdit ? 'انصراف' : 'فعلاً نه'}</Button>
          <Button variant="accent" onPress={handleSave} disabled={selected === null || saving || loading || loadError} full={false} style={styles.btnSave}>
            {saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره تغییرات' : 'ذخیره و ادامه'}
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
  content: { padding: Spacing.lg, paddingBottom: 30 },
  title: { fontSize: 19, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.3, marginBottom: 4 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderRadius: 10,
    padding: 12, marginBottom: 8, backgroundColor: Colors.surface,
  },
  optionActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  num: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  numActive: { backgroundColor: Colors.accent },
  numText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.ink },
  numTextActive: { color: Colors.onAccent },
  optionLabel: { flex: 1, fontSize: 13, color: Colors.ink, fontFamily: Fonts.regular },
  optionLabelActive: { color: Colors.accent, fontFamily: Fonts.semiBold },
  note: { marginTop: 8 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { fontSize: 12, color: Colors.trust, fontFamily: Fonts.regular, flex: 1, lineHeight: 18 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnSkip: { flex: 1 },
  btnSave: { flex: 2 },
});
