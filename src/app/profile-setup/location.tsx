import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelectModal, type SelectOption } from '@/components/ui/SelectModal';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { locationsApi, onboardingApi } from '@/lib/api/onboarding';
import { profileSetupStore } from '@/lib/profileSetupStore';
import { router } from 'expo-router';
import { CheckCircle, Shield } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LocationScreen() {
  const { session } = useAuth();
  const [provinces, setProvinces] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [province, setProvince] = useState<SelectOption | null>(null);
  const [city, setCity] = useState<SelectOption | null>(null);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.accessToken) return;
    setLoadingProvinces(true);
    locationsApi
      .getProvinces(session.accessToken)
      .then(data => setProvinces(data.map(p => ({ id: p.id, name: p.name }))))
      .catch(() => {})
      .finally(() => setLoadingProvinces(false));
  }, [session]);

  const handleProvinceSelect = (p: SelectOption) => {
    setProvince(p);
    setCity(null);
    setCities([]);
    if (!session?.accessToken) return;
    setLoadingCities(true);
    locationsApi
      .getCities(session.accessToken, p.id)
      .then(data => setCities(data.map(c => ({ id: c.id, name: c.name }))))
      .catch(() => {})
      .finally(() => setLoadingCities(false));
  };

  const canContinue = !!province && !!city;

  const handleNext = async () => {
    if (!canContinue || !session?.accessToken) return;
    setError('');
    setSubmitting(true);
    try {
      const stored = profileSetupStore.get();
      await onboardingApi.saveRequiredProfile(session.accessToken, {
        first_name: stored.first_name!,
        birth_date: stored.birth_date!,
        gender: stored.gender!,
        province_id: province!.id,
        city_id: city!.id,
      });
      profileSetupStore.set({
        province_id: province!.id,
        province_name: province!.name,
        city_id: city!.id,
        city_name: city!.name,
      });
      router.push('/profile-setup/photo' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره اطلاعات');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Stepper step={2} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>مکان</Text>
        <Text style={styles.sub}>استان و شهر لازمه — پایهٔ پیشنهادهاست</Text>

        <SelectModal
          label="استان"
          placeholder="انتخاب استان"
          value={province}
          options={provinces}
          loading={loadingProvinces}
          onSelect={handleProvinceSelect}
        />

        <SelectModal
          label="شهر"
          placeholder={province ? 'انتخاب شهر' : 'اول استان رو انتخاب کن'}
          value={city}
          options={cities}
          loading={loadingCities}
          disabled={!province}
          onSelect={setCity}
        />

        <Card tint="trust" style={styles.note}>
          <View style={styles.noteRow}>
            <Shield size={14} color={Colors.trust} strokeWidth={2} />
            <Text style={styles.noteText}>
              در Safe Mode فقط استان به دیگران نشون داده می‌شود
            </Text>
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button
            variant="ghost"
            onPress={() => router.back()}
            full={false}
            style={styles.btnBack}
          >
            قبلی
          </Button>
          <Button
            variant="accent"
            onPress={handleNext}
            disabled={!canContinue || submitting}
            full={false}
            style={styles.btnNext}
          >
            {submitting ? 'در حال ذخیره…' : 'ادامه'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stepper({ step }: { step: number }) {
  const total = 3;
  const toPersian = (n: number) =>
    String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
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
          <View key={i} style={[styles.stepBar, i < step ? styles.barFilled : styles.barEmpty]} />
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
  barFilled: { backgroundColor: Colors.accent },
  barEmpty: { backgroundColor: 'rgba(36,33,42,0.08)' },
  content: { padding: Spacing.xl, paddingBottom: 30 },
  title: { fontSize: 19, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.3, marginBottom: 4 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 20 },
  note: { marginTop: 4 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { fontSize: 12, color: Colors.trust, fontFamily: Fonts.regular, flex: 1, lineHeight: 18 },
  error: { fontSize: 12, color: Colors.danger, fontFamily: Fonts.regular, marginTop: 8 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnBack: { flex: 1 },
  btnNext: { flex: 2 },
});
