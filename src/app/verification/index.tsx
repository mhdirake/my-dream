import { AppBar } from '@/components/ui/AppBar';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { DetailCard } from '@/components/ui/DetailCard';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { hasBadge, reqDone, TIERS } from '@/constants/verificationTiers';
import { profileApi, type ClientProfile } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import { Brain, Check, Lightbulb, MessageCircle, Shield, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <AppBar title="احراز هویت و تأیید" back backFallback="/me" contentGap />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.trust} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <DetailCard
            icon={<Shield size={30} color={Colors.trust} strokeWidth={1.8} />}
            title="سیستم تأیید My Dream"
            subtitle="هر سطح از تأیید یعنی اعتماد بیشتر، دیده شدن بیشتر، و ارتباط واقعی‌تر."
          />

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
                  {tier.requirements.map((req, i) => {
                    const done = reqDone(tier.slug, i, profile, earned);
                    return (
                      <View key={i} style={styles.reqRow}>
                        <Checkbox checked={done} color={tier.color} size={18} />
                        <Text style={[styles.reqTxt, done && styles.reqTxtDone]}>{req}</Text>
                      </View>
                    );
                  })}
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

          {/* Tips — guide style */}
          <DetailCard
            icon={<Lightbulb size={26} color={Colors.trust} strokeWidth={1.9} />}
            title="چطور زودتر تأیید بشم؟"
            items={[
              { icon: <MessageCircle size={14} color={Colors.trust} strokeWidth={2} />, text: 'با احترام و صادقانه گفتگو کن' },
              { icon: <Shield size={14} color={Colors.ok} strokeWidth={2} />, text: 'پروفایل کامل و واقعی داشته باش' },
              { icon: <Users size={14} color={Colors.purple} strokeWidth={2} />, text: 'هر روز فعال باش و با افراد جدید آشنا بشو' },
            ]}
          />

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

  reqs: { gap: 10 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqTxt: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.muted, lineHeight: 20 },
  reqTxtDone: { color: Colors.ink, fontFamily: Fonts.semiBold },

  testCta: {
    backgroundColor: Colors.purpleSoft, borderRadius: Radius.xl,
    padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  ctaTitle: { fontSize: 13.5, fontFamily: Fonts.bold, color: Colors.ink },
  ctaSub: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.inkSoft, marginTop: 2 },
});
