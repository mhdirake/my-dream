import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { router } from 'expo-router';
import {
  Brain, Eye, MessageCircle, Shield, Sparkles, Star, Zap,
} from 'lucide-react-native';
import {
  Platform, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Small twinkling accents scattered across the hero area — same recipe as the
// gold plan card on the subscription list page.
const HERO_SPARKLE_POSITIONS = [
  { top: 10, left: 40 },
  { top: 30, right: 50 },
  { top: 70, left: 70 },
  { top: 20, right: 110 },
  { top: 90, right: 60 },
  { top: 60, left: 110 },
] as const;

const LIMITS = [
  { label: 'کشف روزانه', basic: '۱۰', silver: '۴۰', gold: 'نامحدود' },
  { label: 'لایک روزانه', basic: '۳', silver: '۱۰', gold: '۲۰' },
  { label: 'چت جدید', basic: '۳', silver: '۸', gold: '۲۰' },
  { label: 'پیام روزانه', basic: '۱۰', silver: '۵۰۰', gold: 'نامحدود' },
  { label: 'علاقه ناشناس', basic: '۳', silver: '۱۰', gold: 'نامحدود' },
];

const FEATURES = [
  { icon: Star,          color: Colors.gold,   text: 'کشف و پیام کاملاً نامحدود' },
  { icon: Brain,         color: Colors.purple,  text: 'امتیاز تطابق کامل — ۸۶٪' },
  { icon: Sparkles,      color: Colors.gold,    text: 'تست شخصیت + تطابق هوشمند' },
  { icon: Eye,           color: Colors.trust,   text: 'دیدن همه کسایی که پروفایلت رو دیدن' },
  { icon: MessageCircle, color: Colors.ok,      text: 'پیام صوتی و استیکر در گفتگو' },
  { icon: Shield,        color: Colors.accent,  text: 'برچسب طلایی «پریمیوم» روی پروفایل' },
  { icon: Zap,           color: Colors.gold,    text: 'اولویت در نمایش به کاربران دیگر' },
];

export default function GoldDetailScreen() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="اشتراک طلایی" back backFallback="/subscription" dark />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {Platform.OS === 'web' && HERO_SPARKLE_POSITIONS.map((pos, i) => (
            <View key={i} style={[styles.heroSparkle, pos, { animationDelay: `${i * 0.4}s` } as any]} pointerEvents="none">
              <Sparkles size={12 + (i % 2) * 4} color={Colors.gold} strokeWidth={2} />
            </View>
          ))}
          <View style={styles.heroIcon}>
            <Star size={32} color="#fff" strokeWidth={1.5} fill="#fff" />
          </View>
          <Text style={styles.heroTitle}>طلایی</Text>
          <Text style={styles.heroSub}>بهترین تجربه — برای کسایی که می‌خوان بهترین ارتباط‌ها رو بسازن</Text>
          <View style={styles.heroBadge}>
            <Star size={10} color={Colors.gold} strokeWidth={2.5} fill={Colors.gold} />
            <Text style={styles.heroBadgeTxt}>پریمیوم کامل</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مزایای طلایی</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '22' }]}>
                <f.icon size={16} color={f.color} strokeWidth={2} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Limits table */}
        <View style={styles.tableCard}>
          <Text style={styles.sectionTitle}>مقایسه کامل پلن‌ها</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderLabel} />
            <Text style={styles.thBasic}>پایه</Text>
            <Text style={styles.thSilver}>نقره‌ای</Text>
            <Text style={styles.thGold}>طلایی</Text>
          </View>
          {LIMITS.map((row, i) => (
            <View key={i} style={[styles.tableRow, i < LIMITS.length - 1 && styles.tableRowBorder]}>
              <Text style={styles.tdLabel}>{row.label}</Text>
              <Text style={styles.tdBasic}>{row.basic}</Text>
              <Text style={styles.tdSilver}>{row.silver}</Text>
              <Text style={styles.tdGold}>{row.gold}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          variant="gold"
          onPress={() => router.push({ pathname: '/subscription/checkout' as any, params: { plan: 'gold', planName: 'طلایی' } })}
        >
          ارتقا به طلایی
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0B1A' },
  content: { padding: Spacing.lg },

  hero: { alignItems: 'center', paddingVertical: Spacing.xxl, marginBottom: Spacing.xl, position: 'relative' },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  // Web-only: `animationKeyframes` is a react-native-web style property with
  // no native equivalent, so it's a no-op (dim/static) on native builds.
  heroSparkle: {
    position: 'absolute',
    ...Platform.select({
      web: {
        animationKeyframes: {
          '0%':   { opacity: 0, transform: [{ scale: 0.4 }, { rotate: '0deg' }] },
          '50%':  { opacity: 0.5, transform: [{ scale: 1 }, { rotate: '30deg' }] },
          '100%': { opacity: 0, transform: [{ scale: 0.4 }, { rotate: '60deg' }] },
        },
        animationDuration: '2.4s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      },
      default: {},
    }),
  },
  heroTitle: { fontSize: 32, fontFamily: Fonts.extraBold, color: Colors.gold, marginBottom: 8 },
  heroSub: {
    fontSize: 13, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', lineHeight: 21, paddingHorizontal: Spacing.xl,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16,
    backgroundColor: Colors.gold + '25', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.gold + '55',
  },
  heroBadgeTxt: { fontSize: 11.5, fontFamily: Fonts.bold, color: Colors.gold },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 14 },

  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },

  tableCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: Radius.xl,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.gold + '33',
    marginBottom: Spacing.lg,
  },
  tableHeader: {
    flexDirection: 'row', paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 4,
  },
  tableHeaderLabel: { flex: 1 },
  thBasic: { width: 46, textAlign: 'center', fontSize: 10, fontFamily: Fonts.bold, color: Colors.muted },
  thSilver: { width: 52, textAlign: 'center', fontSize: 10, fontFamily: Fonts.bold, color: Colors.trust },
  thGold: { width: 58, textAlign: 'center', fontSize: 10, fontFamily: Fonts.extraBold, color: Colors.gold },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tdLabel: { flex: 1, fontSize: 11.5, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)' },
  tdBasic: { width: 46, textAlign: 'center', fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.muted },
  tdSilver: { width: 52, textAlign: 'center', fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.trust },
  tdGold: { width: 58, textAlign: 'center', fontSize: 11.5, fontFamily: Fonts.extraBold, color: Colors.gold },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0E0B1A',
  },
});
