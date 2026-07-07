import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { paymentsApi, type CoinPackage } from '@/lib/api/payments';
import { payAndWait } from '@/lib/payments/payAndWait';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Coins } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function formatPrice(amountRial: number): string {
  const toman = Math.round(amountRial / 10);
  const withSep = toman.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withSep.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace(/,/g, '٬') + ' تومان';
}

export default function BuyCoinsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    paymentsApi.getCoinPackages(session.accessToken)
      .then(pkgs => {
        // فقط پکیج‌هایی که metadata معتبر دارن — پکیج بدون قیمت/تعداد سکه crash و UI خراب می‌سازه
        const valid = pkgs.filter(
          p => typeof p.metadata?.coin_amount === 'number' && typeof p.metadata?.price_amount === 'number',
        );
        setPackages(valid);
        if (valid.length > 0) setSelectedId(valid[0].id);
      })
      .catch(() => toast.error('خطا در بارگذاری بسته‌ها'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const pkg = packages.find(p => p.id === selectedId) ?? null;

  const handleBuy = async () => {
    if (!session?.accessToken || !pkg || paying) return;
    setPaying(true);
    try {
      const res = await paymentsApi.payCoinPackage(session.accessToken, pkg.id);
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
      <AppBar title="خرید سکه" back />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} /></View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.coinWrap}>
                <LinearGradient colors={[Colors.gold, Colors.goldDeep]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Coins size={28} color="#fff" strokeWidth={2} />
              </View>
              <Text style={styles.headerTitle}>بسته سکه انتخاب کن</Text>
              <Text style={styles.headerSub}>سکه‌ها برای ارسال هدیه، بج طلایی و AI Insight استفاده می‌شن</Text>
            </View>

            {/* Packages */}
            {packages.map(p => {
              const isSelected = p.id === selectedId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pkgCard, isSelected && styles.pkgCardActive]}
                  onPress={() => setSelectedId(p.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.pkgLeft}>
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.pkgCoins, isSelected && styles.pkgCoinsActive]}>
                      {toPersian(p.metadata.coin_amount)} سکه
                    </Text>
                  </View>
                  <Text style={[styles.pkgPrice, isSelected && styles.pkgPriceActive]}>
                    {formatPrice(p.metadata.price_amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {packages.length === 0 && (
              <Text style={styles.emptyTxt}>بسته‌ای موجود نیست</Text>
            )}

            {/* Summary */}
            {pkg && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>بسته انتخابی</Text>
                  <Text style={styles.summaryVal}>{toPersian(pkg.metadata.coin_amount)} سکه</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>مبلغ</Text>
                  <Text style={styles.summaryPrice}>{formatPrice(pkg.metadata.price_amount)}</Text>
                </View>
              </View>
            )}

            <View style={{ height: 110 }} />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Button variant="accent" onPress={handleBuy} disabled={!pkg || paying}>
              {paying ? 'در حال اتصال به درگاه…' : pkg ? `پرداخت ${formatPrice(pkg.metadata.price_amount)}` : 'پرداخت'}
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

  header: { alignItems: 'center', marginBottom: 8 },
  coinWrap: {
    width: 60, height: 60, borderRadius: 30, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink, marginBottom: 4 },
  headerSub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center' },

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
