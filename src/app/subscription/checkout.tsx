import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { KeyboardStickyBar } from '@/components/ui/KeyboardStickyBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { paymentsApi } from '@/lib/api/payments';
import { payAndWait } from '@/lib/payments/payAndWait';
import { toast } from '@/lib/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { CreditCard, Lock, Tag, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Plan = { id: number; name: string; slug: string; price_amount: number };

const PERIODS = [
  { key: 'monthly',  label: 'ماهانه',  mult: 1,   discount: null },
  { key: 'quarterly',label: '۳ ماهه', mult: 2.7, discount: '۱۰٪' },
  { key: 'yearly',   label: 'سالانه', mult: 9,   discount: '۲۵٪' },
] as const;

const METHODS = [
  { key: 'card',    label: 'پرداخت آنلاین (درگاه بانکی)', icon: CreditCard },
  { key: 'wallet',  label: 'کیف پول اپ', icon: Wallet },
] as const;

function formatPrice(amountRial: number, mult: number): string {
  const toman = Math.round((amountRial * mult) / 10);
  const withSep = toman.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withSep.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace(/,/g, '٬') + ' تومان';
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ plan: string; planName: string }>();
  const planSlug = params.plan ?? 'silver';
  const planName = params.planName ?? 'نقره‌ای';

  const [plan, setPlan] = useState<Plan | null>(null);
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [method, setMethod] = useState<'card' | 'wallet'>('card');
  const [discount, setDiscount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    api.get<{ data: Plan[] }>('/api/lookups/subscription-plans', session.accessToken)
      .then(res => {
        const found = res.data.find((p: Plan) => p.slug === planSlug);
        if (found) setPlan(found);
      })
      .catch(e => toast.error(e.message ?? 'خطا'));
  }, [session?.accessToken, planSlug]);

  const periodObj = PERIODS.find(p => p.key === period) ?? PERIODS[0];
  const basePrice = plan?.price_amount ?? 0;

  const handlePay = async () => {
    if (!session?.accessToken || !plan || paying) return;
    setPaying(true);
    try {
      const res = await paymentsApi.paySubscription(session.accessToken, plan.id);
      const result = await payAndWait(session.accessToken, res.data.id, res.payment_url);
      if (result.status === 'completed') {
        toast.success('اشتراک با موفقیت فعال شد!');
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
      <AppBar title="تکمیل خرید" back />

      <KeyboardAvoider>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan summary */}
        <Card soft style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>پلن انتخابی</Text>
          <Text style={styles.summaryPlan}>{planName}</Text>

          {/* Period selector */}
          <Text style={styles.periodLabel}>دوره اشتراک</Text>
          <View style={styles.periodRow}>
            {PERIODS.map(p => {
              const isMonthly: boolean = p.key === 'monthly';
              const discountLabel: string | null = p.discount;
              const isActive = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodTab, isActive && styles.periodTabActive, !isMonthly && styles.periodTabDisabled]}
                  onPress={() => {
                    if (!isMonthly) {
                      toast.info('این دوره به‌زودی فعال می‌شود');
                      return;
                    }
                    setPeriod(p.key);
                  }}
                >
                  <Text style={[styles.periodTabTxt, isActive && styles.periodTabTxtActive]}>
                    {p.label}
                  </Text>
                  {!isMonthly && <Text style={styles.periodDiscount}>به‌زودی</Text>}
                  {isMonthly && discountLabel && (
                    <Text style={[styles.periodDiscount, isActive && styles.periodDiscountActive]}>
                      {discountLabel} تخفیف
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Payment method */}
        <Text style={styles.blockTitle}>روش پرداخت</Text>
        {METHODS.map(m => {
          const disabled = m.key !== 'card';
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodRow, method === m.key && styles.methodRowActive, disabled && styles.periodTabDisabled]}
              onPress={() => {
                if (disabled) {
                  toast.info('این روش به‌زودی فعال می‌شود');
                  return;
                }
                setMethod(m.key);
              }}
            >
              <View style={[styles.methodIcon, method === m.key && styles.methodIconActive]}>
                <m.icon size={18} color={method === m.key ? Colors.accent : Colors.muted} strokeWidth={1.8} />
              </View>
              <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>
                {m.label}
              </Text>
              {disabled ? (
                <Lock size={14} color={Colors.muted} strokeWidth={2} />
              ) : (
                <View style={[styles.radioOuter, method === m.key && styles.radioOuterActive]}>
                  {method === m.key && <View style={styles.radioDot} />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Discount code */}
        <Text style={styles.blockTitle}>کد تخفیف</Text>
        <View style={styles.discountRow}>
          <Tag size={16} color={Colors.muted} strokeWidth={1.8} style={styles.discountIcon} />
          <TextInput
            style={styles.discountInput}
            placeholder="کد تخفیف داری؟"
            placeholderTextColor={Colors.muted}
            value={discount}
            onChangeText={setDiscount}
            autoCapitalize="characters"
          />
          {discount.length > 0 && (
            <TouchableOpacity style={styles.applyBtn}>
              <Text style={styles.applyBtnTxt}>اعمال</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Price summary */}
        <Card style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>مبلغ پلن</Text>
            <Text style={styles.priceVal}>
              {plan ? formatPrice(basePrice, 1) : '—'} × {periodObj.label}
            </Text>
          </View>
          {periodObj.discount && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>تخفیف دوره‌ای</Text>
              <Text style={styles.discountVal}>{periodObj.discount}</Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.priceTotalRow]}>
            <Text style={styles.totalLabel}>جمع کل</Text>
            <Text style={styles.totalVal}>
              {plan ? formatPrice(basePrice, periodObj.mult) : '—'}
            </Text>
          </View>
        </Card>

        <View style={{ height: 110 }} />
      </ScrollView>
      </KeyboardAvoider>

      <KeyboardStickyBar style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.bottomAmountRow}>
          <Text style={styles.bottomAmountLabel}>مبلغ قابل پرداخت:</Text>
          <Text style={styles.bottomAmount}>{plan ? formatPrice(basePrice, periodObj.mult) : '—'}</Text>
        </View>
        <Button variant="accent" onPress={handlePay} disabled={!plan || paying}>
          {paying ? 'در حال اتصال به درگاه…' : 'پرداخت و فعال‌سازی'}
        </Button>
      </KeyboardStickyBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg },

  summaryCard: { marginBottom: Spacing.xl },
  summaryLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 4 },
  summaryPlan: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ink, marginBottom: 16 },

  periodLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 8 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodTab: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: Radius.md, backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.hair,
  },
  periodTabActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  periodTabDisabled: { opacity: 0.5 },
  periodTabTxt: { fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.muted },
  periodTabTxtActive: { color: Colors.accent },
  periodDiscount: { fontSize: 9.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },
  periodDiscountActive: { color: Colors.accent },

  blockTitle: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 10 },

  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.hair,
    padding: Spacing.md, marginBottom: 10,
  },
  methodRowActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  methodIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.ph2, alignItems: 'center', justifyContent: 'center',
  },
  methodIconActive: { backgroundColor: 'rgba(217,79,112,0.12)' },
  methodLabel: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft },
  methodLabelActive: { fontFamily: Fonts.semiBold, color: Colors.ink },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.accent },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.accent },

  discountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.hair,
    paddingHorizontal: Spacing.md, height: 48, marginBottom: Spacing.xl,
  },
  discountIcon: { marginRight: 6 },
  discountInput: {
    flex: 1, fontSize: 13, fontFamily: Fonts.regular,
    color: Colors.ink, textAlign: 'right',
  },
  applyBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.accentSoft, borderRadius: Radius.sm,
  },
  applyBtnTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.accent },

  priceCard: { marginBottom: Spacing.lg },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  priceLabel: { fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft },
  priceVal: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  discountVal: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.ok },
  priceTotalRow: {
    borderTopWidth: 1.5, borderTopColor: Colors.hair,
    marginTop: 4, paddingTop: 12,
  },
  totalLabel: { fontSize: 14, fontFamily: Fonts.extraBold, color: Colors.ink },
  totalVal: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.accent },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface, gap: 8,
  },
  bottomAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomAmountLabel: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular },
  bottomAmount: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink },
});
