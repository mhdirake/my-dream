import { Button } from '@/components/ui/Button';
import { AppBar } from '@/components/ui/AppBar';
import { Field } from '@/components/ui/Field';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { KeyboardStickyBar } from '@/components/ui/KeyboardStickyBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { onboardingApi } from '@/lib/api/onboarding';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileSetupStore } from '@/lib/profileSetupStore';
import { IdentityHydration, identityBirthDate, identityDisplayName, normalizeDateDigits } from '@/lib/profileIdentity';
import { toast } from '@/lib/toast';
import { useSafeBack } from '@/lib/useSafeBack';
import { router, useLocalSearchParams } from 'expo-router';
import { toJalaali } from 'jalaali-js';
import { CheckCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Gender = 'female' | 'male';
const GENDERS: { key: Gender; label: string }[] = [
  { key: 'female', label: 'زن' },
  { key: 'male', label: 'مرد' },
];

const toPersian = (n: number | string) =>
  String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function BasicInfoScreen() {
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEdit = mode === 'edit';
  const safeBack = useSafeBack('/profile-edit');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const hydration = useRef(new IdentityHydration());
  const accountId = session?.userId ?? user?.id;

  useEffect(() => {
    if (!session?.accessToken) return;
    const scope = `${accountId ?? 'pending'}:${isEdit ? 'edit' : 'setup'}:${reload}`;
    if (!hydration.current.needsLoad(scope)) return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    setName(''); setYear(''); setMonth(''); setDay(''); setGender(null);
    const loadProfile = isEdit ? profileApi.getProfile(session.accessToken)
      : onboardingApi.getStatus(session.accessToken).then(status => status.user);
    loadProfile.then(u => {
      if (!active) return;
      hydration.current.complete(scope);
      setName(identityDisplayName(u.first_name, u.last_name));
      if (u.birth_date) {
        const d = u.birth_date.split('T')[0]; // "2000-10-10"
        const [gy, gm, gd] = d.split('-').map(Number);
        const { jy, jm, jd } = toJalaali(gy, gm, gd);
        setYear(String(jy));
        setMonth(String(jm));
        setDay(String(jd));
      }
      if (u.gender && ['female', 'male'].includes(u.gender)) {
        setGender(u.gender as Gender);
      }
    }).catch(() => {
      if (active) { setLoadError(true); toast.error('خطا در دریافت اطلاعات هویتی'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.accessToken, accountId, isEdit, reload]);

  const birthDate = identityBirthDate(year, month, day);

  const canContinue = !loading && !loadError && name.trim().length >= 2 && !!birthDate && !!gender;

  const handleNext = async () => {
    if (!canContinue || saving) return;
    if (isEdit) {
      if (!session?.accessToken) return;
      setSaving(true);
      try {
        await profileApi.updateProfile(session.accessToken, {
          first_name: name.trim(), last_name: null,
          birth_date: birthDate!, gender: gender!,
        });
        toast.success('اطلاعات هویتی ذخیره شد');
        safeBack();
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'خطا در ذخیره اطلاعات');
      } finally { setSaving(false); }
      return;
    }
    profileSetupStore.set({
      first_name: name.trim(),
      birth_date: birthDate!,
      gender: gender!,
    });
    router.push('/profile-setup/location' as any);
  };

  return (
    <SafeAreaView style={styles.root}>
      {isEdit ? <AppBar title="ویرایش اطلاعات هویتی" back backFallback="/profile-edit" /> : <Stepper step={1} />}
      <KeyboardAvoider>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>اطلاعات پایه</Text>
        <Text style={styles.sub}>{isEdit ? 'نام، تاریخ تولد و جنسیت خودت را ویرایش کن' : 'فقط چند مورد ضروری — بقیه بعداً'}</Text>
        {loadError && <Button variant="ghost" onPress={() => { setLoading(true); setLoadError(false); setReload(value => value + 1); }}>تلاش دوباره</Button>}

        <Field
          label="نام"
          required
          hint="حداقل ۲ کاراکتر"
          maxLength={255}
          error={name.length > 0 && name.trim().length < 2 ? 'نام باید حداقل ۲ کاراکتر باشد' : undefined}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading && !loadError && !saving}
        />

        <Text style={styles.fieldLabel}>تاریخ تولد (شمسی)<Text style={{ color: Colors.danger }}> *</Text></Text>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.regular, fontSize: 11 }}>حداقل سن مجاز ۱۸ سال است</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.dateInput, styles.dateField]}
            value={day}
            onChangeText={v => setDay(normalizeDateDigits(v).slice(0, 2))}
            placeholder="روز"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
            maxLength={2}
            textAlign="center"
            editable={!loading && !loadError && !saving}
          />
          <TextInput
            style={[styles.dateInput, styles.dateField]}
            value={month}
            onChangeText={v => setMonth(normalizeDateDigits(v).slice(0, 2))}
            placeholder="ماه"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
            maxLength={2}
            textAlign="center"
            editable={!loading && !loadError && !saving}
          />
          <TextInput
            style={[styles.dateInput, styles.dateField]}
            value={year}
            onChangeText={v => setYear(normalizeDateDigits(v).slice(0, 4))}
            placeholder="سال"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
            maxLength={4}
            textAlign="center"
            editable={!loading && !loadError && !saving}
          />
        </View>
        <Text style={styles.hint}>مثلاً ۱۵ / ۰۶ / ۱۳۷۷ — حداقل سن ۱۸ سال</Text>
        {year.length === 4 && month && day && !birthDate && <Text style={[styles.hint, { color: Colors.danger }]}>تاریخ تولد معتبر وارد کن؛ حداقل سن مجاز ۱۸ سال است</Text>}

        <Text style={styles.fieldLabel}>جنسیت<Text style={{ color: Colors.danger }}> *</Text></Text>
        <View style={styles.genderRow}>
          {GENDERS.map(g => (
            <Pressable
              key={g.key}
              onPress={() => setGender(g.key)}
              disabled={loading || loadError || saving}
              style={[styles.genderChip, gender === g.key && styles.genderChipActive]}
            >
              {gender === g.key && (
                <CheckCircle size={13} color={Colors.accent} strokeWidth={2.5} />
              )}
              <Text style={[styles.genderLabel, gender === g.key && styles.genderLabelActive]}>
                {g.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoider>

      <KeyboardStickyBar style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button variant="accent" onPress={handleNext} disabled={!canContinue || saving}>
          {loading ? 'در حال دریافت…' : saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره' : 'ادامه'}
        </Button>
      </KeyboardStickyBar>
    </SafeAreaView>
  );
}

function Stepper({ step }: { step: number }) {
  const total = 3;
  return (
    <View style={styles.stepper}>
      <View style={styles.stepperTop}>
        <View style={styles.badge}>
          <CheckCircle size={11} color={Colors.accent} strokeWidth={2.5} />
          <Text style={styles.badgeText}>اطلاعات ضروری</Text>
        </View>
        <Text style={styles.stepCounter}>
          مرحله {toPersian(step)} از {toPersian(total)}
        </Text>
      </View>
      <View style={styles.bars}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.stepBar, i < step ? styles.stepBarFilled : styles.stepBarEmpty]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  stepper: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: Colors.surface,
  },
  stepperTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 9,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentSoft, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.accent },
  stepCounter: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  bars: { flexDirection: 'row', gap: 6 },
  stepBar: { flex: 1, height: 6, borderRadius: Radius.pill },
  stepBarFilled: { backgroundColor: Colors.accent },
  stepBarEmpty: { backgroundColor: 'rgba(36,33,42,0.08)' },
  content: { padding: Spacing.lg, paddingBottom: 30 },
  title: {
    fontSize: 19, fontFamily: Fonts.extraBold, color: Colors.ink,
    letterSpacing: -0.3, marginBottom: 4,
  },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 20 },
  fieldLabel: { fontSize: 12, color: Colors.inkSoft, marginBottom: 7, fontFamily: Fonts.semiBold },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  dateField: { flex: 1 },
  dateInput: {
    flex: 1,
    writingDirection: "rtl",
    width: "33%",
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 12, fontSize: 14,
    fontFamily: Fonts.regular, color: Colors.ink, backgroundColor: Colors.surface,
  },
  hint: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 20 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  genderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: Colors.lineSoft, borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.surface,
  },
  genderChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  genderLabel: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft },
  genderLabelActive: { color: Colors.accent, fontFamily: Fonts.semiBold },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
