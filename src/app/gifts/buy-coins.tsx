import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { DetailCard } from '@/components/ui/DetailCard';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { paymentsApi, type CoinPricing } from '@/lib/api/payments';
import { payAndWait } from '@/lib/payments/payAndWait';
import { coinPurchaseQuote, normalizeCoinQuantity } from '@/lib/coinPurchase';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { Coins, Gift, Lightbulb, Sparkles, Star, VenetianMask } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function formatPrice(amountRial: number): string {
  return (amountRial / 10).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' تومان';
}

export default function BuyCoinsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [pricing, setPricing] = useState<CoinPricing | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const loadPricing = async () => {
    if (!session?.accessToken) return;
    setLoading(true); setLoadError('');
    try {
      const next = await paymentsApi.getCoinPricing(session.accessToken);
      setPricing(next);
      setSelectedAmount(next.preset_amounts[0] ?? null);
    } catch (error) {
      setPricing(null);
      setLoadError(error instanceof Error ? error.message : 'دریافت قیمت سکه انجام نشد.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void loadPricing(); }, [session?.accessToken]);

  const rawAmount = selectedAmount === null ? customAmount : String(selectedAmount);
  const quote = pricing ? coinPurchaseQuote(rawAmount, pricing.unit_price_amount, pricing.minimum_coins) : null;

  const handleBuy = async () => {
    if (!session?.accessToken || !quote || paying) return;
    setPaying(true);
    try {
      const res = await paymentsApi.payCoinQuantity(session.accessToken, quote.coins, pricing!.unit_price_amount);
      const result = await payAndWait(session.accessToken, res.data.id, res.payment_url);
      if (result.status === 'completed') {
        toast.success('سکه با موفقیت اضافه شد!');
        router.back();
      } else if (result.status === 'failed') {
        toast.error(result.detail?.failure_message ?? 'پرداخت ناموفق بود');
      } else {
        toast.info('پرداخت تکمیل نشد');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'خطا در شروع پرداخت');
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="خرید سکه" back contentGap />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} /></View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <DetailCard
              style={styles.header}
              icon={<Coins size={30} color={Colors.gold} strokeWidth={1.8} />}
              title="تعداد سکه را انتخاب کن"
              subtitle="سکه‌ها برای ارسال هدیه، بج طلایی و آنالیز هوش مصنوعی استفاده می‌شن"
            />

            {!!loadError && <View style={styles.summaryCard}>
              <Text style={styles.emptyTxt}>{loadError}</Text>
              <Button variant="ghost" onPress={loadPricing}>تلاش مجدد</Button>
            </View>}
            {pricing && <>
              <Text style={styles.summaryLabel}>قیمت هر سکه: {formatPrice(pricing.unit_price_amount)}</Text>
              {pricing.preset_amounts.map(amount => {
                const selected = amount === selectedAmount;
                return <TouchableOpacity key={amount} style={[styles.pkgCard, selected && styles.pkgCardActive]} onPress={() => setSelectedAmount(amount)} disabled={paying} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
                  <View style={styles.pkgLeft}>
                    <View style={styles.radioOuter}>{selected && <View style={styles.radioDot} />}</View>
                    <Text style={[styles.pkgCoins, selected && styles.pkgCoinsActive]}>{toPersian(amount)} سکه</Text>
                  </View>
                  <Text style={[styles.pkgPrice, selected && styles.pkgPriceActive]}>{formatPrice(amount * pricing.unit_price_amount)}</Text>
                </TouchableOpacity>;
              })}
              <View style={[styles.summaryCard, selectedAmount === null && styles.pkgCardActive]}>
                <TouchableOpacity onPress={() => setSelectedAmount(null)} disabled={paying} accessibilityRole="radio" accessibilityState={{ checked: selectedAmount === null }}>
                  <Text style={styles.pkgCoins}>تعداد دلخواه</Text>
                </TouchableOpacity>
                <TextInput
                  accessibilityLabel="تعداد دلخواه سکه"
                  style={styles.customInput}
                  value={customAmount}
                  onFocus={() => setSelectedAmount(null)}
                  onChangeText={value => { setSelectedAmount(null); setCustomAmount(normalizeCoinQuantity(value)); }}
                  keyboardType="number-pad"
                  placeholder="مثلاً ۷۵۰"
                  placeholderTextColor={Colors.muted}
                  editable={!paying}
                />
                <Text style={styles.summaryLabel}>حداقل {toPersian(pricing.minimum_coins)} سکه؛ بدون سقف تعداد</Text>
                {selectedAmount === null && customAmount !== '' && !quote && <Text style={styles.validationTxt}>تعداد معتبر و حداقل {toPersian(pricing.minimum_coins)} سکه وارد کن.</Text>}
              </View>
              {quote && <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>تعداد انتخابی</Text>
                  <Text style={styles.summaryVal}>{toPersian(quote.coins)} سکه</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>مبلغ قابل پرداخت</Text>
                  <Text style={styles.summaryPrice}>{formatPrice(quote.amount)}</Text>
                </View>
              </View>}
            </>}

            {/* What coins are used for */}
            <DetailCard
              icon={<Lightbulb size={26} color={Colors.trust} strokeWidth={1.9} />}
              title="چرا سکه بخرم؟"
              items={[
                { icon: <Gift size={14} color={Colors.accent} strokeWidth={2} />, text: 'ارسال هدیه به دوستات' },
                { icon: <Star size={14} color={Colors.goldDeep} strokeWidth={2} />, text: 'اهدای بج طلایی' },
                { icon: <Sparkles size={14} color={Colors.purple} strokeWidth={2} />, text: 'دریافت آنالیز هوش مصنوعی' },
                { icon: <VenetianMask size={14} color={Colors.purple} strokeWidth={2} />, text: 'ارسال علاقه ناشناس' },
              ]}
            />

            <View style={{ height: 110 }} />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Button variant="accent" onPress={handleBuy} disabled={!quote || paying}>
              {paying ? 'در حال اتصال به درگاه…' : quote ? `پرداخت ${formatPrice(quote.amount)}` : 'پرداخت'}
            </Button>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: 12 },
  emptyTxt: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 20 },

  customInput: { color: Colors.ink, backgroundColor: Colors.bg, borderColor: Colors.lineSoft, borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: Fonts.regular, fontSize: 16, textAlign: 'right' },
  validationTxt: { color: Colors.danger, fontFamily: Fonts.regular, fontSize: 12 },
  header: { marginBottom: 8 },

  pkgCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.hair, padding: Spacing.lg,
    overflow: 'hidden',
  },
  pkgCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  pkgLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  pkgCoins: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  pkgCoinsActive: { color: Colors.accent },
  pkgPrice: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.inkSoft },
  pkgPriceActive: { color: Colors.accent },

  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.lg,
    gap: 8, marginTop: 4,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12.5, color: Colors.inkSoft, fontFamily: Fonts.regular },
  summaryVal: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.ink },
  summaryPrice: { fontSize: 14, fontFamily: Fonts.extraBold, color: Colors.accent },


  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
