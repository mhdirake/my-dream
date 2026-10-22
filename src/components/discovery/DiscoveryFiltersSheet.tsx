import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { SelectModal } from '../ui/SelectModal';
import { Sheet } from '../ui/Sheet';
import { AppSwitch } from '../ui/AppSwitch';
import { Colors, Fonts } from '@/constants/colors';
import { locationsApi, type City, type Province } from '@/lib/api/onboarding';
import { filterErrors, selectFilterProvince, type DiscoveryFilterSelection, type DiscoveryGender } from '@/lib/discovery/filters';

export type DiscoveryFiltersSheetProps = {
  token: string;
  selection: DiscoveryFilterSelection;
  allowed: boolean;
  gold: boolean;
  onApply: (selection: DiscoveryFilterSelection) => void;
  onReset: () => void;
  onClose: () => void;
};

/** Mount only while open: dismissing never commits draft edits. */
export function DiscoveryFiltersSheet({ token, selection, allowed, gold, onApply, onReset, onClose }: DiscoveryFiltersSheetProps) {
  const [draft, setDraft] = useState(selection);
  const [errors, setErrors] = useState<ReturnType<typeof filterErrors>>({});
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cityOptions, setCityOptions] = useState<{ provinceId: number; cities: City[] } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const cities = cityOptions?.provinceId === draft.province?.id ? cityOptions?.cities ?? [] : [];
  const citiesLoading = !!draft.province && cityOptions?.provinceId !== draft.province.id && !locationError;

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    locationsApi.getProvinces(token).then(values => { if (active) setProvinces(values); })
      .catch(() => { if (active) setLocationError('دریافت استان‌ها ممکن نشد؛ دوباره تلاش کن.'); });
    return () => { active = false; };
  }, [token, allowed, retry]);

  useEffect(() => {
    if (!allowed || !draft.province) return;
    let active = true;
    const provinceId = draft.province.id;
    locationsApi.getCities(token, provinceId).then(values => {
      if (active) setCityOptions({ provinceId, cities: values });
    }).catch(() => { if (active) setLocationError('دریافت شهرها ممکن نشد؛ دوباره تلاش کن.'); });
    return () => { active = false; };
  }, [token, allowed, draft.province, retry]);

  const apply = () => {
    const nextErrors = filterErrors(draft);
    if (draft.city && !cities.some(city => city.id === draft.city?.id)) nextErrors.city = 'شهر انتخاب‌شده در استان فعلی معتبر نیست.';
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onApply(draft);
  };
  const toggleGender = (gender: DiscoveryGender) => setDraft(previous => ({ ...previous,
    genders: previous.genders.includes(gender) ? previous.genders.filter(value => value !== gender) : [...previous.genders, gender] }));

  return <Sheet visible onClose={onClose} title="فیلترهای کشف" footer={allowed ? <View style={styles.buttons}>
    <Button onPress={apply}>اعمال فیلترها</Button>
    <Button variant="outline" onPress={onReset}>حذف فیلترها</Button>
  </View> : undefined}>
    {!allowed ? <View style={styles.buttons}>
      <Text style={styles.note}>فیلتر سن، جنسیت، استان و شهر مخصوص اشتراک نقره‌ای و طلایی است. کشف پایه همچنان در دسترس توست.</Text>
      <Button onPress={() => { onClose(); router.push('/subscription' as never); }}>ارتقای اشتراک</Button>
    </View> : <>
      <Text style={styles.note}>فقط نتایج جستجو محدود می‌شوند؛ ترجیحات پروفایل و پیشنهادهای روزانه تغییر نمی‌کنند. انتخاب‌ها با بسته‌شدن کامل اپ پاک می‌شوند.</Text>
      <View style={styles.row}>
        <View style={styles.half}><Field label="حداقل سن" value={draft.minAge} keyboardType="numeric" textDirection="ltr" maxLength={3}
          placeholder="بدون حد اضافی" hint="حداقل سن مجاز ۱۸ سال است" error={errors.minAge} onChangeText={minAge => setDraft(previous => ({ ...previous, minAge }))} /></View>
        <View style={styles.half}><Field label="حداکثر سن" value={draft.maxAge} keyboardType="numeric" textDirection="ltr" maxLength={3}
          placeholder="بدون حد اضافی" error={errors.maxAge} onChangeText={maxAge => setDraft(previous => ({ ...previous, maxAge }))} /></View>
      </View>
      <Text style={styles.label}>جنسیت</Text>
      <View style={styles.row}>
        {([['male', 'مرد'], ['female', 'زن']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.genders.includes(value) }} onPress={() => toggleGender(value)}
          style={[styles.gender, draft.genders.includes(value) && styles.selected]}><Text style={styles.label}>{label}</Text></Pressable>)}
        <Pressable accessibilityRole="button" onPress={() => setDraft(previous => ({ ...previous, genders: [] }))} style={styles.gender}><Text style={styles.label}>همه موارد مجاز</Text></Pressable>
      </View>
      <Text style={styles.note}>این انتخاب فقط ترجیح اصلی جنسیت را محدود می‌کند و آن را تغییر نمی‌دهد.</Text>
      <SelectModal label="استان" value={draft.province} options={provinces} loading={!provinces.length && !locationError}
        onSelect={province => { setLocationError(null); setDraft(previous => selectFilterProvince(previous, province)); }} />
      {draft.province && <Button small variant="ghost" onPress={() => setDraft(previous => selectFilterProvince(previous, null))}>حذف استان و شهر</Button>}
      <SelectModal label="شهر (اختیاری)" value={draft.city} options={cities} disabled={!draft.province} loading={citiesLoading}
        onSelect={city => setDraft(previous => ({ ...previous, city }))} />
      {draft.city && <Button small variant="ghost" onPress={() => setDraft(previous => ({ ...previous, city: null }))}>حذف شهر</Button>}
      {errors.city && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.city}</Text>}
      {citiesLoading && <ActivityIndicator color={Colors.accent} />}
      {locationError && <View><Text style={styles.error}>{locationError}</Text><Button small onPress={() => { setLocationError(null); setRetry(value => value + 1); }}>تلاش مجدد</Button></View>}
      <Text style={styles.note}>شهر خصوصیِ کاربران در فیلتر شهر استفاده نمی‌شود؛ در حالت امن ممکن است نتیجه‌ای برای شهر انتخاب‌شده نمایش داده نشود.</Text>
      {gold && <View style={styles.advanced}>
        <Text style={styles.label}>فیلترهای پیشرفتهٔ طلایی</Text>
        <View style={styles.advancedRow}>
          <View style={styles.advancedText}>
            <Text style={styles.label}>فقط کاربران تأییدشده</Text>
            <Text style={styles.note}>بر پایهٔ تأیید شمارهٔ موبایل؛ نشان خریداری‌شده به‌تنهایی کافی نیست.</Text>
          </View>
          <AppSwitch value={draft.verifiedOnly} accessibilityLabel="فقط کاربران تأییدشده"
            onValueChange={verifiedOnly => setDraft(previous => ({ ...previous, verifiedOnly }))} />
        </View>
        <View style={styles.advancedRow}>
          <View style={styles.advancedText}>
            <Text style={styles.label}>حداقل سطح اعتماد</Text>
            <Text style={styles.note}>تا تعریف سطح‌های رسمی Trust در دسترس نیست.</Text>
          </View>
          <AppSwitch value={false} disabled accessibilityLabel="حداقل سطح اعتماد، فعلاً غیرفعال" />
        </View>
        <View style={styles.advancedRow}>
          <View style={styles.advancedText}>
            <Text style={styles.label}>سازگاری شخصیتی</Text>
            <Text style={styles.note}>فقط پروفایل‌هایی با نتیجهٔ معتبر آزمون و رضایت دوطرفه که شباهت سبک ارتباطی‌شان دست‌کم ۷۰٪ است. این معیار تشخیص روان‌شناختی نیست.</Text>
          </View>
          <AppSwitch value={draft.personalityMatch} accessibilityLabel="سازگاری شخصیتی"
            onValueChange={personalityMatch => setDraft(previous => ({ ...previous, personalityMatch }))} />
        </View>
      </View>}
    </>}
  </Sheet>;
}

const styles = StyleSheet.create({
  buttons: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { flex: 1, minWidth: 110 },
  note: { color: Colors.muted, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  label: { color: Colors.ink, fontFamily: Fonts.semiBold, fontSize: 13, textAlign: 'right' },
  gender: { minHeight: 44, borderWidth: 1, borderColor: Colors.lineSoft, borderRadius: 12, padding: 12, justifyContent: 'center' },
  selected: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  error: { color: Colors.danger, fontFamily: Fonts.regular, textAlign: 'right' },
  advanced: { gap: 14, borderTopWidth: 1, borderColor: Colors.lineSoft, paddingTop: 16 },
  advancedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  advancedText: { flex: 1 },
});
