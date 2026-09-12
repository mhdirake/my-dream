import { AppBar } from '@/components/ui/AppBar';
import { Avatar } from '@/components/ui/Avatar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { giftUserPhotoUrl, giftsApi, CoinGiftRecord } from '@/lib/api/gifts';
import { paymentsApi } from '@/lib/api/payments';
import { profileApi, ClientProfile } from '@/lib/api/profile';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { toJalaali } from 'jalaali-js';
import { ChevronLeft, Coins, Gift, Medal, Shield, ShoppingBag, Star, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

// Same steel-grey "silver" identity introduced on the subscription screen
// (src/app/subscription/index.tsx) — kept local here too since only these two
// screens need it.
const SILVER = '#A9B8CC';

const PLAN_META: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  gold: { label: 'طلایی', color: Colors.gold, icon: Star },
  silver: { label: 'نقره‌ای', color: SILVER, icon: Medal },
  basic: { label: 'پایه', color: Colors.muted, icon: Shield },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }

  const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${toPersian(jy)}/${toPersian(jm).padStart(2, '۰')}/${toPersian(jd).padStart(2, '۰')}`;
}

export default function WalletScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [coins, setCoins] = useState(0);
  const [received, setReceived] = useState<CoinGiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useFocusEffect(useCallback(() => {
    const token = session?.accessToken;
    if (!token) return undefined;

    let active = true;
    setLoading(true);
    Promise.all([
      profileApi.getProfile(token),
      paymentsApi.getWallet(token),
      giftsApi.coinGiftsReceived(token),
    ])
      .then(([p, w, r]) => {
        if (!active) return;
        setProfile(p);
        setCoins(w.coin_balance);
        setReceived(r.slice(0, 10));
        setHasLoadedOnce(true);
      })
      .catch(e => {
        if (active) toast.error(e.message ?? 'خطا در بارگذاری');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [session?.accessToken]));

  const sub = profile?.active_subscription;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="کیف پول و سکه" back />

      {loading && !hasLoadedOnce ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Balance card */}
          <LinearGradient
            colors={[Colors.trustSoft, Colors.purpleSoft]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.coinIcon}>
              <Coins size={26} color={Colors.gold} strokeWidth={2} />
            </View>
            <Text style={styles.balanceAmt}>{toPersian(coins)} سکه</Text>
            <Text style={styles.balanceLabel}>موجودی سکه</Text>

            {sub ? (() => {
              const meta = PLAN_META[sub.plan.slug] ?? PLAN_META.basic;
              return (
                <View style={styles.subRow}>
                  <View style={[styles.subIconWrap, { backgroundColor: meta.color + '22' }]}>
                    <meta.icon size={14} color={meta.color} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={[styles.subVal, { color: meta.color }]}>پلن {meta.label}</Text>
                    {sub.ends_at && <Text style={styles.subExpiry}>تا {formatDate(sub.ends_at)}</Text>}
                  </View>
                </View>
              );
            })() : (
              <TouchableOpacity
                style={styles.subUpgradeRow}
                onPress={() => router.push('/subscription' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.subUpgradeTxt}>پلن پایه · با ارتقا امکانات بیشتری بگیر</Text>
                <ChevronLeft size={14} color={Colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/gifts/buy-coins' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.goldSoft }]}>
                <ShoppingBag size={20} color={Colors.goldDeep} strokeWidth={2} />
              </View>
              <Text style={styles.actionLabel}>خرید سکه</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/gifts/gift-sub' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.accentSoft }]}>
                <Gift size={20} color={Colors.accent} strokeWidth={2} />
              </View>
              <Text style={styles.actionLabel}>هدیه به دوست</Text>
            </TouchableOpacity>
          </View>

          {/* Coin gift history */}
          <Text style={styles.sectionTitle}>سکه‌های دریافتی</Text>

          {received.length === 0 ? (
            <View style={styles.emptyBox}>
              <Gift size={28} color={Colors.hair} strokeWidth={1.5} />
              <Text style={styles.emptyTxt}>هنوز سکه‌ای دریافت نکردی</Text>
              <Text style={styles.emptySub}>وقتی کسی سکه بفرسته اینجا میاد</Text>
            </View>
          ) : (
            received.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.txRow}
                onPress={() => item.sender && router.push({
                  pathname: '/user/[id]' as any,
                  params: { id: String(item.sender.id) },
                })}
                disabled={!item.sender}
                activeOpacity={0.75}
                accessibilityRole={item.sender ? 'button' : undefined}
              >
                <Avatar
                  size={40}
                  name={item.sender?.first_name ?? item.sender?.username}
                  photoUrl={giftUserPhotoUrl(item.sender)}
                />
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle}>
                    {item.sender?.first_name ?? item.sender?.username ?? 'کاربر ناشناس'} سکه فرستاد
                  </Text>
                  {item.note && <Text style={styles.txNote}>{item.note}</Text>}
                  <Text style={styles.txDate}>{formatDate(item.sent_at)}</Text>
                </View>
                <View style={styles.txEnd}>
                  <Text style={styles.txAmt}>+{toPersian(item.amount)}</Text>
                  {item.sender && <ChevronLeft size={16} color={Colors.muted} strokeWidth={2} />}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: 16 },

  balanceCard: {
    borderRadius: Radius.xl, padding: Spacing.xxl,
    alignItems: 'center', gap: 4,
  },
  coinIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.gold + '25',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.gold + '44',
    marginBottom: 6,
  },
  balanceLabel: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.regular },
  balanceAmt: { fontSize: 30, fontFamily: Fonts.extraBold, color: Colors.gold },

  subRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    alignSelf: 'stretch',
    borderTopWidth: 1, borderTopColor: Colors.hair,
    paddingTop: 14, marginTop: 12,
  },
  subIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  subVal: { fontSize: 13, fontFamily: Fonts.bold, textAlign: 'center' },
  subExpiry: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 1, textAlign: 'center' },
  subUpgradeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'stretch',
    borderTopWidth: 1, borderTopColor: Colors.hair,
    paddingTop: 14, marginTop: 12,
  },
  subUpgradeTxt: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.regular },

  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.lg,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.hair,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.ink },

  sectionTitle: { fontSize: 13, fontFamily: Fonts.extraBold, color: Colors.ink },

  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  emptyTxt: { fontSize: 13, color: Colors.inkSoft, fontFamily: Fonts.semiBold },
  emptySub: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.hair,
  },
  txInfo: { flex: 1, gap: 2 },
  txTitle: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  txNote: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  txDate: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular },
  txEnd: { alignItems: 'center', gap: 4 },
  txAmt: { fontSize: 14, fontFamily: Fonts.extraBold, color: Colors.ok },
});
