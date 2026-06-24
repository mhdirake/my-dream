import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Star, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

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
  { label: 'ماهانه',  key: 'monthly',  multiplier: 1,   discount: null },
  { label: '۳ ماهه', key: 'quarterly', multiplier: 2.7, discount: '۱۰٪ تخفیف' },
  { label: 'سالانه', key: 'yearly',    multiplier: 9,   discount: '۲۵٪ تخفیف' },
] as const;

function formatPrice(amount: number, multiplier: number): string {
  if (amount === 0) return 'رایگان';
  const total = Math.round(amount * multiplier);
  const withSep = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withSep.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace(/,/g, '٬') + ' تومان';
}

function limitLabel(val: number | null): string {
  return val === null ? 'نامحدود' : toPersian(val);
}

export default function PlansScreen() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!session?.accessToken) return;
    api.get<{ data: Plan[] }>('/api/lookups/subscription-plans', session.accessToken)
      .then(res => setPlans(res.data))
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری پلن‌ها'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const mult = PERIODS.find(p => p.key === period)?.multiplier ?? 1;
  const basic = plans.find(p => p.slug === 'basic');
  const silver = plans.find(p => p.slug === 'silver');
  const gold = plans.find(p => p.slug === 'gold');

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="اشتراک و ارتقا" back />

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
            {p.discount && (
              <Text style={[styles.periodDiscount, period === p.key && styles.periodDiscountActive]}>
                {p.discount}
              </Text>
            )}
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
            <Card style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>پایه</Text>
                <Text style={styles.planPrice}>رایگان</Text>
              </View>
              <View style={styles.limitsGrid}>
                <LimitRow label="کشف روزانه" val={limitLabel(basic.limits.swipes)} />
                <LimitRow label="لایک روزانه" val={limitLabel(basic.limits.likes)} />
                <LimitRow label="چت جدید" val={limitLabel(basic.limits.new_chats)} />
                <LimitRow label="پیام روزانه" val={`${limitLabel(basic.limits.messages)} · فقط متن`} />
              </View>
              <View style={styles.planFooter}>
                <Text style={styles.currentPlanTxt}>پلن فعلی شما</Text>
              </View>
            </Card>
          )}

          {/* Silver */}
          {silver && (
            <View style={styles.popularWrap}>
              <View style={styles.popularBadge}>
                <Zap size={11} color="#fff" strokeWidth={2.5} />
                <Text style={styles.popularTxt}>محبوب‌ترین</Text>
              </View>
              <View style={[styles.planCard, styles.silverCard]}>
                <LinearGradient
                  colors={['#3A8FE8', '#4E9AF1']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, styles.planNameLight]}>نقره‌ای</Text>
                  <View>
                    <Text style={[styles.planPrice, styles.planPriceLight]}>
                      {formatPrice(silver.price_amount, mult)}
                    </Text>
                    {period !== 'monthly' && (
                      <Text style={styles.perMonth}>
                        {formatPrice(silver.price_amount, 1)}/ماه
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.limitsGrid}>
                  <LimitRow label="کشف روزانه" val={limitLabel(silver.limits.swipes)} light />
                  <LimitRow label="لایک روزانه" val={limitLabel(silver.limits.likes)} light />
                  <LimitRow label="چت جدید" val={limitLabel(silver.limits.new_chats)} light />
                  <LimitRow label="پیام روزانه" val={limitLabel(silver.limits.messages)} light />
                  <LimitRow label="تطابق سبک زندگی" val="✓" light />
                  <LimitRow label="علاقه ناشناس" val={limitLabel(silver.limits.anonymous_interests)} light />
                </View>
                <TouchableOpacity
                  style={styles.silverBtn}
                  onPress={() => router.push('/subscription/silver' as any)}
                >
                  <Text style={styles.silverBtnTxt}>بیشتر بدونم</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Gold */}
          {gold && (
            <View style={[styles.planCard, styles.goldCard]}>
              <View style={styles.goldHeader}>
                <View style={styles.goldTitleRow}>
                  <Star size={16} color={Colors.gold} strokeWidth={2} fill={Colors.gold} />
                  <Text style={styles.goldName}>طلایی</Text>
                </View>
                <View>
                  <Text style={styles.goldPrice}>{formatPrice(gold.price_amount, mult)}</Text>
                  {period !== 'monthly' && (
                    <Text style={styles.goldPerMonth}>{formatPrice(gold.price_amount, 1)}/ماه</Text>
                  )}
                </View>
              </View>
              <View style={styles.limitsGrid}>
                <LimitRow label="کشف روزانه" val="نامحدود ✨" gold />
                <LimitRow label="لایک روزانه" val={limitLabel(gold.limits.likes)} gold />
                <LimitRow label="چت جدید" val={limitLabel(gold.limits.new_chats)} gold />
                <LimitRow label="پیام روزانه" val="نامحدود ✨" gold />
                <LimitRow label="امتیاز تطابق کامل" val="✓" gold />
                <LimitRow label="تست شخصیت + AI Match" val="✓" gold />
                <LimitRow label="علاقه ناشناس" val={limitLabel(gold.limits.anonymous_interests)} gold />
              </View>
              <Pressable
                style={styles.goldBtn}
                onPress={() => router.push('/subscription/gold' as any)}
              >
                <LinearGradient colors={['#F5B84B', '#D9982E']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <Star size={14} color="#3A2C0A" strokeWidth={2} />
                <Text style={styles.goldBtnTxt}>بیشتر بدونم</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LimitRow({ label, val, light, gold }: { label: string; val: string; light?: boolean; gold?: boolean }) {
  const color = light ? 'rgba(255,255,255,0.85)' : gold ? Colors.goldSoft : Colors.inkSoft;
  const valColor = light ? '#fff' : gold ? Colors.gold : Colors.ink;
  return (
    <View style={limitStyles.row}>
      <Text style={[limitStyles.label, { color }]}>{label}</Text>
      <Text style={[limitStyles.val, { color: valColor }]}>{val}</Text>
    </View>
  );
}

const limitStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  label: { fontSize: 12.5, fontFamily: Fonts.regular },
  val: { fontSize: 12.5, fontFamily: Fonts.bold },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  periodRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
  },
  periodTab: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: Radius.md, backgroundColor: Colors.ph2,
  },
  periodTabActive: { backgroundColor: Colors.ink },
  periodLabel: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  periodLabelActive: { color: '#fff' },
  periodDiscount: { fontSize: 9.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  periodDiscountActive: { color: Colors.gold },

  content: { padding: Spacing.lg, gap: 16 },

  planCard: {
    borderRadius: Radius.xl, padding: Spacing.xl,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.hair,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  planName: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  planNameLight: { color: '#fff' },
  planPrice: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink, textAlign: 'right' },
  planPriceLight: { color: '#fff' },
  perMonth: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontFamily: Fonts.regular, textAlign: 'right', marginTop: 2 },
  limitsGrid: {
    borderTopWidth: 1, borderTopColor: Colors.hair, paddingTop: 12, gap: 2,
  },
  planFooter: { marginTop: 14, alignItems: 'center' },
  currentPlanTxt: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular },

  popularWrap: { position: 'relative' },
  popularBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent, paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: Radius.pill, zIndex: 1,
  },
  popularTxt: { fontSize: 11, fontFamily: Fonts.extraBold, color: '#fff' },

  silverCard: { borderColor: Colors.trust, paddingTop: 24 },
  silverBtn: {
    marginTop: 14, paddingVertical: 11, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center',
  },
  silverBtnTxt: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },

  goldCard: {
    backgroundColor: '#1A1528', borderColor: Colors.gold + '55',
  },
  goldHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  goldTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goldName: { fontSize: 18, fontFamily: Fonts.extraBold, color: '#fff' },
  goldPrice: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.gold, textAlign: 'right' },
  goldPerMonth: { fontSize: 10, color: 'rgba(245,184,75,0.6)', fontFamily: Fonts.regular, textAlign: 'right', marginTop: 2 },
  goldBtn: {
    marginTop: 14, paddingVertical: 11, borderRadius: Radius.md,
    overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  goldBtnTxt: { fontSize: 14, fontFamily: Fonts.bold, color: '#3A2C0A' },
});
