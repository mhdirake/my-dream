import { AppBar } from '@/components/ui/AppBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { giftsApi, CoinGiftRecord } from '@/lib/api/gifts';
import { paymentsApi } from '@/lib/api/payments';
import { profileApi, ClientProfile } from '@/lib/api/profile';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Coins, Gift, ShoppingBag } from 'lucide-react-native';
import { useEffect, useState } from 'react';
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

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${toPersian(d.getFullYear())}/${toPersian(d.getMonth() + 1).padStart(2, '۰')}/${toPersian(d.getDate()).padStart(2, '۰')}`;
  } catch {
    return iso;
  }
}

export default function WalletScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [coins, setCoins] = useState(0);
  const [received, setReceived] = useState<CoinGiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.all([
      profileApi.getProfile(session.accessToken),
      paymentsApi.getWallet(session.accessToken),
      giftsApi.coinGiftsReceived(session.accessToken),
    ])
      .then(([p, w, r]) => { setProfile(p); setCoins(w.coin_balance); setReceived(r.slice(0, 10)); })
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const sub = profile?.active_subscription;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="کیف پول و سکه" back />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Balance card */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={['#1A1528', '#2A2040']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={styles.balanceTop}>
              <View style={styles.coinIcon}>
                <Coins size={22} color={Colors.gold} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.balanceLabel}>موجودی سکه</Text>
                <Text style={styles.balanceAmt}>{toPersian(coins)} سکه</Text>
              </View>
            </View>

            {sub && (
              <View style={styles.subRow}>
                <Text style={styles.subLabel}>اشتراک فعال:</Text>
                <Text style={styles.subVal}>
                  {sub.plan.slug === 'gold' ? 'طلایی' : sub.plan.slug === 'silver' ? 'نقره‌ای' : 'پایه'}
                </Text>
                <Text style={styles.subExpiry}> · تا {formatDate(sub.expires_at)}</Text>
              </View>
            )}
          </View>

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
              <Text style={styles.emptyTxt}>هنوز سکه‌ای دریافت نکردی</Text>
            </View>
          ) : (
            received.map(item => (
              <View key={item.id} style={styles.txRow}>
                <View style={styles.txIcon}>
                  <Coins size={14} color={Colors.goldDeep} strokeWidth={2} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle}>
                    {item.sender?.first_name ?? item.sender?.username ?? 'کاربر ناشناس'} سکه فرستاد
                  </Text>
                  {item.note && <Text style={styles.txNote}>{item.note}</Text>}
                  <Text style={styles.txDate}>{formatDate(item.sent_at)}</Text>
                </View>
                <Text style={styles.txAmt}>+{toPersian(item.amount)}</Text>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
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
    borderRadius: Radius.xl, padding: Spacing.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  coinIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.gold + '25',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.gold + '44',
  },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular },
  balanceAmt: { fontSize: 28, fontFamily: Fonts.extraBold, color: Colors.gold },

  subRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  subLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular },
  subVal: { fontSize: 12, fontFamily: Fonts.bold, color: '#fff', marginLeft: 6 },
  subExpiry: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.regular },

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

  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyTxt: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.regular },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.hair,
  },
  txIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.goldSoft, alignItems: 'center', justifyContent: 'center',
  },
  txInfo: { flex: 1, gap: 2 },
  txTitle: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  txNote: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  txDate: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular },
  txAmt: { fontSize: 14, fontFamily: Fonts.extraBold, color: Colors.ok },
});
