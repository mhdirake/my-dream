import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { Medal, Sparkles, Star, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { BounceIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

// "Silver" gets its own cool steel-grey identity — the old teal/aqua gradient
// read as a "trust/verified" color, not silver, and clashed with the plan name.
const SILVER = '#A9B8CC';
const SILVER_SOFT = 'rgba(169,184,204,0.14)';

type Plan = {
  id: number;
  name: string;
  slug: string;
  price_amount: number;
  currency: string;
  duration_days: number;
  limits: {
    swipes: number | null;
    daily_suggestions: number | null;
    likes: number | null;
    new_chats: number | null;
    messages: number | null;
    anonymous_interests: number | null;
  };
};

const PERIODS = [
  { label: 'ماهانه',  key: 'monthly',  multiplier: 1,   sub: '' },
  { label: '۳ ماهه', key: 'quarterly', multiplier: 2.7, sub: '۱۰٪ تخفیف' },
  { label: 'سالانه', key: 'yearly',    multiplier: 9,   sub: '۲۵٪ تخفیف' },
] as const;

const PLAN_PRIORITY: Record<string, number> = { basic: 0, silver: 1, gold: 2 };

// Small twinkling accents scattered across the whole gold card, biased toward
// the horizontal center rather than hugging the left/right edges — positions
// kept inside the card's own bounds so `overflow: hidden` never clips them.
const SPARKLE_POSITIONS = [
  { top: 8, left: 110 },
  { top: 14, right: 100 },
  { top: 50, left: 150 },
  { top: 46, right: 130 },
  { top: 90, left: 100 },
  { top: 120, right: 140 },
  { top: 160, left: 130 },
  { top: 190, right: 110 },
  { top: 220, left: 160 },
  { top: 250, right: 120 },
] as const;

function formatPrice(amountRial: number, multiplier: number): string {
  if (amountRial === 0) return 'رایگان';
  const toman = Math.round((amountRial * multiplier) / 10);
  const withSep = toman.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withSep.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace(/,/g, '٬') + ' تومان';
}

function limitLabel(val: number | null): string {
  return val === null ? 'نامحدود' : toPersian(val);
}

export default function PlansScreen() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlug, setCurrentSlug] = useState<string>('basic');
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.all([
      api.get<{ data: Plan[] }>('/api/lookups/subscription-plans', session.accessToken),
      api.get<{ data: { active_subscription: { plan: { slug: string } } | null } }>('/api/client/profile', session.accessToken),
    ])
      .then(([plansRes, profileRes]) => {
        setPlans(plansRes.data);
        setCurrentSlug(profileRes.data?.active_subscription?.plan?.slug ?? 'basic');
      })
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const mult = PERIODS.find(p => p.key === period)?.multiplier ?? 1;
  const basic = plans.find(p => p.slug === 'basic');
  const silver = plans.find(p => p.slug === 'silver');
  const gold = plans.find(p => p.slug === 'gold');
  const isDowngrade = (slug: string) => (PLAN_PRIORITY[slug] ?? 0) < (PLAN_PRIORITY[currentSlug] ?? 0);

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="اشتراک و ارتقا" back contentGap />

      {/* Period tabs */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodTab, period === p.key && styles.periodTabActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}>
              {p.label}
            </Text>
            <Text style={[styles.periodDiscount, period === p.key && styles.periodDiscountActive]}>
              {p.sub}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Basic */}
          {basic && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
            <Card style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>پایه</Text>
                <Text style={styles.planPrice}>رایگان</Text>
              </View>
              <View style={styles.limitsGrid}>
                <LimitRow label="کشف روزانه" val={limitLabel(basic.limits.swipes)} />
                <LimitRow label="لایک روزانه" val={limitLabel(basic.limits.likes)} />
                <LimitRow label="چت جدید" val={limitLabel(basic.limits.new_chats)} />
                <LimitRow label="پیام روزانه" val={`${limitLabel(basic.limits.messages)} متن`} />
              </View>
              {currentSlug === 'basic' && (
                <View style={styles.planFooter}>
                  <Text style={styles.currentPlanTxt}>پلن فعلی شما</Text>
                </View>
              )}
            </Card>
            </Animated.View>
          )}

          {/* Silver */}
          {silver && (
            <Animated.View entering={ZoomIn.delay(80).duration(550).springify().damping(11)} style={styles.silverGlowWrap}>
            <View style={[styles.planCard, styles.silverCard]}>
              <View style={styles.planHeader}>
                <View style={styles.goldTitleRow}>
                  <Medal size={16} color={SILVER} strokeWidth={2} fill={SILVER} />
                  <Text style={styles.planName}>نقره‌ای</Text>
                  <View style={styles.popularBadgePulseWrap}>
                    <View style={styles.popularBadgePulseRing} />
                    <View style={styles.popularBadgeWiggle}>
                      <View style={styles.popularBadge}>
                        <Zap size={10} color={Colors.accent} strokeWidth={2.5} />
                        <Text style={styles.popularTxt}>محبوب‌ترین</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View>
                  <Text style={[styles.planPrice, styles.planPriceSilver]}>
                    {formatPrice(silver.price_amount, mult)}
                  </Text>
                  {period !== 'monthly' && (
                    <Text style={styles.perMonth}>
                      {formatPrice(silver.price_amount, 1)}/ماه
                    </Text>
                  )}
                </View>
              </View>
              <View style={[styles.limitsGrid, styles.limitsGridSilver]}>
                <LimitRow label="کشف روزانه" val={limitLabel(silver.limits.swipes)} silver />
                <LimitRow label="لایک روزانه" val={limitLabel(silver.limits.likes)} silver />
                <LimitRow label="چت جدید" val={limitLabel(silver.limits.new_chats)} silver />
                <LimitRow label="پیام روزانه" val={limitLabel(silver.limits.messages)} silver />
                <LimitRow label="تطابق سبک زندگی" val="✓" silver />
                <LimitRow label="علاقه ناشناس" val={limitLabel(silver.limits.anonymous_interests)} silver />
              </View>
              {currentSlug === 'silver' ? (
                <View style={styles.planFooter}>
                  <Text style={styles.currentPlanTxt}>پلن فعلی شما</Text>
                </View>
              ) : isDowngrade('silver') ? (
                <View style={styles.planFooter}>
                  <Text style={styles.currentPlanTxt}>پلن فعلی شما بالاتر است</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.silverBtn}
                  onPress={() => router.push('/subscription/silver' as any)}
                >
                  <Text style={styles.silverBtnTxt}>بیشتر بدونم</Text>
                </TouchableOpacity>
              )}
            </View>
            </Animated.View>
          )}

          {/* Gold */}
          {gold && (
            <Animated.View entering={BounceIn.delay(200).duration(750)} style={styles.goldGlowWrap}>
            <View style={[styles.planCard, styles.goldCard]}>
              {Platform.OS === 'web' && <View style={styles.goldShimmer} pointerEvents="none" />}
              {Platform.OS === 'web' && SPARKLE_POSITIONS.map((pos, i) => (
                <View key={i} style={[styles.sparkle, pos, { animationDelay: `${i * 0.45}s` } as any]} pointerEvents="none">
                  <Sparkles size={12 + (i % 2) * 4} color={Colors.gold} strokeWidth={2} />
                </View>
              ))}
              <View style={styles.goldHeader}>
                <View style={styles.goldTitleRow}>
                  <View style={styles.goldStarFloat}>
                    <Star size={16} color={Colors.gold} strokeWidth={2} fill={Colors.gold} />
                  </View>
                  <Text style={styles.goldName}>طلایی</Text>
                </View>
                <View>
                  <Text style={styles.goldPrice}>{formatPrice(gold.price_amount, mult)}</Text>
                  {period !== 'monthly' && (
                    <Text style={styles.goldPerMonth}>{formatPrice(gold.price_amount, 1)}/ماه</Text>
                  )}
                </View>
              </View>
              <View style={[styles.limitsGrid, styles.limitsGridGold]}>
                <LimitRow label="کشف روزانه" val="نامحدود ✨" gold />
                <LimitRow label="لایک روزانه" val={limitLabel(gold.limits.likes)} gold />
                <LimitRow label="چت جدید" val={limitLabel(gold.limits.new_chats)} gold />
                <LimitRow label="پیام روزانه" val="نامحدود ✨" gold />
                <LimitRow label="تطابق هوشمند + تست شخصیت" val="✓" gold />
                <LimitRow label="علاقه ناشناس" val={limitLabel(gold.limits.anonymous_interests)} gold />
              </View>
              {currentSlug === 'gold' ? (
                <View style={styles.planFooter}>
                  <Text style={[styles.currentPlanTxt, { color: Colors.goldDeep }]}>پلن فعلی شما</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.goldBtn}
                  onPress={() => router.push('/subscription/gold' as any)}
                >
                  <Star size={14} color={Colors.gold} strokeWidth={2} />
                  <Text style={styles.goldBtnTxt}>بیشتر بدونم</Text>
                </Pressable>
              )}
            </View>
            </Animated.View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LimitRow({ label, val, gold, silver }: { label: string; val: string; gold?: boolean; silver?: boolean }) {
  // Label always dim/secondary; value always bright + bold in the plan's accent — the
  // two must never share a color, or they read as one indistinct blob (as they did before).
  const labelColor = gold ? 'rgba(245,184,75,0.55)' : silver ? SILVER + '99' : Colors.muted;
  const valColor = gold ? Colors.gold : silver ? SILVER : Colors.ink;
  return (
    <View style={limitStyles.row}>
      <Text style={[limitStyles.label, { color: labelColor }]} numberOfLines={1}>{label}</Text>
      <Text style={[limitStyles.val, { color: valColor }]} numberOfLines={1}>{val}</Text>
    </View>
  );
}

const limitStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 6 },
  label: { fontSize: 12.5, fontFamily: Fonts.regular, flexShrink: 1 },
  val: { fontSize: 12.5, fontFamily: Fonts.bold },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  periodRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
  },
  periodTab: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    borderRadius: Radius.md, backgroundColor: Colors.ph2,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  periodTabActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  periodLabel: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  periodLabelActive: { color: Colors.accent },
  periodDiscount: { fontSize: 9.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 1 },
  periodDiscountActive: { color: Colors.accent },

  // Cards size to their own content instead of stretching to fill the screen —
  // the page is allowed to scroll (see `ScrollView` above), so nothing needs to
  // be squeezed into a fixed height, which used to push the CTA button below
  // the card's own bottom edge.
  content: { padding: Spacing.lg, gap: 12, paddingBottom: 32 },

  planCard: {
    borderRadius: Radius.xl, padding: 14, gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.hair,
  },
  planHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: { fontSize: 15.5, fontFamily: Fonts.extraBold, color: Colors.ink },
  planPrice: { fontSize: 13, fontFamily: Fonts.extraBold, color: Colors.ink, textAlign: 'right' },
  planPriceSilver: { color: SILVER },
  perMonth: { fontSize: 9.5, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'right', marginTop: 1 },
  // Rows sit flush under the divider (no centering) so the divider never floats
  // with a gap above the content — any leftover card height instead goes to
  // `marginTop: 'auto'` on the footer/button below, which pushes *that* to the
  // bottom of the card.
  limitsGrid: {
    borderTopWidth: 1, borderTopColor: Colors.hair,
    paddingTop: 10, gap: 2,
  },
  // The generic hairline divider all but disappears against the tinted silver/gold
  // card backgrounds — give each card's divider its own accent tint instead.
  limitsGridSilver: { borderTopColor: SILVER + '40' },
  limitsGridGold: { borderTopColor: Colors.gold + '40' },
  planFooter: { alignItems: 'center', marginTop: 'auto' },
  currentPlanTxt: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },

  popularBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentSoft, borderWidth: 1, borderColor: Colors.accent,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill,
  },
  popularTxt: { fontSize: 10, fontFamily: Fonts.extraBold, color: Colors.accent },
  popularBadgePulseWrap: { position: 'relative' },
  // A continuous little wobble on the badge itself, layered on top of the
  // pulse ring, so the "most popular" tag reads as actively alive.
  // `animationKeyframes` is a react-native-web-only style property with no
  // native equivalent, so its TS types don't cover it — cast to bypass that.
  popularBadgeWiggle: Platform.select({
    web: {
      animationKeyframes: {
        '0%':   { transform: [{ rotate: '0deg' }] },
        '25%':  { transform: [{ rotate: '-6deg' }] },
        '75%':  { transform: [{ rotate: '6deg' }] },
        '100%': { transform: [{ rotate: '0deg' }] },
      },
      animationDuration: '1.6s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
    },
    default: {},
  }) as ViewStyle,
  // A "radar ping" ring behind the badge — expands and fades on a loop to draw
  // the eye without being distracting. Web-only: `animationKeyframes` is a
  // react-native-web style property with no native equivalent.
  popularBadgePulseRing: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.accent,
    ...Platform.select({
      web: {
        animationKeyframes: {
          '0%':   { opacity: 0.7, transform: [{ scale: 1 }] },
          '100%': { opacity: 0, transform: [{ scale: 1.6 }] },
        },
        animationDuration: '1.8s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-out',
      },
      default: {},
    }),
  },

  // Wraps the card (which has `overflow:'hidden'` for its own shimmer) so the
  // breathing glow isn't clipped by that same overflow rule.
  silverGlowWrap: Platform.select({
    web: {
      borderRadius: Radius.xl,
      animationKeyframes: {
        '0%':   { boxShadow: `0 0 0px ${SILVER}00` as any },
        '50%':  { boxShadow: `0 0 22px ${SILVER}77` as any },
        '100%': { boxShadow: `0 0 0px ${SILVER}00` as any },
      },
      animationDuration: '2.4s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
    },
    default: {},
  }) as ViewStyle,
  silverCard: { borderColor: SILVER + '80', borderWidth: 1.5, backgroundColor: SILVER_SOFT },
  silverBtn: {
    marginTop: 'auto', paddingVertical: 9, borderRadius: Radius.md,
    backgroundColor: Colors.surface2, borderWidth: 1.5, borderColor: SILVER,
    alignItems: 'center',
  },
  silverBtnTxt: { fontSize: 13, fontFamily: Fonts.bold, color: SILVER },

  // Wraps the card (which has `overflow:'hidden'` for its own shimmer/sparkles)
  // so the breathing glow isn't clipped by that same overflow rule.
  // Layered near/mid/far shadows (a classic "neon tube" recipe) pulsing
  // between a dim and a bright state.
  goldGlowWrap: Platform.select({
    web: {
      borderRadius: Radius.xl,
      animationKeyframes: {
        '0%': {
          boxShadow: `0 0 2px ${Colors.gold}66, 0 0 6px ${Colors.gold}33, 0 0 14px ${Colors.gold}22` as any,
        },
        '50%': {
          boxShadow: `0 0 4px ${Colors.gold}, 0 0 12px ${Colors.gold}bb, 0 0 26px ${Colors.gold}77` as any,
        },
        '100%': {
          boxShadow: `0 0 2px ${Colors.gold}66, 0 0 6px ${Colors.gold}33, 0 0 14px ${Colors.gold}22` as any,
        },
      },
      animationDuration: '2.2s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
    },
    default: {},
  }) as ViewStyle,
  goldCard: {
    backgroundColor: Colors.surface2, borderColor: Colors.gold, borderWidth: 1.5,
    overflow: 'hidden', position: 'relative',
  },
  // A bright diagonal light band that sweeps across the card on a loop — a
  // classic "premium shine" cue. Web-only, see `popularBadgePulseRing`.
  goldShimmer: {
    position: 'absolute', top: -20, bottom: -20, width: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ skewX: '-18deg' }],
    ...Platform.select({
      web: {
        animationKeyframes: {
          '0%':   { left: '-20%' as any },
          '100%': { left: '120%' as any },
        },
        animationDuration: '2.2s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      },
      default: {},
    }),
  },
  // Little twinkling sparkles scattered near the gold card's corners.
  sparkle: {
    position: 'absolute',
    ...Platform.select({
      web: {
        animationKeyframes: {
          '0%':   { opacity: 0, transform: [{ scale: 0.4 }, { rotate: '0deg' }] },
          '50%':  { opacity: 0.25, transform: [{ scale: 0.9 }, { rotate: '30deg' }] },
          '100%': { opacity: 0, transform: [{ scale: 0.4 }, { rotate: '60deg' }] },
        },
        animationDuration: '2.4s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      },
      default: {},
    }),
  },
  goldHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goldTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Gentle up/down float on the gold star to keep the header feeling alive.
  // `animationKeyframes` is a react-native-web-only style property with no
  // native equivalent, so its TS types don't cover it — cast to bypass that.
  goldStarFloat: Platform.select({
    web: {
      animationKeyframes: {
        '0%':   { transform: [{ translateY: 0 }] },
        '50%':  { transform: [{ translateY: -3 }] },
        '100%': { transform: [{ translateY: 0 }] },
      },
      animationDuration: '1.6s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
    },
    default: {},
  }) as ViewStyle,
  goldName: { fontSize: 15.5, fontFamily: Fonts.extraBold, color: '#fff' },
  goldPrice: { fontSize: 13, fontFamily: Fonts.extraBold, color: Colors.gold, textAlign: 'right' },
  goldPerMonth: { fontSize: 9.5, color: 'rgba(245,184,75,0.6)', fontFamily: Fonts.regular, textAlign: 'right', marginTop: 1 },
  goldBtn: {
    marginTop: 'auto', paddingVertical: 9, borderRadius: Radius.md,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: Colors.goldSoft, borderWidth: 1.5, borderColor: Colors.gold,
  },
  goldBtnTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.goldDeep },
});
