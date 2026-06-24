import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Coins } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function formatPrice(amount: number): string {
  const withSep = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withSep.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace(/,/g, '٬') + ' تومان';
}

type CoinPackage = {
  id: string;
  coins: number;
  bonus: number;
  price: number;
  badge?: string;
};

const PACKAGES: CoinPackage[] = [
  { id: '1', coins: 100,  bonus: 0,   price: 5_000 },
  { id: '2', coins: 500,  bonus: 50,  price: 22_000,  badge: 'محبوب‌ترین' },
  { id: '3', coins: 1000, bonus: 150, price: 38_000,  badge: 'بهترین ارزش' },
  { id: '4', coins: 5000, bonus: 1000,price: 170_000 },
];

export default function BuyCoinsScreen() {
  const [selected, setSelected] = useState<string>('2');

  const pkg = PACKAGES.find(p => p.id === selected)!;
  const total = pkg.coins + pkg.bonus;

  const handleBuy = () => {
    Alert.alert(
      'به زودی',
      'سیستم پرداخت هنوز راه‌اندازی نشده. به زودی در دسترس خواهد بود.',
      [{ text: 'باشه' }],
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="خرید سکه" back />

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
        {PACKAGES.map(p => {
          const isSelected = p.id === selected;
          const totalCoins = p.coins + p.bonus;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.pkgCard, isSelected && styles.pkgCardActive]}
              onPress={() => setSelected(p.id)}
              activeOpacity={0.8}
            >
              {p.badge && (
                <View style={styles.pkgBadge}>
                  <Text style={styles.pkgBadgeTxt}>{p.badge}</Text>
                </View>
              )}
              <View style={styles.pkgLeft}>
                <View style={styles.radioOuter}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
                <View>
                  <View style={styles.coinsRow}>
                    <Text style={[styles.pkgCoins, isSelected && styles.pkgCoinsActive]}>
                      {toPersian(p.coins)} سکه
                    </Text>
                    {p.bonus > 0 && (
                      <View style={styles.bonusBadge}>
                        <Text style={styles.bonusTxt}>+{toPersian(p.bonus)} بونوس</Text>
                      </View>
                    )}
                  </View>
                  {p.bonus > 0 && (
                    <Text style={styles.totalCoins}>جمع: {toPersian(totalCoins)} سکه</Text>
                  )}
                </View>
              </View>
              <Text style={[styles.pkgPrice, isSelected && styles.pkgPriceActive]}>
                {formatPrice(p.price)}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>بسته انتخابی</Text>
            <Text style={styles.summaryVal}>{toPersian(pkg.coins)} سکه{pkg.bonus > 0 ? ` + ${toPersian(pkg.bonus)} بونوس` : ''}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>مبلغ</Text>
            <Text style={styles.summaryPrice}>{formatPrice(pkg.price)}</Text>
          </View>
          {pkg.bonus > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>جمع سکه دریافتی</Text>
              <Text style={[styles.summaryVal, { color: Colors.ok }]}>{toPersian(total)} سکه</Text>
            </View>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button variant="accent" onPress={handleBuy}>
          پرداخت {formatPrice(pkg.price)}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: 12 },

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
  pkgBadge: {
    position: 'absolute', top: -1, right: 14,
    backgroundColor: Colors.accent, paddingHorizontal: 10,
    paddingVertical: 3, borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  pkgBadgeTxt: { fontSize: 9.5, fontFamily: Fonts.extraBold, color: '#fff' },
  pkgLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pkgCoins: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  pkgCoinsActive: { color: Colors.accent },
  bonusBadge: {
    backgroundColor: Colors.okSoft, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: Radius.pill,
  },
  bonusTxt: { fontSize: 9.5, fontFamily: Fonts.bold, color: Colors.ok },
  totalCoins: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },
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
