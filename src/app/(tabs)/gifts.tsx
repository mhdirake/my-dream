import { Card } from '@/components/ui/Card';
import { Colors, Fonts } from '@/constants/colors';
import { BackendGift, discoverApi } from '@/lib/api/discover';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { Coins, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_LABEL: Record<string, string> = {
  simple: 'ساده',
  cool: 'خفن',
  special: 'ویژه',
  legendary: 'افسانه‌ای',
};

const SLUG_EMOJI: Record<string, string> = {
  'dream-rose': '🌹',
  'coffee-invite': '☕',
  'cool-moon': '🌙',
  'golden-heart': '💛',
  'legendary-star': '⭐',
};

function giftEmoji(g: BackendGift) {
  return SLUG_EMOJI[g.slug] ?? '🎁';
}

export default function GiftsScreen() {
  const { session } = useAuth();
  const [gifts, setGifts] = useState<BackendGift[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([
      discoverApi.listGifts(session.accessToken),
      profileApi.getProfile(session.accessToken),
    ])
      .then(([giftList, profile]) => {
        setGifts(giftList);
        setCoins(profile.coins ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>هدایا</Text>
          <View style={styles.wallet}>
            <Coins size={15} color={Colors.goldDeep} strokeWidth={2} />
            <Text style={styles.walletTxt}>
              {coins == null ? '...' : coins.toLocaleString('fa-IR')}
            </Text>
            <TouchableOpacity style={styles.buyBtn}>
              <Text style={styles.buyBtnTxt}>خرید +</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gift store */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>فروشگاه هدیه</Text>
          <Text style={styles.sectionSub}>همه هدایا با سکه خریداری می‌شوند</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : gifts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTxt}>هدیه‌ای موجود نیست</Text>
          </View>
        ) : (
          <View style={styles.giftGrid}>
            {gifts.map(g => (
              <View key={g.id} style={styles.storeCard}>
                <Text style={styles.storeEmoji}>{giftEmoji(g)}</Text>
                <Text style={styles.storeName}>{g.title}</Text>
                <View style={styles.storeTypeBadge}>
                  <Text style={styles.storeTypeTxt}>{TYPE_LABEL[g.type] ?? g.type}</Text>
                </View>
                <View style={styles.storePrice}>
                  <Coins size={10} color={Colors.goldDeep} strokeWidth={2} />
                  <Text style={styles.storePriceTxt}>{g.coin_price}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Gold Badge gift */}
        <Card tint="gold" style={styles.goldBadgeCard}>
          <View style={styles.goldBadgeTitleRow}>
            <Star size={16} color={Colors.goldDeep} fill={Colors.gold} strokeWidth={1.5} />
            <Text style={styles.goldBadgeTitle}>هدیه Gold Badge</Text>
          </View>
          <Text style={styles.goldBadgeSub}>برای ۱ ماه نشان طلایی به دوستت هدیه بده</Text>
          <View style={styles.goldBadgePrices}>
            <View style={styles.goldBadgePrice}>
              <Coins size={12} color={Colors.goldDeep} strokeWidth={2} />
              <Text style={styles.goldBadgePriceTxt}>۱۰۰۰ سکه</Text>
            </View>
            <Text style={styles.goldBadgeOr}>یا</Text>
            <View style={[styles.goldBadgePrice, { backgroundColor: Colors.accent }]}>
              <Text style={[styles.goldBadgePriceTxt, { color: '#fff' }]}>خرید مستقیم</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16 },

  header: {
    height: 54, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.goldDeep },
  buyBtn: {
    backgroundColor: Colors.goldSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  buyBtnTxt: { fontSize: 11.5, fontFamily: Fonts.bold, color: Colors.goldDeep },

  sectionHeader: { marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  sectionSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },

  loadingBox: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.regular },

  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  storeCard: {
    width: '30%',
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.hair,
    padding: 10, alignItems: 'center', gap: 4,
  },
  storeEmoji: { fontSize: 32, marginBottom: 2 },
  storeName: { fontSize: 10.5, fontFamily: Fonts.semiBold, color: Colors.ink, textAlign: 'center' },
  storePrice: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.goldSoft, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  storePriceTxt: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.goldDeep },
  storeTypeBadge: {
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  storeTypeTxt: { fontSize: 9, color: Colors.purple, fontFamily: Fonts.semiBold },

  goldBadgeCard: { marginTop: 16, gap: 8 },
  goldBadgeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  goldBadgeTitle: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.goldDeep },
  goldBadgeSub: { fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular },
  goldBadgePrices: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  goldBadgePrice: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.gold, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  goldBadgePriceTxt: { fontSize: 12, fontFamily: Fonts.bold, color: '#3A2C0A' },
  goldBadgeOr: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
});
