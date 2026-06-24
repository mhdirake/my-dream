import { AppBar } from '@/components/ui/AppBar';
import { Badge } from '@/components/ui/Badge';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { profileApi, type ClientProfile } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Brain, Check, MessageCircle, Shield, Sparkles, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type Tier = {
  slug: string;
  kind: 'check' | 'ai' | 'community';
  icon: React.ReactNode;
  title: string;
  sub: string;
  color: string;
  softColor: string;
  requirements: string[];
};

const TIERS: Tier[] = [
  {
    slug: 'basic_verified',
    kind: 'check',
    icon: <Shield size={20} color={Colors.trust} strokeWidth={2} />,
    title: 'تأیید پایه',
    sub: 'اولین مرحله احراز هویت',
    color: Colors.trust,
    softColor: Colors.trustSoft,
    requirements: [
      'موبایل تأیید شده',
      'نام واقعی ثبت شده',
      'عکس پروفایل تأیید شده توسط AI',
    ],
  },
  {
    slug: 'ai_trusted',
    kind: 'ai',
    icon: <Sparkles size={20} color={Colors.ok} strokeWidth={2} />,
    title: 'AI Trusted',
    sub: 'اعتماد هوش مصنوعی',
    color: Colors.ok,
    softColor: Colors.okSoft,
    requirements: [
      'گفتگو با بیش از ۳۰ نفر',
      'رفتار ارتباطی سالم و احترام‌آمیز',
      'بدون گزارش تخلف معتبر',
      'تأیید توسط سیستم AI',
    ],
  },
  {
    slug: 'community_verified',
    kind: 'community',
    icon: <Users size={20} color={Colors.purple} strokeWidth={2} />,
    title: 'Community Verified',
    sub: 'تأیید جامعه کاربری',
    color: Colors.purple,
    softColor: Colors.purpleSoft,
    requirements: [
      'حداقل ۲ ماه عضویت فعال',
      'گفتگو با بیش از ۵۰ نفر',
      'هیچ گزارش تخلف معتبری نداشته باشی',
      'تأیید نهایی توسط تیم پشتیبانی',
    ],
  },
];

function hasBadge(profile: ClientProfile | null, slug: string): boolean {
  if (!profile) return false;
  return profile.badges.some(b => (b.slug ?? '') === slug || (b.slug ?? '').includes(slug.split('_')[0]));
}

export default function VerificationScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;
    profileApi.getProfile(session.accessToken)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="احراز هویت و تأیید" back />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.trust} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <LinearGradient colors={['#E6F0FD', '#EDE7F8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Shield size={30} color={Colors.trust} strokeWidth={1.8} />
            <Text style={styles.heroTitle}>سیستم تأیید My Dream</Text>
            <Text style={styles.heroSub}>
              هر سطح از تأیید یعنی اعتماد بیشتر، دیده شدن بیشتر، و ارتباط واقعی‌تر.
            </Text>
          </LinearGradient>

          {/* Tiers */}
          {TIERS.map((tier) => {
            const earned = hasBadge(profile, tier.slug);
            return (
              <View key={tier.slug} style={[styles.tierCard, earned && { borderColor: tier.color + '60', borderWidth: 1.5 }]}>
                <View style={styles.tierHeader}>
                  <View style={[styles.tierIcon, { backgroundColor: tier.softColor }]}>
                    {tier.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tierTitleRow}>
                      <Text style={styles.tierTitle}>{tier.title}</Text>
                      {earned && <Badge kind={tier.kind} label="" />}
                    </View>
                    <Text style={styles.tierSub}>{tier.sub}</Text>
                  </View>
                  {earned && (
                    <View style={[styles.earnedBadge, { backgroundColor: tier.softColor }]}>
                      <Check size={12} color={tier.color} strokeWidth={2.5} />
                      <Text style={[styles.earnedTxt, { color: tier.color }]}>دارم</Text>
                    </View>
                  )}
                </View>

                <View style={styles.reqs}>
                  {tier.requirements.map((req, i) => (
                    <View key={i} style={styles.reqRow}>
                      <View style={[styles.reqDot, { backgroundColor: earned ? tier.color : Colors.lineSoft }]} />
                      <Text style={[styles.reqTxt, earned && { color: Colors.inkSoft }]}>{req}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Personality test CTA */}
          <Pressable
            style={({ pressed }) => [styles.testCta, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push('/profile-setup/personality-test-intro')}
          >
            <Brain size={18} color={Colors.purple} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>تست شخصیت هنوز نداری؟</Text>
              <Text style={styles.ctaSub}>تکمیل تست شانس دیده شدنت رو افزایش می‌ده</Text>
            </View>
          </Pressable>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>چطور زودتر تأیید بشم؟</Text>
            {[
              { icon: <MessageCircle size={14} color={Colors.trust} strokeWidth={2} />, text: 'با احترام و صادقانه گفتگو کن' },
              { icon: <Shield size={14} color={Colors.ok} strokeWidth={2} />, text: 'پروفایل کامل و واقعی داشته باش' },
              { icon: <Users size={14} color={Colors.purple} strokeWidth={2} />, text: 'هر روز فعال باش و با افراد جدید آشنا بشو' },
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                {tip.icon}
                <Text style={styles.tipTxt}>{tip.text}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.lg, gap: 14 },

  hero: {
    borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: 10,
  },
  heroTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink },
  heroSub: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20,
  },

  tierCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.xl, gap: 14,
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  tierTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  tierTitle: { fontSize: 14, fontFamily: Fonts.extraBold, color: Colors.ink },
  tierSub: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted },

  earnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill,
  },
  earnedTxt: { fontSize: 11, fontFamily: Fonts.bold },

  reqs: { gap: 8 },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reqDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  reqTxt: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 20 },

  testCta: {
    backgroundColor: Colors.purpleSoft, borderRadius: Radius.xl,
    padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  ctaTitle: { fontSize: 13.5, fontFamily: Fonts.bold, color: Colors.ink },
  ctaSub: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.inkSoft, marginTop: 2 },

  tipsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.xl, gap: 12,
  },
  tipsTitle: { fontSize: 12, fontFamily: Fonts.extraBold, color: Colors.ink, marginBottom: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipTxt: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 20 },
});
