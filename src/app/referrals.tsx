import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { CheckCircle, Circle, Clipboard, Gift, Star, Users, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Clipboard as RNClipboard,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type Reward = {
  id: number;
  milestone: number;
  reward_type: string;
  reward_value: string | null;
  status: string;
  granted_at: string | null;
};

type Summary = {
  referral_username: string;
  total_referred: number;
  qualified_count: number;
  pending_count: number;
  rewards: Reward[];
  next_milestone: number | null;
};

const MILESTONES = [
  { count: 3,  icon: Zap,   color: Colors.trust,    reward: '۱ ماه اشتراک نقره‌ای رایگان' },
  { count: 5,  icon: Gift,  color: Colors.accent,   reward: '۱٬۰۰۰ سکه' },
  { count: 10, icon: Star,  color: Colors.goldDeep, reward: '۱ ماه اشتراک طلایی رایگان' },
];

export default function ReferralsScreen() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;
    api.get<{ data: Summary }>('/api/client/referrals/summary', session.accessToken)
      .then(res => setSummary(res.data))
      .catch(e => toast.error(e.message ?? 'خطا'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const copyCode = () => {
    if (!summary?.referral_username) return;
    RNClipboard.setString(summary.referral_username);
    toast.success('کد کپی شد!');
  };

  const qualified = summary?.qualified_count ?? 0;
  const nextMilestone = summary?.next_milestone ?? null;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="معرفی به دوستان" back />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Referral code card */}
          <Card soft style={styles.codeCard}>
            <Text style={styles.codeLabel}>کد معرف تو</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{summary?.referral_username ?? '—'}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
                <Clipboard size={14} color={Colors.accent} strokeWidth={2} />
                <Text style={styles.copyTxt}>کپی</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.codeHint}>
              دوستات این کد رو موقع ثبت‌نام وارد می‌کنن
            </Text>
          </Card>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{toPersian(summary?.total_referred ?? 0)}</Text>
              <Text style={styles.statLabel}>دعوت شده</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxMid]}>
              <Text style={styles.statNum}>{toPersian(qualified)}</Text>
              <Text style={styles.statLabel}>واجد شرایط</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{toPersian(summary?.pending_count ?? 0)}</Text>
              <Text style={styles.statLabel}>در انتظار</Text>
            </View>
          </View>

          {/* Progress to next milestone */}
          {nextMilestone && (
            <Card soft>
              <View style={styles.progressHeader}>
                <Users size={15} color={Colors.accent} strokeWidth={2} />
                <Text style={styles.progressTitle}>
                  {toPersian(nextMilestone - qualified)} نفر تا جایزه بعدی
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (qualified / nextMilestone) * 100)}%` as any },
                  ]}
                />
              </View>
              <Text style={styles.progressSub}>
                {toPersian(qualified)} از {toPersian(nextMilestone)} نفر واجد شرایط
              </Text>
            </Card>
          )}

          {/* Milestones */}
          <Text style={styles.sectionTitle}>جوایز</Text>
          {MILESTONES.map(m => {
            const reward = summary?.rewards.find(r => r.milestone === m.count);
            const done = qualified >= m.count;
            const granted = reward?.status === 'granted';
            const Icon = m.icon;

            return (
              <View key={m.count} style={[styles.milestoneRow, done && styles.milestoneRowDone]}>
                <View style={[styles.milestoneIcon, { backgroundColor: m.color + '20' }]}>
                  <Icon size={18} color={done ? m.color : Colors.muted} strokeWidth={2} />
                </View>
                <View style={styles.milestoneInfo}>
                  <Text style={[styles.milestoneCount, done && { color: m.color }]}>
                    {toPersian(m.count)} نفر
                  </Text>
                  <Text style={styles.milestoneReward}>{m.reward}</Text>
                </View>
                {granted ? (
                  <View style={styles.grantedBadge}>
                    <CheckCircle size={14} color={Colors.ok} strokeWidth={2} />
                    <Text style={styles.grantedTxt}>دریافت شد</Text>
                  </View>
                ) : done ? (
                  <View style={[styles.grantedBadge, { backgroundColor: Colors.accentSoft }]}>
                    <CheckCircle size={14} color={Colors.accent} strokeWidth={2} />
                    <Text style={[styles.grantedTxt, { color: Colors.accent }]}>تکمیل شد</Text>
                  </View>
                ) : (
                  <Circle size={18} color={Colors.hair} strokeWidth={2} />
                )}
              </View>
            );
          })}

          {/* How it works */}
          <Text style={styles.sectionTitle}>شرایط واجد شرایط بودن</Text>
          <Card soft>
            {[
              'دوستت با کد تو ثبت‌نام کنه',
              'پروفایلش رو کامل کنه',
              'اشتراک فعال داشته باشه',
            ].map((t, i) => (
              <View key={i} style={styles.ruleRow}>
                <View style={styles.ruleDot} />
                <Text style={styles.ruleTxt}>{t}</Text>
              </View>
            ))}
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
  content: { padding: Spacing.xl, gap: 12 },

  codeCard: { gap: 8, alignItems: 'center' },
  codeLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeText: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: 1 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accentSoft, borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  copyTxt: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.accent },
  codeHint: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center' },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.hair, overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.hair },
  statNum: { fontSize: 20, fontFamily: Fonts.extraBold, color: Colors.ink },
  statLabel: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 3 },

  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  progressBar: {
    height: 8, backgroundColor: Colors.ph2, borderRadius: 4, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 4 },
  progressSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },

  sectionTitle: {
    fontSize: 11, fontFamily: Fonts.extraBold, color: Colors.muted,
    marginTop: Spacing.sm, marginBottom: 2,
  },

  milestoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.md,
  },
  milestoneRowDone: { borderColor: Colors.accentSoft },
  milestoneIcon: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  milestoneInfo: { flex: 1 },
  milestoneCount: { fontSize: 13.5, fontFamily: Fonts.bold, color: Colors.muted },
  milestoneReward: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.regular, marginTop: 2 },
  grantedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.okSoft, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 4,
  },
  grantedTxt: { fontSize: 10.5, fontFamily: Fonts.bold, color: Colors.ok },

  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  ruleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 6 },
  ruleTxt: { flex: 1, fontSize: 12.5, color: Colors.inkSoft, fontFamily: Fonts.regular, lineHeight: 20 },
});
