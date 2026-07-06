import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Eye, MessageCircle, Shield, Sparkles, ThumbsUp, Zap,
} from 'lucide-react-native';
import {
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const LIMITS = [
  { label: 'کشف روزانه', basic: '۱۰', silver: '۴۰' },
  { label: 'لایک روزانه', basic: '۳', silver: '۱۰' },
  { label: 'چت جدید', basic: '۳', silver: '۸' },
  { label: 'پیام روزانه', basic: '۱۰ (متن)', silver: '۵۰۰' },
  { label: 'علاقه ناشناس', basic: '۳', silver: '۱۰' },
];

const FEATURES = [
  { icon: Zap,           color: Colors.trust,  text: 'کشف روزانه ۴ برابر بیشتر از پایه' },
  { icon: Eye,           color: Colors.purple,  text: 'تطابق سبک زندگی — Lifestyle Match ۷۲٪' },
  { icon: MessageCircle, color: Colors.ok,      text: 'ارسال پیام نامحدود در گفتگوهای فعال' },
  { icon: Shield,        color: Colors.trust,   text: 'علاقه ناشناس — بدون افشای هویت' },
  { icon: ThumbsUp,      color: Colors.accent,  text: 'لایک بیشتر — ۱۰ نفر در روز' },
  { icon: Sparkles,      color: Colors.gold,    text: 'نمایش برچسب «نقره‌ای» روی پروفایل' },
];

export default function SilverDetailScreen() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="اشتراک نقره‌ای" back />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#3A8FE8', '#4E9AF1']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroIcon}>
            <Zap size={32} color={Colors.trust} strokeWidth={2} fill={Colors.trust} />
          </View>
          <Text style={styles.heroTitle}>نقره‌ای</Text>
          <Text style={styles.heroSub}>ایده‌آل برای کسایی که جدی دنبال آشنایی هستن</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeTxt}>محبوب‌ترین پلن</Text>
          </View>
        </View>

        {/* Features */}
        <Card soft style={styles.section}>
          <Text style={styles.sectionTitle}>چی به دست می‌آوری؟</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '20' }]}>
                <f.icon size={16} color={f.color} strokeWidth={2} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </Card>

        {/* Limits comparison */}
        <Card soft style={styles.section}>
          <Text style={styles.sectionTitle}>مقایسه با پلن پایه</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderLabel} />
            <Text style={styles.tableHeaderBasic}>پایه</Text>
            <Text style={styles.tableHeaderSilver}>نقره‌ای</Text>
          </View>
          {LIMITS.map((row, i) => (
            <View key={i} style={[styles.tableRow, i < LIMITS.length - 1 && styles.tableRowBorder]}>
              <Text style={styles.tableRowLabel}>{row.label}</Text>
              <Text style={styles.tableRowBasic}>{row.basic}</Text>
              <Text style={styles.tableRowSilver}>{row.silver}</Text>
            </View>
          ))}
        </Card>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          variant="accent"
          onPress={() => router.push({ pathname: '/subscription/checkout' as any, params: { plan: 'silver', planName: 'نقره‌ای' } })}
        >
          ارتقا به نقره‌ای
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg },

  hero: {
    borderRadius: Radius.xl, overflow: 'hidden', padding: Spacing.xxl,
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 26, fontFamily: Fonts.extraBold, color: '#fff', marginBottom: 6 },
  heroSub: { fontSize: 13, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },
  heroBadge: {
    marginTop: 14, backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: Radius.pill,
  },
  heroBadgeTxt: { fontSize: 11.5, fontFamily: Fonts.bold, color: '#fff' },

  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.extraBold, color: Colors.ink, marginBottom: 14 },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  featureIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 19 },

  tableHeader: {
    flexDirection: 'row', marginBottom: 6, paddingBottom: 8,
    borderBottomWidth: 1.5, borderBottomColor: Colors.hair,
  },
  tableHeaderLabel: { flex: 1 },
  tableHeaderBasic: { width: 60, textAlign: 'center', fontSize: 11, fontFamily: Fonts.bold, color: Colors.muted },
  tableHeaderSilver: { width: 70, textAlign: 'center', fontSize: 11, fontFamily: Fonts.extraBold, color: Colors.trust },

  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.hair },
  tableRowLabel: { flex: 1, fontSize: 12, fontFamily: Fonts.regular, color: Colors.inkSoft },
  tableRowBasic: { width: 60, textAlign: 'center', fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.muted },
  tableRowSilver: { width: 70, textAlign: 'center', fontSize: 12, fontFamily: Fonts.extraBold, color: Colors.trust },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
