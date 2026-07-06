import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { profileApi } from '@/lib/api/profile';
import { paymentsApi } from '@/lib/api/payments';
import { payAndWait } from '@/lib/payments/payAndWait';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Coins, ShieldCheck, Star, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type Package = {
  id: number;
  name: string;
  slug: string;
  coin_price: number;
  duration_days: number;
  metadata?: { price_amount?: number };
};

function formatToman(amountRial: number): string {
  const toman = Math.round(amountRial / 10);
  const withSep = toman.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withSep.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace(/,/g, '٬') + ' تومان';
}

const BADGE_COST = 5000;
// backend's GET /api/client/packages فعلاً metadata رو در پاسخ نمی‌فرسته (فقط coin_price)،
// این مقدار همون price_amount ثابتی هست که در PackageSeeder برای gold_badge_1_month ست شده
const GOLD_BADGE_CASH_PRICE_RIAL = 490_000;

const INCLUDES = [
  'نمایش بج طلایی «تست شخصیت» روی پروفایل',
  'اعتبار ۳۰ روزه از تاریخ فعال‌سازی',
  'افزایش دیده شدن در نتایج کشف',
  'نمایش در لیست کاربران تأییدشده',
];

const EXCLUDES = [
  'محدودیت‌های Swipe/Like تغییر نمی‌کند (نیاز به اشتراک)',
  'جایگزین اشتراک Silver/Gold نیست',
];

export default function GoldBadgeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const giftUserId = params.userId ? Number(params.userId) : null;
  const [coins, setCoins] = useState<number | null>(null);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [payingCash, setPayingCash] = useState(false);

  const badgeCost = pkg?.coin_price ?? BADGE_COST;

  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.all([
      profileApi.getProfile(session.accessToken),
      api.get<{ data: Package[] }>('/api/client/packages', session.accessToken),
    ])
      .then(([profile, res]) => {
        setCoins(profile.coins ?? 0);
        const badge = res.data.find((p: Package) => p.slug === 'gold_badge_1_month');
        if (badge) setPkg(badge);
      })
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const handleBuy = async () => {
    if (!pkg || !session?.accessToken) return;
    if ((coins ?? 0) < badgeCost) {
      Alert.alert(
        'سکه کافی نیست',
        `برای خرید این بج به ${toPersian(badgeCost)} سکه نیاز داری. اکنون ${toPersian(coins ?? 0)} سکه داری.`,
        [
          { text: 'خرید سکه', onPress: () => router.push('/gifts/buy-coins' as any) },
          { text: 'بعداً', style: 'cancel' },
        ],
      );
      return;
    }
    Alert.alert(
      giftUserId ? 'اهدای نشان طلایی' : 'خرید بج طلایی',
      giftUserId
        ? `نشان طلایی به ${params.userName ?? 'این کاربر'} هدیه داده می‌شود و ${toPersian(badgeCost)} سکه کسر می‌شود. ادامه می‌دهید؟`
        : `${toPersian(badgeCost)} سکه از کیف پول کسر می‌شود. ادامه می‌دهید؟`,
      [
        { text: giftUserId ? 'بله، هدیه بده' : 'بله، بخر', onPress: confirmBuy },
        { text: 'لغو', style: 'cancel' },
      ],
    );
  };

  const confirmBuy = async () => {
    if (!pkg || !session?.accessToken) return;
    setBuying(true);
    try {
      if (giftUserId) {
        await api.post(
          '/api/client/gold-badge/gifts',
          { receiver_user_id: giftUserId, package_id: pkg.id },
          session.accessToken,
        );
        toast.success('نشان طلایی هدیه داده شد!');
      } else {
        await api.post('/api/client/gold-badge/purchase', { package_id: pkg.id }, session.accessToken);
        toast.success('بج طلایی با موفقیت فعال شد!');
      }
      router.back();
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در خرید');
    } finally {
      setBuying(false);
    }
  };

  const handleCashPay = async () => {
    if (!pkg || !session?.accessToken || payingCash) return;
    setPayingCash(true);
    try {
      const res = await paymentsApi.payGoldBadge(session.accessToken, pkg.id);
      const result = await payAndWait(session.accessToken, res.data.id, res.payment_url);
      if (result.status === 'completed') {
        toast.success('بج طلایی با موفقیت فعال شد!');
        router.back();
      } else if (result.status === 'failed') {
        toast.error(result.detail?.failure_message ?? 'پرداخت ناموفق بود');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'خطا در شروع پرداخت');
    } finally {
      setPayingCash(false);
    }
  };

  const hasEnough = (coins ?? 0) >= badgeCost;
  const cashPrice = pkg?.metadata?.price_amount ?? GOLD_BADGE_CASH_PRICE_RIAL;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="بج طلایی تست شخصیت" back />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIconWrap}>
              <LinearGradient
                colors={[Colors.gold, Colors.goldDeep]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <Star size={40} color="#fff" strokeWidth={1.5} fill="#fff" />
            </View>
            <Text style={styles.heroTitle}>بج طلایی</Text>
            <Text style={styles.heroSub}>
              {giftUserId
                ? `این نشان به ${params.userName ?? 'کاربر انتخابی'} هدیه داده می‌شود.`
                : 'تست شخصیت رو تکمیل کردی؟\nاین بج رو روی پروفایلت نمایش بده.'}
            </Text>
            <View style={styles.costRow}>
              <Coins size={18} color={Colors.gold} strokeWidth={2} />
              <Text style={styles.costAmt}>{toPersian(badgeCost)} سکه</Text>
              <Text style={styles.costDur}>· ۳۰ روز</Text>
            </View>
          </View>

          {/* Wallet balance */}
          <View style={[styles.balanceCard, !hasEnough && styles.balanceCardWarn]}>
            <View style={styles.balanceRow}>
              <Coins size={16} color={hasEnough ? Colors.gold : Colors.danger} strokeWidth={2} />
              <Text style={[styles.balanceLabel, !hasEnough && styles.balanceLabelWarn]}>
                موجودی کیف پول:
              </Text>
              <Text style={[styles.balanceAmt, !hasEnough && styles.balanceAmtWarn]}>
                {toPersian(coins ?? 0)} سکه
              </Text>
            </View>
            {!hasEnough && (
              <Text style={styles.balanceNote}>
                برای خرید به {toPersian(badgeCost - (coins ?? 0))} سکه بیشتر نیاز داری.
              </Text>
            )}
          </View>

          {/* Includes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>شامل می‌شود</Text>
            {INCLUDES.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <ShieldCheck size={14} color={Colors.ok} strokeWidth={2} />
                <Text style={styles.listTxt}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Excludes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>شامل نمی‌شود</Text>
            {EXCLUDES.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <X size={14} color={Colors.muted} strokeWidth={2} />
                <Text style={[styles.listTxt, styles.listTxtMuted]}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {!loading && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            variant={hasEnough ? 'gold' : 'accent'}
            disabled={buying}
            onPress={hasEnough ? handleBuy : () => router.push('/gifts/buy-coins' as any)}
          >
            {buying ? 'در حال خرید…' : hasEnough ? giftUserId ? `اهدای نشان (${toPersian(badgeCost)} سکه)` : `خرید بج (${toPersian(badgeCost)} سکه)` : 'خرید سکه'}
          </Button>
          {!giftUserId && pkg && (
            <Button variant="ghost" disabled={payingCash} onPress={handleCashPay}>
              {payingCash ? 'در حال اتصال به درگاه…' : `پرداخت با کارت بانکی (${formatToman(cashPrice)})`}
            </Button>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg },

  hero: {
    alignItems: 'center', paddingVertical: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  heroIconWrap: {
    width: 80, height: 80, borderRadius: 40, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  heroTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: Colors.ink, marginBottom: 8 },
  heroSub: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 21,
  },
  costRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
    backgroundColor: Colors.goldSoft, paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: Radius.pill,
  },
  costAmt: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.goldDeep },
  costDur: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },

  balanceCard: {
    backgroundColor: Colors.goldSoft, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: Colors.gold + '44',
  },
  balanceCardWarn: {
    backgroundColor: Colors.dangerSoft, borderColor: Colors.danger + '44',
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceLabel: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.goldDeep, flex: 1 },
  balanceLabelWarn: { color: Colors.danger },
  balanceAmt: { fontSize: 14, fontFamily: Fonts.extraBold, color: Colors.goldDeep },
  balanceAmtWarn: { color: Colors.danger },
  balanceNote: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.danger, marginTop: 6 },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 12, fontFamily: Fonts.extraBold, color: Colors.ink, marginBottom: 10 },
  listRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.hair,
  },
  listTxt: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 19 },
  listTxtMuted: { color: Colors.muted },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
