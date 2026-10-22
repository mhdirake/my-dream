import { useCoinBalance } from '@/lib/CoinBalanceContext';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { api } from '@/lib/api/client';
import { paymentsApi } from '@/lib/api/payments';
import { useAuth } from '@/lib/auth/AuthContext';
import { confirmSheet } from '@/lib/confirmSheet';
import { payAndWait } from '@/lib/payments/payAndWait';
import { toast } from '@/lib/toast';
import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Price = { price: number | null; discount_price: number | null; final_price: number | null; available: boolean };
type BadgeProduct = {
  package_id: number | null; duration_days: number; cash: Price | null; coin: Price | null;
  status: 'active' | 'expired'; expires_at: string | null; coin_balance: number;
};
type GiftPayment = { payment: { id: number }; payment_url: string };

const digits = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
const toman = (rial: number) => `${digits(Math.round(rial / 10))} تومان`;

export default function GoldBadgeScreen() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const giftUserId = params.userId ? Number(params.userId) : null;
  const { coins } = useCoinBalance();
  const [product, setProduct] = useState<BadgeProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const coinRequestKey = useRef<string | null>(null);
  const cashGiftRequestKey = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    try {
      setProduct(await api.get<BadgeProduct>('/api/client/gold-badge', accessToken));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت اطلاعات نشان');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void (async () => { await refresh(); })(); }, [refresh]);
  const coinPrice = product?.coin?.final_price;
  const cashPrice = product?.cash?.final_price;
  const enoughCoins = coinPrice != null && (coins ?? product?.coin_balance ?? 0) >= coinPrice;

  const buyWithCoins = async () => {
    if (!session?.accessToken || !product?.package_id || coinPrice == null || busy) return;
    setBusy(true);
    try {
      coinRequestKey.current ??= Crypto.randomUUID();
      const payload = { package_id: product.package_id, idempotency_key: coinRequestKey.current, expected_coin_price: coinPrice };
      if (giftUserId) {
        await api.post('/api/client/gold-badge/gifts', { ...payload, receiver_user_id: giftUserId }, session.accessToken);
        toast.success('نشان طلایی هدیه داده شد.');
      } else {
        await api.post('/api/client/gold-badge/purchase', payload, session.accessToken);
        toast.success('نشان طلایی فعال شد.');
      }
      coinRequestKey.current = null;
      router.back();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خرید انجام نشد.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const confirmCoinPurchase = () => {
    if (coinPrice == null) return;
    if (!enoughCoins) { router.push('/gifts/buy-coins' as never); return; }
    confirmSheet.show(
      giftUserId ? 'تأیید هدیه نشان طلایی' : 'تأیید خرید نشان طلایی',
      `${giftUserId ? `برای ${params.userName ?? 'کاربر انتخابی'}، ` : ''}${digits(coinPrice)} سکه کسر می‌شود. ادامه می‌دهید؟`,
      [{ text: 'تأیید', onPress: () => { void buyWithCoins(); } }, { text: 'انصراف', style: 'cancel' }],
    );
  };

  const buyWithCash = async () => {
    if (!session?.accessToken || !product?.package_id || cashPrice == null || busy) return;
    setBusy(true);
    try {
      const payment = giftUserId
        ? await api.post<GiftPayment>('/api/client/gold-badge/gifts/cash', {
          package_id: product.package_id, receiver_user_id: giftUserId,
          redirect_to: Platform.OS === 'web' ? 'web_app' : 'mobile_app',
          idempotency_key: cashGiftRequestKey.current ??= Crypto.randomUUID(),
          expected_cash_price: cashPrice,
        }, session.accessToken)
        : await paymentsApi.payGoldBadge(session.accessToken, product.package_id, cashPrice);
      cashGiftRequestKey.current = null;
      const paymentId = 'payment' in payment ? payment.payment.id : payment.data.id;
      const result = await payAndWait(session.accessToken, paymentId, payment.payment_url);
      if (result.status === 'completed') {
        toast.success(giftUserId ? 'نشان طلایی هدیه داده شد.' : 'نشان طلایی فعال شد.');
        router.back();
      } else if (result.status === 'failed') {
        toast.error(result.detail?.failure_message ?? 'پرداخت ناموفق بود.');
      } else {
        toast.info('وضعیت پرداخت هنوز قطعی نیست؛ تاریخچه تراکنش را بررسی کنید.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'شروع پرداخت ناموفق بود.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return <SafeAreaView style={styles.root}>
    <AppBar title="نشان طلایی" back />
    {loading ? <View style={styles.center}><ActivityIndicator color={Colors.gold} /></View> : <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.icon}><LinearGradient colors={[Colors.gold, Colors.goldDeep]} style={StyleSheet.absoluteFill} /><Star size={38} color="#fff" fill="#fff" /></View>
        <Text style={styles.title}>نشان طلایی My Dream</Text>
        <Text style={styles.description}>{giftUserId ? `هدیه‌ای ۳۰ روزه برای ${params.userName ?? 'کاربر انتخابی'}` : 'نشان مستقل از اشتراک و تأیید هویت، با اعتبار ۳۰ روزه'}</Text>
      </View>
      {!giftUserId && product?.status === 'active' && product.expires_at && <View style={styles.card}>
        <Text style={styles.cardTitle}>نشان فعال است</Text>
        <Text style={styles.text}>اعتبار تا {new Date(product.expires_at).toLocaleDateString('fa-IR')}</Text>
        <Text style={styles.text}>خرید دوباره، ۳۰ روز به اعتبار فعلی اضافه می‌کند.</Text>
      </View>}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>مزیت نشان</Text>
        <Text style={styles.text}>نمایش در پروفایل و چت؛ اولویت ثانویه میان پیشنهادهای روزانه با سازگاری معادل.</Text>
        <Text style={styles.warning}>این نشان تأیید هویت، تضمین امنیت یا اشتراک Gold نیست و سهمیه‌ها را تغییر نمی‌دهد.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>خرید با سکه</Text>
        {product?.coin?.available && coinPrice != null ? <>
          {product.coin.discount_price != null && product.coin.price !== coinPrice && <Text style={styles.oldPrice}>{digits(product.coin.price ?? 0)} سکه</Text>}
          <Text style={styles.price}>{digits(coinPrice)} سکه</Text>
          <Text style={styles.text}>موجودی: {digits(coins ?? product.coin_balance)} سکه</Text>
        </> : <Text style={styles.text}>این روش خرید فعلاً در دسترس نیست.</Text>}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>پرداخت با کارت بانکی</Text>
        {product?.cash?.available && cashPrice != null ? <>
          {product.cash.discount_price != null && product.cash.price !== cashPrice && <Text style={styles.oldPrice}>{toman(product.cash.price ?? 0)}</Text>}
          <Text style={styles.price}>{toman(cashPrice)}</Text>
        </> : <Text style={styles.text}>این روش خرید فعلاً در دسترس نیست.</Text>}
      </View>
    </ScrollView>}
    {!loading && <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.md }]}>
      {coinPrice != null && product?.coin?.available && <Button variant="gold" disabled={busy} onPress={confirmCoinPurchase}>{enoughCoins ? `پرداخت ${digits(coinPrice)} سکه` : 'افزایش موجودی سکه'}</Button>}
      {cashPrice != null && product?.cash?.available && <Button variant="ghost" disabled={busy} onPress={() => { void buyWithCash(); }}>{`پرداخت بانکی ${toman(cashPrice)}`}</Button>}
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingBottom: 180 },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 },
  icon: { width: 78, height: 78, borderRadius: 39, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.extraBold, fontSize: 22, color: Colors.ink },
  description: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.inkSoft, textAlign: 'center' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, gap: 9 },
  cardTitle: { fontFamily: Fonts.extraBold, fontSize: 15, color: Colors.ink },
  text: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 21, color: Colors.inkSoft },
  warning: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 20, color: Colors.muted },
  price: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.goldDeep },
  oldPrice: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.muted, textDecorationLine: 'line-through' },
  actions: { padding: Spacing.lg, backgroundColor: Colors.surface, gap: Spacing.sm },
});
