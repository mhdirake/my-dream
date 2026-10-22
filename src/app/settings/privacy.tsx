import { AppBar } from '@/components/ui/AppBar';
import { AppSwitch as Switch } from '@/components/ui/AppSwitch';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { aiInsightApi } from '@/lib/api/ai-insight';
import { profileApi } from '@/lib/api/profile';
import { compatibilityConsents, patchCompatibilityConsent, type CompatibilityConsentKey, type CompatibilityConsentSettings } from '@/lib/api/privacy';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { Brain, ChevronLeft, Eye, MessageCircle, Shield, ShieldOff, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PrivacySettings = CompatibilityConsentSettings & {
  bio_visibility: 'public' | 'hidden';
  lifestyle_tags_visibility: 'public' | 'hidden';
  voice_intro_visibility: 'public' | 'hidden';
  location_visibility: 'public' | 'hidden';
  received_gifts_visibility: 'public' | 'hidden';
  safe_mode_enabled: boolean;
  show_same_gender_in_swipe: boolean;
  dealbreakers_visible: boolean;
  message_permission_mode: string;
  min_profile_completion: number | null;
  personality_test_visibility: 'visible' | 'hidden';
  provinces: { id: number; name: string }[];
  cities: { id: number; name: string }[];
};

type VisibilityKey = 'bio_visibility' | 'lifestyle_tags_visibility' | 'voice_intro_visibility'
  | 'location_visibility' | 'received_gifts_visibility';

const VISIBILITY_OPTIONS: { key: VisibilityKey; title: string; description: string }[] = [
  { key: 'bio_visibility', title: 'متن معرفی', description: 'نمایش متن معرفی در پروفایل دیگران' },
  { key: 'lifestyle_tags_visibility', title: 'علایق و سبک زندگی', description: 'نمایش همه تگ‌های انتخابی' },
  { key: 'location_visibility', title: 'مکان', description: 'در حالت عمومی فقط استان نشان داده می‌شود؛ شهر همیشه خصوصی است.' },
  { key: 'voice_intro_visibility', title: 'معرفی صوتی', description: 'اجازه نمایش معرفی صوتی در صورت داشتن دسترسی لازم' },
  { key: 'received_gifts_visibility', title: 'هدایای دریافتی', description: 'نمایش مجموعه هدایا در پروفایل' },
];

const MODE_LABEL: Record<string, string> = {
  everyone:               'همه',
  verified_only:          'کاربران تأیید شده',
  ai_trusted_verified:    'تأیید هوش مصنوعی',
  community_verified:     'تأیید جامعه',
  silver_plus:            'اشتراک نقره‌ای یا بالاتر',
  gold_only:              'فقط کاربران طلایی',
  selected_provinces:     'استان‌های خاص',
  selected_cities:        'شهرهای خاص',
  high_completion:        'پروفایل تکمیل شده',
  no_reports_or_restrictions: 'بدون گزارش یا محدودیت',
};

const SAFE_MODE_ITEMS = [
  'عکس‌های پروفایل محو نمایش داده می‌شن',
  'در نتایج جستجو پنهان می‌مونی',
  'افراد ناشناس نمی‌تونن پیام بدن',
  'بازدید پروفایلت ثبت نمی‌شه',
];

export default function PrivacyScreen() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSafe, setSavingSafe] = useState(false);
  const [savingSwipeGender, setSavingSwipeGender] = useState(false);
  const [isGold, setIsGold] = useState(false);
  const [insightVisible, setInsightVisible] = useState(true);
  const [savingInsight, setSavingInsight] = useState(false);
  const [savingPersonality, setSavingPersonality] = useState(false);
  const [savingDealbreakers, setSavingDealbreakers] = useState(false);
  const [savingCompatibility, setSavingCompatibility] = useState<CompatibilityConsentKey | null>(null);
  const [savingVisibility, setSavingVisibility] = useState<VisibilityKey | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    api.get<{ data: PrivacySettings }>('/api/client/privacy-settings', session.accessToken)
      .then(res => setSettings(res.data))
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
    profileApi.getProfile(session.accessToken)
      .then(p => {
        setIsGold(p.active_subscription?.plan?.slug === 'gold');
        setInsightVisible((p.ai_public_insight_visibility ?? 'visible') !== 'hidden');
      })
      .catch(() => {});
  }, [session?.accessToken]);

  const toggleInsightVisibility = async (val: boolean) => {
    if (!session?.accessToken || savingInsight) return;
    if (!val && !isGold) {
      toast.error('مخفی‌کردن تحلیل مخصوص اشتراک طلایی است');
      return;
    }
    setSavingInsight(true);
    const prev = insightVisible;
    setInsightVisible(val);
    try {
      await aiInsightApi.setInsightPrivacy(session.accessToken, val ? 'visible' : 'hidden');
    } catch (e: any) {
      setInsightVisible(prev);
      toast.error(e.message ?? 'مخفی‌کردن تحلیل مخصوص اشتراک طلایی است');
    } finally {
      setSavingInsight(false);
    }
  };

  const toggleSafeMode = async (val: boolean) => {
    if (!session?.accessToken || !settings) return;
    setSavingSafe(true);
    const prev = settings.safe_mode_enabled;
    setSettings(s => s ? { ...s, safe_mode_enabled: val } : s);
    try {
      const res = await api.patch<{ data: PrivacySettings }>(
        '/api/client/privacy-settings',
        { safe_mode_enabled: val },
        session.accessToken,
      );
      setSettings(res.data);
    } catch (e: any) {
      setSettings(s => s ? { ...s, safe_mode_enabled: prev } : s);
      toast.error(e.message ?? 'خطا در ذخیره');
    } finally {
      setSavingSafe(false);
    }
  };

  const toggleSwipeGender = async (val: boolean) => {
    if (!session?.accessToken || !settings || savingSwipeGender) return;
    setSavingSwipeGender(true);
    const previous = settings.show_same_gender_in_swipe;
    setSettings(current => current ? { ...current, show_same_gender_in_swipe: val } : current);
    try {
      const response = await api.patch<{ data: PrivacySettings }>(
        '/api/client/privacy-settings',
        { show_same_gender_in_swipe: val },
        session.accessToken,
      );
      setSettings(response.data);
    } catch (error: any) {
      setSettings(current => current ? { ...current, show_same_gender_in_swipe: previous } : current);
      toast.error(error.message ?? 'خطا در ذخیره');
    } finally {
      setSavingSwipeGender(false);
    }
  };

  const togglePersonalityVisibility = async (val: boolean) => {
    if (!session?.accessToken || !settings || savingPersonality) return;
    setSavingPersonality(true);
    const next = val ? 'visible' : 'hidden';
    try {
      const res = await api.patch<{ data: PrivacySettings }>(
        '/api/client/privacy-settings',
        { personality_test_visibility: next },
        session.accessToken,
      );
      setSettings(res.data);
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در ذخیره');
    } finally {
      setSavingPersonality(false);
    }
  };

  const toggleDealbreakersVisibility = async (value: boolean) => {
    if (!session?.accessToken || !settings || savingDealbreakers) return;
    setSavingDealbreakers(true);
    const previous = settings.dealbreakers_visible;
    setSettings(current => current ? { ...current, dealbreakers_visible: value } : current);
    try {
      const response = await api.patch<{ data: PrivacySettings }>(
        '/api/client/privacy-settings', { dealbreakers_visible: value }, session.accessToken,
      );
      setSettings(response.data);
    } catch (error: any) {
      setSettings(current => current ? { ...current, dealbreakers_visible: previous } : current);
      toast.error(error.message ?? 'خطا در ذخیرهٔ نمایش معیارهای شخصی');
    } finally { setSavingDealbreakers(false); }
  };

  const currentMode = settings?.message_permission_mode ?? 'everyone';
  const personalityVisible = settings?.personality_test_visibility === 'visible';
  const toggleVisibility = async (key: VisibilityKey, visible: boolean) => {
    if (!session?.accessToken || !settings || savingVisibility) return;
    setSavingVisibility(key);
    try {
      const response = await api.patch<{ data: PrivacySettings }>('/api/client/privacy-settings',
        { [key]: visible ? 'public' : 'hidden' }, session.accessToken);
      setSettings(response.data);
      toast.success('تنظیم حریم خصوصی ذخیره شد.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ذخیره تنظیم انجام نشد.');
    } finally { setSavingVisibility(null); }
  };
  const consents = compatibilityConsents(settings);
  const toggleCompatibilityConsent = async (key: CompatibilityConsentKey, value: boolean) => {
    if (!session?.accessToken || !settings || savingCompatibility) return;
    setSavingCompatibility(key);
    try {
      const updated = await patchCompatibilityConsent<PrivacySettings>(session.accessToken, key, value);
      setSettings(updated);
      toast.success(value ? 'رضایت استفاده برای سازگاری ثبت شد' : 'رضایت سازگاری لغو شد');
    } catch (error: any) {
      toast.error(error.message ?? 'خطا در ذخیره رضایت سازگاری');
    } finally { setSavingCompatibility(null); }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="حریم خصوصی" back backFallback="/settings" contentGap />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <Text style={styles.sectionTitle}>نمایش اطلاعات پروفایل</Text>
          <Card soft>
            {VISIBILITY_OPTIONS.map(option => <View key={option.key} style={[styles.safeModeRow, { paddingVertical: 9 }]}>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>{option.title}</Text>
                <Text style={styles.modeSub}>{option.description}</Text>
                <Text style={styles.modeSub}>{settings?.[option.key] === 'public' ? 'عمومی' : 'مخفی'}</Text>
              </View>
              <Switch value={settings?.[option.key] === 'public'} accessibilityLabel={option.title}
                onValueChange={value => { void toggleVisibility(option.key, value); }}
                disabled={!settings || savingVisibility !== null}
                trackColor={{ false: Colors.hair, true: Colors.purple + 'AA' }}
                thumbColor={settings?.[option.key] === 'public' ? Colors.purple : Colors.muted} />
            </View>)}
          </Card>

          <Text style={styles.sectionTitle}>تنظیمات جستجو</Text>
          <Card soft>
            <View style={styles.safeModeRow}>
              <View style={[styles.modeIcon, { backgroundColor: Colors.accentSoft }]}>
                <Eye size={20} color={Colors.accent} strokeWidth={2} />
              </View>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>نمایش هم‌جنس در لیست جستجو</Text>
                <Text style={styles.modeSub}>به‌صورت پیش‌فرض فقط جنس مخالف نمایش داده می‌شود.</Text>
              </View>
              <Switch
                value={settings?.show_same_gender_in_swipe ?? false}
                accessibilityLabel="نمایش هم‌جنس در جستجو"
                onValueChange={toggleSwipeGender}
                disabled={savingSwipeGender}
                trackColor={{ false: Colors.hair, true: Colors.accent + 'AA' }}
                thumbColor={settings?.show_same_gender_in_swipe ? Colors.accent : Colors.muted}
              />
            </View>
          </Card>

          {/* Safe Mode */}
          <Text style={styles.sectionTitle}>حالت امن</Text>
          <Card soft style={styles.safeModeCard}>
            <View style={styles.safeModeRow}>
              <View style={[styles.modeIcon, { backgroundColor: settings?.safe_mode_enabled ? Colors.purpleSoft : Colors.ph2 }]}>
                {settings?.safe_mode_enabled
                  ? <Shield size={20} color={Colors.purple} strokeWidth={2} />
                  : <ShieldOff size={20} color={Colors.muted} strokeWidth={2} />
                }
              </View>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>حالت امن</Text>
                <Text style={styles.modeSub}>
                  {settings?.safe_mode_enabled ? 'فعال است' : 'غیرفعال'}
                </Text>
              </View>
              <Switch
                value={settings?.safe_mode_enabled ?? false}
                accessibilityLabel="حالت امن"
                onValueChange={toggleSafeMode}
                disabled={savingSafe}
                trackColor={{ false: Colors.hair, true: Colors.purple + 'AA' }}
                thumbColor={settings?.safe_mode_enabled ? Colors.purple : Colors.muted}
              />
            </View>

            {settings?.safe_mode_enabled && (
              <View style={styles.safeList}>
                {SAFE_MODE_ITEMS.map((item, i) => (
                  <View key={i} style={styles.safeItem}>
                    <View style={styles.safeDot} />
                    <Text style={styles.safeItemTxt}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {!settings?.safe_mode_enabled && (
              <Text style={styles.safeNote}>
                با فعال کردن حالت امن، حریم خصوصی بیشتری خواهی داشت.
              </Text>
            )}
          </Card>

          {/* Message Permission / Trust Gate */}
          <Text style={styles.sectionTitle}>کنترل دریافت پیام</Text>
          <TouchableOpacity
            style={styles.trustGateRow}
            onPress={() => router.push({
              pathname: '/settings/trust-gate' as any,
              params: {
                current: currentMode,
                completion: String(settings?.min_profile_completion ?? 60),
              },
            })}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIcon, { backgroundColor: Colors.trustSoft }]}>
              <MessageCircle size={20} color={Colors.trust} strokeWidth={2} />
            </View>
            <View style={styles.modeText}>
              <Text style={styles.modeTitle}>چه کسی می‌تونه پیام بده؟</Text>
              <Text style={styles.modeSub}>{MODE_LABEL[currentMode] ?? currentMode}</Text>
            </View>
            <ChevronLeft size={18} color={Colors.muted} strokeWidth={2} />
          </TouchableOpacity>

          {/* AI Insight visibility */}
          <Text style={styles.sectionTitle}>تحلیل هوش مصنوعی</Text>
          <Card soft>
            <View style={styles.safeModeRow}>
              <View style={[styles.modeIcon, { backgroundColor: Colors.purpleSoft }]}>
                <Sparkles size={20} color={Colors.purple} strokeWidth={2} />
              </View>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>نمایش تحلیل هوش مصنوعی در پروفایل عمومی</Text>
                <Text style={styles.modeSub}>
                  {insightVisible ? 'قابل مشاهده برای دیگران' : 'مخفی'}
                </Text>
              </View>
              <Switch
                value={insightVisible}
                accessibilityLabel="نمایش تحلیل هوش مصنوعی"
                onValueChange={toggleInsightVisibility}
                disabled={savingInsight}
                trackColor={{ false: Colors.hair, true: Colors.purple + 'AA' }}
                thumbColor={insightVisible ? Colors.purple : Colors.muted}
              />
            </View>
            {!isGold && (
              <Text style={styles.safeNote}>مخفی‌کردن تحلیل مخصوص کاربران اشتراک طلایی است.</Text>
            )}
          </Card>

          {/* Personality test visibility */}
          <Text style={styles.sectionTitle}>معیارهای شخصی آشنایی</Text>
          <Card soft>
            <View style={styles.safeModeRow}>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>نمایش Dealbreakers در جزئیات پروفایل</Text>
                <Text style={styles.modeSub}>فقط موارد تأییدشده، به کاربران طلایی نشان داده می‌شوند؛ روی پیشنهاد یا امتیاز سازگاری اثر ندارند.</Text>
              </View>
              <Switch value={settings?.dealbreakers_visible ?? false} accessibilityLabel="نمایش Dealbreakers در پروفایل"
                onValueChange={toggleDealbreakersVisibility} disabled={savingDealbreakers}
                trackColor={{ false: Colors.hair, true: Colors.purple + 'AA' }}
                thumbColor={settings?.dealbreakers_visible ? Colors.purple : Colors.muted} />
            </View>
          </Card>

          {/* Personality test visibility */}
          <Text style={styles.sectionTitle}>تست شخصیت</Text>
          <Card soft>
            <View style={styles.safeModeRow}>
              <View style={[styles.modeIcon, { backgroundColor: Colors.purpleSoft }]}>
                <Brain size={20} color={Colors.purple} strokeWidth={2} />
              </View>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>نمایش خروجی تست شخصیت در پروفایل</Text>
                <Text style={styles.modeSub}>
                  {personalityVisible ? 'قابل مشاهده برای دیگران' : 'مخفی'}
                </Text>
              </View>
              <Switch
                value={personalityVisible}
                accessibilityLabel="نمایش تست شخصیت"
                onValueChange={togglePersonalityVisibility}
                disabled={savingPersonality}
                trackColor={{ false: Colors.hair, true: Colors.purple + 'AA' }}
                thumbColor={personalityVisible ? Colors.purple : Colors.muted}
              />
            </View>
          </Card>

          <Text style={styles.sectionTitle}>رضایت اختیاری برای مقایسه سازگاری</Text>
          <Card soft>
            <Text style={styles.visTxt}>
              استفاده از این اطلاعات برای مقایسه سازگاری اختیاری است. در خروجی این مقایسه، مقدار خام باور مذهبی یا نتیجه تست شخصیت به طرف مقابل ارائه نمی‌شود.
              این رضایت مستقل از نمایش عمومی پروفایل است و تنظیمات نمایش را تغییر نمی‌دهد. با لغو رضایت، در بررسی بعدی سرور از آن عامل استفاده نمی‌شود.
            </Text>
            {([
              ['compatibility_religion_consent', 'استفاده از باور مذهبی برای مقایسه سازگاری'],
              ['compatibility_personality_consent', 'استفاده از نتیجه تست شخصیت برای مقایسه سازگاری'],
            ] as const).map(([key, label]) => (
              <View key={key} style={[styles.safeModeRow, { marginTop: 16 }]}>
                <View style={styles.modeText}><Text style={styles.modeTitle}>{label}</Text></View>
                <Switch
                  value={consents[key]}
                  accessibilityLabel={label}
                  onValueChange={value => { void toggleCompatibilityConsent(key, value); }}
                  disabled={!settings || savingCompatibility !== null}
                  trackColor={{ false: Colors.hair, true: Colors.purple + 'AA' }}
                  thumbColor={consents[key] ? Colors.purple : Colors.muted}
                />
              </View>
            ))}
          </Card>

          {/* Profile visibility note */}
          <Text style={styles.sectionTitle}>نمایش پروفایل</Text>
          <Card soft>
            <View style={styles.visRow}>
              <Eye size={16} color={Colors.trust} strokeWidth={2} />
              <Text style={styles.visTxt}>
                پروفایل شما در نتایج کشف کاربران دیگر نمایش داده می‌شود. حالت امن رو فعال کن تا پنهان بشی.
              </Text>
            </View>
          </Card>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: 10 },

  sectionTitle: {
    fontSize: 11, fontFamily: Fonts.extraBold, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: Spacing.lg, marginBottom: 6,
  },

  safeModeCard: { gap: 0 },
  safeModeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeText: { flex: 1 },
  modeTitle: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.ink },
  modeSub: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },

  safeList: { marginTop: 14, gap: 8, borderTopWidth: 1, borderTopColor: Colors.hair, paddingTop: 14 },
  safeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  safeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.purple, marginTop: 5 },
  safeItemTxt: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 20 },

  safeNote: {
    fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular,
    marginTop: 12, lineHeight: 18,
  },

  trustGateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.lg,
  },

  visRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  visTxt: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 20 },
});
