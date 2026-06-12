import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { lookupsApi, type LanguageOption } from '@/lib/api/onboarding';
import { profileApi } from '@/lib/api/profile';
import { router, useLocalSearchParams } from 'expo-router';
import { Star, Sparkles } from 'lucide-react-native';
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

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export default function LanguagesScreen() {
  const { session } = useAuth();
  const { mode, currentLangIds, currentPrimary: currentPrimaryParam } = useLocalSearchParams<{
    mode?: string; currentLangIds?: string; currentPrimary?: string;
  }>();
  const isEdit = mode === 'edit';
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [selected, setSelected] = useState<number[]>(() => {
    if (typeof currentLangIds === 'string' && currentLangIds) {
      try { return JSON.parse(currentLangIds); } catch { return []; }
    }
    return [];
  });
  const [primary, setPrimary] = useState<number | null>(() => {
    if (typeof currentPrimaryParam === 'string' && currentPrimaryParam) {
      const n = Number(currentPrimaryParam);
      return isNaN(n) ? null : n;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadLanguages = () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setLoadError('');
    lookupsApi
      .getLanguages(session.accessToken)
      .then(data => {
        setLanguages(data);
        if (!data.length) setLoadError('سرور داده‌ای برنگرداند');
      })
      .catch(e => setLoadError(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLanguages(); }, [session]);

  const toggleLang = (id: number) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        if (primary === id) setPrimary(null);
        return prev.filter(x => x !== id);
      }
      const next = [...prev, id];
      if (!primary) setPrimary(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!session?.accessToken || selected.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const langs = selected.map(id => ({ id, is_primary: id === primary }));
      await profileApi.updateProfile(session.accessToken, { languages: langs });
      if (isEdit) router.back();
      else router.push('/profile-setup/religion' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {!isEdit && <OptStepper idx={4} />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>زبان‌ها و گویش‌ها</Text>
        <Text style={styles.sub}>چند زبان انتخاب کن — یکی به‌عنوان زبان اصلی</Text>

        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.errBox}>
            <Text style={styles.errTxt}>{loadError}</Text>
            <Pressable onPress={loadLanguages} style={styles.retryBtn}>
              <Text style={styles.retryTxt}>تلاش مجدد</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {selected.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>انتخاب‌شده‌ها — ضربه بزن تا اصلی بشه</Text>
                <View style={styles.chips}>
                  {selected.map(id => {
                    const lang = languages.find(l => l.id === id);
                    if (!lang) return null;
                    const isPrimary = id === primary;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => setPrimary(id)}
                        onLongPress={() => toggleLang(id)}
                        style={[styles.chip, isPrimary ? styles.chipPrimary : styles.chipSelected]}
                      >
                        {isPrimary && <Star size={11} color="#fff" strokeWidth={2} fill="#fff" />}
                        <Text style={[styles.chipText, (isPrimary || true) && styles.chipTextSelected]}>
                          {lang.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>همه زبان‌ها</Text>
              <View style={styles.chips}>
                {languages.map(lang => {
                  const isSelected = selected.includes(lang.id);
                  return (
                    <Pressable
                      key={lang.id}
                      onPress={() => toggleLang(lang.id)}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {lang.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button variant="ghost" onPress={() => router.back()} full={false} style={styles.btnSkip}>فعلاً نه</Button>
          <Button variant="accent" onPress={handleSave} disabled={selected.length === 0 || saving} full={false} style={styles.btnSave}>
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
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 16 },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.muted, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.pill, paddingHorizontal: 13, paddingVertical: 7,
    backgroundColor: 'rgba(36,33,42,0.04)', borderWidth: 1.5, borderColor: Colors.lineSoft,
  },
  chipSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipPrimary: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  chipTextSelected: { color: '#fff' },
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
