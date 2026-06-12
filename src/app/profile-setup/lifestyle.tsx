import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { lookupsApi, type LifestyleTagOption } from '@/lib/api/onboarding';
import { profileApi } from '@/lib/api/profile';
import { router, useLocalSearchParams } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MIN = 3;
const MAX = 7;
const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function LifestyleScreen() {
  const { session } = useAuth();
  const { mode, currentTagIds } = useLocalSearchParams<{ mode?: string; currentTagIds?: string }>();
  const isEdit = mode === 'edit';
  const [tags, setTags] = useState<LifestyleTagOption[]>([]);
  const [selected, setSelected] = useState<number[]>(() => {
    if (typeof currentTagIds === 'string' && currentTagIds) {
      try { return JSON.parse(currentTagIds); } catch { return []; }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadTags = () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setLoadError('');
    lookupsApi
      .getLifestyleTags(session.accessToken)
      .then(data => {
        setTags(data);
        if (!data.length) setLoadError('سرور داده‌ای برنگرداند');
      })
      .catch(e => setLoadError(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTags(); }, [session]);

  const byCategory = useMemo(() => {
    const map = new Map<string, LifestyleTagOption[]>();
    tags.forEach(t => {
      const cat = t.lifestyle_tag_category?.name ?? 'سایر';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    });
    return Array.from(map.entries());
  }, [tags]);

  const toggle = (id: number) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < MAX
          ? [...prev, id]
          : prev,
    );
  };

  const canSave = selected.length >= MIN;

  const handleSave = async () => {
    if (!session?.accessToken || !canSave) return;
    setSaving(true);
    setError('');
    try {
      await profileApi.updateProfile(session.accessToken, { lifestyle_tag_ids: selected });
      if (isEdit) router.back();
      else router.push('/profile-setup/languages' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {!isEdit && <OptStepper idx={3} />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>سبک زندگی</Text>
        <View style={styles.subRow}>
          <Text style={styles.sub}>{toPersian(MIN)} تا {toPersian(MAX)} تگ انتخاب کن</Text>
          <Text style={[styles.counter, selected.length >= MIN && styles.counterOk]}>
            {toPersian(selected.length)} / {toPersian(MAX)}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.errBox}>
            <Text style={styles.errTxt}>{loadError}</Text>
            <Pressable onPress={loadTags} style={styles.retryBtn}>
              <Text style={styles.retryTxt}>تلاش مجدد</Text>
            </Pressable>
          </View>
        ) : (
          byCategory.map(([cat, catTags]) => (
            <View key={cat} style={styles.category}>
              <Text style={styles.catLabel}>{cat}</Text>
              <View style={styles.chips}>
                {catTags.map(t => (
                  <Pressable
                    key={t.id}
                    onPress={() => toggle(t.id)}
                    style={[styles.chip, selected.includes(t.id) && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selected.includes(t.id) && styles.chipTextActive]}>
                      {t.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button variant="ghost" onPress={() => router.back()} full={false} style={styles.btnSkip}>فعلاً نه</Button>
          <Button variant="accent" onPress={handleSave} disabled={!canSave || saving} full={false} style={styles.btnSave}>
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
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular },
  counter: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.semiBold },
  counterOk: { color: Colors.ok },
  category: { marginBottom: 16 },
  catLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.muted, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: Radius.pill, paddingHorizontal: 13, paddingVertical: 7,
    backgroundColor: 'rgba(36,33,42,0.04)', borderWidth: 1.5, borderColor: Colors.lineSoft,
  },
  chipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  chipTextActive: { color: '#fff' },
  error: { fontSize: 12, color: Colors.danger, fontFamily: Fonts.regular, marginTop: 8 },
  errBox: { alignItems: 'center', marginTop: 40, gap: 12 },
  errTxt: { fontSize: 13, color: Colors.danger, fontFamily: Fonts.regular },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
  },
  retryTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.accent },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnSkip: { flex: 1 },
  btnSave: { flex: 2 },
});
