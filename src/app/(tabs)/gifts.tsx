import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, Pin, MoreHorizontal, Star } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts } from '@/constants/colors';

const GIFT_STORE = [
  { id: 1, emoji: '🌹', name: 'گل رز',     type: 'ساده',     coins: 10  },
  { id: 2, emoji: '💐', name: 'دسته گل',   type: 'خفن',      coins: 50  },
  { id: 3, emoji: '💎', name: 'الماس',     type: 'ویژه',     coins: 200 },
  { id: 4, emoji: '👑', name: 'تاج طلایی', type: 'افسانه‌ای', coins: 500 },
  { id: 5, emoji: '☕', name: 'قهوه',      type: 'ساده',     coins: 15  },
  { id: 6, emoji: '🎭', name: 'ماسک',      type: 'خفن',      coins: 80  },
];

const RECEIVED_GIFTS = [
  { id: 1, from: 'کیان',  emoji: '💎', gift: 'الماس',  date: 'امروز ۱۴:۲۲', pinned: true },
  { id: 2, from: 'آرمان', emoji: '🌹', gift: 'گل رز',  date: 'دیروز' },
];

export default function GiftsScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>هدایا</Text>
          <View style={styles.wallet}>
            <Coins size={15} color={Colors.goldDeep} strokeWidth={2} />
            <Text style={styles.walletTxt}>۴۵۰</Text>
            <TouchableOpacity style={styles.buyBtn}>
              <Text style={styles.buyBtnTxt}>خرید +</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Received gifts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>هدایای دریافتی</Text>
        </View>

        {RECEIVED_GIFTS.map(g => (
          <View key={g.id} style={[styles.giftRow, g.pinned && styles.giftRowPinned]}>
            <View style={styles.giftEmoji}>
              <Text style={styles.giftEmojiText}>{g.emoji}</Text>
            </View>
            <View style={styles.giftInfo}>
              <View style={styles.giftNameRow}>
                <Text style={styles.giftName}>{g.gift}</Text>
                {g.pinned && (
                  <View style={styles.pinnedBadge}>
                    <Pin size={10} color={Colors.goldDeep} strokeWidth={2} />
                    <Text style={styles.pinnedTxt}>پین‌شده</Text>
                  </View>
                )}
              </View>
              <Text style={styles.giftFrom}>از {g.from} · {g.date}</Text>
            </View>
            <TouchableOpacity style={styles.giftAction}>
              <MoreHorizontal size={18} color={Colors.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Gift store */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>فروشگاه هدیه</Text>
          <Text style={styles.sectionSub}>همه هدایا با سکه خریداری می‌شوند</Text>
        </View>

        <View style={styles.giftGrid}>
          {GIFT_STORE.map(g => (
            <TouchableOpacity key={g.id} style={styles.storeCard}>
              <Text style={styles.storeEmoji}>{g.emoji}</Text>
              <Text style={styles.storeName}>{g.name}</Text>
              <View style={styles.storeTypeBadge}>
                <Text style={styles.storeTypeTxt}>{g.type}</Text>
              </View>
              <View style={styles.storePrice}>
                <Coins size={10} color={Colors.goldDeep} strokeWidth={2} />
                <Text style={styles.storePriceTxt}>{g.coins}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gift Gold Badge */}
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

  giftRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.hair, marginBottom: 8,
  },
  giftRowPinned: { borderColor: Colors.gold + '66', backgroundColor: Colors.goldSoft },
  giftEmoji: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: Colors.ph2, alignItems: 'center', justifyContent: 'center',
  },
  giftEmojiText: { fontSize: 28 },
  giftInfo: { flex: 1 },
  giftNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  giftName: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pinnedTxt: { fontSize: 10, color: Colors.goldDeep, fontFamily: Fonts.semiBold },
  giftFrom: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },
  giftAction: { padding: 6 },

  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  storeCard: {
    width: '30%',
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.hair,
    padding: 10, alignItems: 'center', gap: 4,
  },
  storeEmoji: { fontSize: 32, marginBottom: 2 },
  storeName: { fontSize: 10.5, fontFamily: Fonts.semiBold, color: Colors.ink, textAlign: 'center' },
  storeTypeBadge: {
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  storeTypeTxt: { fontSize: 9, color: Colors.purple, fontFamily: Fonts.semiBold },
  storePrice: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.goldSoft, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  storePriceTxt: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.goldDeep },

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
