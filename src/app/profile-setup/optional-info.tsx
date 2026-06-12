import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { SelectModal, type SelectOption } from '@/components/ui/SelectModal';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EDUCATION_OPTIONS: SelectOption[] = [
  { id: 1, name: 'زیردیپلم' },
  { id: 2, name: 'دیپلم' },
  { id: 3, name: 'کاردانی' },
  { id: 4, name: 'کارشناسی' },
  { id: 5, name: 'کارشناسی ارشد' },
  { id: 6, name: 'دکترا' },
];

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function OptionalInfoScreen() {
  const { session } = useAuth();
  const { mode, currentHeight, currentJob, currentEducation } = useLocalSearchParams<{
    mode?: string; currentHeight?: string; currentJob?: string; currentEducation?: string;
  }>();
  const isEdit = mode === 'edit';
  const [height, setHeight] = useState(typeof currentHeight === 'string' ? currentHeight : '');
  const [job, setJob] = useState(typeof currentJob === 'string' ? currentJob : '');
  const [education, setEducation] = useState<SelectOption | null>(() => {
    if (typeof currentEducation === 'string' && currentEducation) {
      return EDUCATION_OPTIONS.find(e => e.name === currentEducation) ?? null;
    }
    return null;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasSomething = height.trim() || job.trim() || education;

  const handleSave = async () => {
    if (!session?.accessToken || !hasSomething) return;
    setSaving(true);
    setError('');
    try {
      await profileApi.updateProfile(session.accessToken, {
        height_cm: height ? Number(height) : undefined,
        job: job.trim() || undefined,
        education: education?.name || undefined,
      });
      if (isEdit) router.back();
      else router.push('/profile-setup/about-me' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {!isEdit && <OptStepper idx={7} />}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>قد، شغل، تحصیلات</Text>
        <Text style={styles.sub}>پر کردن این موارد به Match Quality و اعتماد کمک می‌کند</Text>

        <Field
          label="قد (سانتیمتر)"
          value={height}
          onChangeText={v => setHeight(v.replace(/\D/g, ''))}
          placeholder="مثلاً ۱۷۰"
          keyboardType="numeric"
          suffix="cm"
        />
        <Field
          label="شغل"
          value={job}
          onChangeText={setJob}
          placeholder="شغل یا حرفه‌ات"
        />
        <SelectModal
          label="تحصیلات"
          placeholder="انتخاب مقطع"
          value={education}
          options={EDUCATION_OPTIONS}
          onSelect={setEducation}
        />

        <Card soft style={styles.voiceCard}>
          <View style={styles.voiceRow}>
            <View>
              <Text style={styles.voiceTitle}>🎤 Voice Intro</Text>
              <Text style={styles.voiceSub}>۳۰-۶۰ ثانیه. فقط Silver/Gold</Text>
            </View>
            <View style={styles.lockBadge}>
              <Lock size={11} color={Colors.muted} strokeWidth={2} />
              <Text style={styles.lockText}>قفل</Text>
            </View>
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button variant="ghost" onPress={() => router.back()} full={false} style={styles.btnSkip}>فعلاً نه</Button>
          <Button variant="accent" onPress={handleSave} disabled={!hasSomething || saving} full={false} style={styles.btnSave}>
            {saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره' : 'ذخیره و ادامه'}
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
  voiceCard: { marginTop: 4 },
  voiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voiceTitle: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 2 },
  voiceSub: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.regular },
  lockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(36,33,42,0.06)', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: Radius.pill,
  },
  lockText: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.semiBold },
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
