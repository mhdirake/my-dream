import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { ChevronLeft, Eye, MessageCircle, Shield, ShieldOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Switch,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PrivacySettings = {
  safe_mode_enabled: boolean;
  message_permission_mode: string;
  min_profile_completion: number | null;
  provinces: { id: number; name: string }[];
  cities: { id: number; name: string }[];
};

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

  useEffect(() => {
    if (!session?.accessToken) return;
    api.get<{ data: PrivacySettings }>('/api/client/privacy-settings', session.accessToken)
      .then(res => setSettings(res.data))
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

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

  const currentMode = settings?.message_permission_mode ?? 'everyone';

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="حریم خصوصی" back />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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
