import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { profileApi } from '@/lib/api/profile';
import { toast } from '@/lib/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Star, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type Mode = {
  key: string;
  label: string;
  desc: string;
  lock?: 'silver' | 'gold';
};

const MODES: Mode[] = [
  {
    key: 'everyone',
    label: 'همه',
    desc: 'هر کاربری می‌تونه پیام اول رو بفرسته',
  },
  {
    key: 'verified_only',
    label: 'کاربران تأیید شده',
    desc: 'فقط کاربرانی که موبایل و عکس تأیید شده دارن',
  },
  {
    key: 'ai_trusted_verified',
    label: 'AI Trusted Verified',
    desc: 'کاربرانی که از نظر هوش مصنوعی رفتار سالم دارن',
    lock: 'silver',
  },
  {
    key: 'community_verified',
    label: 'Community Verified',
    desc: 'کاربران تأیید شده توسط جامعه (۲ ماه فعالیت)',
    lock: 'silver',
  },
  {
    key: 'no_reports_or_restrictions',
    label: 'بدون گزارش یا محدودیت',
    desc: 'کاربرانی که هیچ گزارش یا محدودیت فعالی ندارن',
    lock: 'silver',
  },
  {
    key: 'high_completion',
    label: 'پروفایل تکمیل شده',
    desc: 'فقط کاربرانی که درصد تکمیل پروفایلشون بالاست',
    lock: 'silver',
  },
  {
    key: 'silver_plus',
    label: 'اشتراک نقره‌ای یا بالاتر',
    desc: 'فقط کاربران دارای اشتراک Silver یا Gold',
    lock: 'silver',
  },
  {
    key: 'gold_only',
    label: 'فقط کاربران طلایی',
    desc: 'محدودترین حالت — فقط اشتراک Gold',
    lock: 'gold',
  },
];

const COMPLETION_STEPS = [30, 40, 50, 60, 70, 80, 90, 100];

export default function TrustGateScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ current: string; completion: string }>();

  const [selected, setSelected] = useState(params.current ?? 'everyone');
  const [minCompletion, setMinCompletion] = useState(Number(params.completion ?? 60));
  const [saving, setSaving] = useState(false);
  // null = پلن هنوز از سرور نیومده (یا fetch خطا داده) — در این حالت قفل نمی‌کنیم
  // و enforcement به 403 سرور در handleSave واگذار می‌شه
  const [myPlan, setMyPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    profileApi.getProfile(session.accessToken)
      .then(p => setMyPlan(p.active_subscription?.plan?.slug ?? 'basic'))
      .catch(() => {});
  }, [session?.accessToken]);

  const isModeLocked = (m: Mode) => {
    if (myPlan == null) return false;
    if (m.lock === 'gold') return myPlan !== 'gold';
    if (m.lock === 'silver') return myPlan !== 'silver' && myPlan !== 'gold';
    return false;
  };

  const handleSave = async () => {
    if (!session?.accessToken) return;
    setSaving(true);
    const body: Record<string, unknown> = { message_permission_mode: selected };
    if (selected === 'high_completion') body.min_profile_completion = minCompletion;
    try {
      await api.patch('/api/client/privacy-settings', body, session.accessToken);
      toast.success('تنظیمات ذخیره شد');
      router.back();
    } catch (e: any) {
      if (e.status === 403) {
        toast.error('این گزینه نیاز به اشتراک نقره‌ای یا بالاتر دارد');
      } else {
        toast.error(e.message ?? 'خطا در ذخیره');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="کنترل دریافت پیام" back />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          انتخاب کن چه کسی می‌تونه بهت پیام اول بفرسته. گزینه‌های محدودتر نیاز به اشتراک Silver یا Gold دارن.
        </Text>

        {MODES.map(m => {
          const isSelected = selected === m.key;
          const locked = isModeLocked(m);
          const lockColor = m.lock === 'gold' ? Colors.gold : Colors.trust;

          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeRow, isSelected && styles.modeRowActive, locked && styles.modeRowLocked]}
              onPress={() => {
                if (locked) {
                  toast.error(m.lock === 'gold' ? 'این گزینه مخصوص اشتراک طلایی است' : 'این گزینه نیاز به اشتراک نقره‌ای یا بالاتر دارد');
                  return;
                }
                setSelected(m.key);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>

              <View style={styles.modeInfo}>
                <View style={styles.modeLabelRow}>
                  <Text style={[styles.modeLabel, isSelected && styles.modeLabelActive]}>
                    {m.label}
                  </Text>
                  {m.lock && (
                    <View style={[styles.lockBadge, { backgroundColor: lockColor + '20' }]}>
                      {m.lock === 'gold'
                        ? <Star size={9} color={lockColor} strokeWidth={2} fill={lockColor} />
                        : <Zap size={9} color={lockColor} strokeWidth={2} />
                      }
                      <Text style={[styles.lockTxt, { color: lockColor }]}>
                        {m.lock === 'gold' ? 'Gold' : 'Silver+'}
                      </Text>
                    </View>
                  )}
                  {locked && <Lock size={11} color={Colors.muted} strokeWidth={2} />}
                </View>
                <Text style={styles.modeDesc}>{m.desc}</Text>

                {/* Completion slider — only when high_completion selected */}
                {isSelected && m.key === 'high_completion' && (
                  <View style={styles.completionWrap}>
                    <Text style={styles.completionLabel}>
                      حداقل تکمیل پروفایل: <Text style={styles.completionVal}>{toPersian(minCompletion)}٪</Text>
                    </Text>
                    <View style={styles.stepsRow}>
                      {COMPLETION_STEPS.map(s => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.step, minCompletion === s && styles.stepActive]}
                          onPress={() => setMinCompletion(s)}
                        >
                          <Text style={[styles.stepTxt, minCompletion === s && styles.stepTxtActive]}>
                            {toPersian(s)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Info note */}
        <Card tint="trust" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Lock size={13} color={Colors.trust} strokeWidth={2} />
            <Text style={styles.infoTxt}>
              گزینه‌هایی که نیاز به Silver یا Gold دارن، در صورت نداشتن اشتراک ذخیره نمی‌شن.
            </Text>
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button variant="accent" onPress={handleSave} disabled={saving}>
          {saving ? 'در حال ذخیره…' : 'ذخیره'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: 10 },

  intro: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    lineHeight: 21, marginBottom: 6,
  },

  modeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.hair, padding: Spacing.lg,
  },
  modeRowActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  modeRowLocked: { opacity: 0.5 },

  radioOuter: {
    width: 20, height: 20, borderRadius: 10, marginTop: 1,
    borderWidth: 2, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioOuterActive: { borderColor: Colors.accent },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.accent },

  modeInfo: { flex: 1, gap: 3 },
  modeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  modeLabel: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  modeLabelActive: { color: Colors.ink },
  modeDesc: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, lineHeight: 18 },

  lockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.pill,
  },
  lockTxt: { fontSize: 9.5, fontFamily: Fonts.extraBold },

  completionWrap: {
    marginTop: 10, padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.hair,
  },
  completionLabel: {
    fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.inkSoft, marginBottom: 10,
  },
  completionVal: { fontFamily: Fonts.extraBold, color: Colors.accent },
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  step: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.ph2, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.hair,
  },
  stepActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stepTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.muted },
  stepTxtActive: { color: '#fff' },

  infoCard: { marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoTxt: { flex: 1, fontSize: 12, fontFamily: Fonts.regular, color: '#2C5C8F', lineHeight: 19 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
