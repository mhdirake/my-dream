import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { giftsApi, SentGift } from '@/lib/api/gifts';
import { BackendGift } from '@/lib/api/discover';
import { paymentsApi } from '@/lib/api/payments';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { Coins, Gift, Package, Star, Wallet } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  simple:    { label: 'ساده',      color: Colors.trust,  bg: Colors.trustSoft },
  cool:      { label: 'خفن',       color: Colors.purple, bg: Colors.purpleSoft },
  special:   { label: 'ویژه',      color: Colors.accent, bg: Colors.accentSoft },
  legendary: { label: 'افسانه‌ای', color: Colors.gold,   bg: Colors.goldSoft },
};

const SLUG_EMOJI: Record<string, string> = {
  'dream-rose':    '🌹',
  'coffee-invite': '☕',
  'cool-moon':     '🌙',
  'golden-heart':  '💛',
  'legendary-star':'⭐',
};
const giftEmoji = (g: BackendGift) => SLUG_EMOJI[g.slug] ?? '🎁';

const FILTER_TABS = [
  { key: 'all',       label: 'همه' },
  { key: 'simple',    label: 'ساده' },
  { key: 'cool',      label: 'خفن' },
  { key: 'special',   label: 'ویژه' },
  { key: 'legendary', label: 'افسانه‌ای' },
] as const;

const SCREEN_TABS = [
  { key: 'store',    label: 'فروشگاه' },
  { key: 'received', label: 'دریافتی' },
] as const;

export default function GiftsScreen() {
  const { session } = useAuth();
  const { bottom } = useSafeAreaInsets();

  const [screenTab, setScreenTab] = useState<'store' | 'received'>('store');
  const [filterTab, setFilterTab] = useState<string>('all');
  const [gifts, setGifts] = useState<BackendGift[]>([]);
  const [received, setReceived] = useState<SentGift[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReceived, setLoadingReceived] = useState(false);

  const loadStore = useCallback(() => {
    if (!session?.accessToken) return;
    setLoading(true);
    Promise.all([
      giftsApi.list(session.accessToken),
      paymentsApi.getWallet(session.accessToken),
    ])
      .then(([giftList, wallet]) => {
        setGifts(giftList);
        setCoins(wallet.coin_balance);
      })
      .catch(() => toast.error('خطا در بارگذاری هدایا'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const loadReceived = useCallback(() => {
    if (!session?.accessToken) return;
    setLoadingReceived(true);
    giftsApi.mine(session.accessToken)
      .then(setReceived)
      .catch(e => toast.error(e.message ?? 'خطا'))
      .finally(() => setLoadingReceived(false));
  }, [session?.accessToken]);

  useEffect(() => { loadStore(); }, [loadStore]);

  useEffect(() => {
    if (screenTab === 'received' && received.length === 0) loadReceived();
  }, [screenTab]);

  const filtered = filterTab === 'all' ? gifts : gifts.filter(g => g.type === filterTab);

  const openGift = (g: BackendGift) => {
    router.push({
      pathname: '/gifts/[id]' as any,
      params: {
        id: String(g.id),
        title: g.title,
        emoji: giftEmoji(g),
        type: g.type,
        coin_price: String(g.coin_price),
        is_limited: String(g.is_limited),
        inventory: g.inventory !== null ? String(g.inventory) : '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 92 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>هدایا</Text>
          <View style={styles.headerRight}>
            <View style={styles.wallet}>
              <Coins size={14} color={Colors.goldDeep} strokeWidth={2} />
              <Text style={styles.walletTxt}>
                {coins == null ? '…' : toPersian(coins)}
              </Text>
            </View>
            <TouchableOpacity style={styles.walletBtn} onPress={() => router.push('/gifts/wallet' as any)}>
              <Wallet size={14} color={Colors.goldDeep} strokeWidth={2} />
              <Text style={styles.walletBtnTxt}>کیف پول</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen tabs */}
        <View style={styles.screenTabRow}>
          {SCREEN_TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.screenTab, screenTab === t.key && styles.screenTabActive]}
              onPress={() => setScreenTab(t.key)}
            >
              <Text style={[styles.screenTabTxt, screenTab === t.key && styles.screenTabTxtActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {screenTab === 'store' ? (
          <>
            {/* Category filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
              {FILTER_TABS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filterTab === f.key && styles.filterChipActive]}
                  onPress={() => setFilterTab(f.key)}
                >
                  <Text style={[styles.filterTxt, filterTab === f.key && styles.filterTxtActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.accent} />
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTxt}>هدیه‌ای در این دسته موجود نیست</Text>
              </View>
            ) : (
              <View style={styles.giftGrid}>
                {filtered.map(g => {
                  const meta = TYPE_META[g.type] ?? { label: g.type, color: Colors.muted, bg: Colors.ph2 };
                  return (
                    <TouchableOpacity key={g.id} style={styles.storeCard} onPress={() => openGift(g)} activeOpacity={0.8}>
                      {g.is_limited && (
                        <View style={styles.limitedBadge}>
                          <Package size={8} color={Colors.accent} strokeWidth={2.5} />
                          <Text style={styles.limitedTxt}>محدود</Text>
                        </View>
                      )}
                      <Text style={styles.storeEmoji}>{giftEmoji(g)}</Text>
                      <Text style={styles.storeName} numberOfLines={2}>{g.title}</Text>
                      <View style={[styles.storeTypeBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.storeTypeTxt, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      <View style={styles.storePrice}>
                        <Coins size={10} color={Colors.goldDeep} strokeWidth={2} />
                        <Text style={styles.storePriceTxt}>{toPersian(g.coin_price)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Gift-Sub CTA */}
            <Card tint="gold" style={styles.giftSubCard}>
              <View style={styles.giftSubRow}>
                <Star size={16} color={Colors.goldDeep} fill={Colors.gold} strokeWidth={1.5} />
                <Text style={styles.giftSubTitle}>هدیه اشتراک یا سکه</Text>
              </View>
              <Text style={styles.giftSubSub}>اشتراک Silver/Gold یا سکه به دوستت هدیه بده</Text>
              <TouchableOpacity
                style={styles.giftSubBtn}
                onPress={() => router.push('/gifts/gift-sub' as any)}
              >
                <Gift size={13} color={Colors.goldDeep} strokeWidth={2} />
                <Text style={styles.giftSubBtnTxt}>ارسال هدیه ویژه</Text>
              </TouchableOpacity>
            </Card>
          </>
        ) : (
          <>
            {loadingReceived ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.accent} />
              </View>
            ) : received.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTxt}>هنوز هدیه‌ای دریافت نکردی</Text>
              </View>
            ) : (
              received.map(sg => {
                const meta = TYPE_META[sg.gift_type] ?? { label: sg.gift_type, color: Colors.muted, bg: Colors.ph2 };
                return (
                  <View key={sg.sent_gift_id} style={styles.receivedCard}>
                    <Text style={styles.receivedEmoji}>🎁</Text>
                    <View style={styles.receivedInfo}>
                      <Text style={styles.receivedTitle}>{sg.gift_title}</Text>
                      <View style={[styles.receivedType, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.receivedTypeTxt, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      {sg.sender && (
                        <Text style={styles.receivedFrom}>
                          از {sg.sender.first_name ?? sg.sender.username}
                        </Text>
                      )}
                      {sg.note && <Text style={styles.receivedNote}>«{sg.note}»</Text>}
                    </View>
                    {sg.is_pinned && (
                      <View style={styles.pinnedBadge}>
                        <Text style={styles.pinnedTxt}>📌</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg },

  header: {
    height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  walletTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.goldDeep },
  walletBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.goldSoft, borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  walletBtnTxt: { fontSize: 11.5, fontFamily: Fonts.bold, color: Colors.goldDeep },

  screenTabRow: {
    flexDirection: 'row', backgroundColor: Colors.ph2,
    borderRadius: Radius.md, padding: 4, marginBottom: Spacing.lg,
  },
  screenTab: { flex: 1, paddingVertical: 9, borderRadius: Radius.sm - 2, alignItems: 'center' },
  screenTabActive: { backgroundColor: Colors.surface },
  screenTabTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.muted },
  screenTabTxtActive: { color: Colors.ink },

  filterScroll: { marginBottom: Spacing.md },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.hair,
  },
  filterChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  filterTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  filterTxtActive: { color: '#fff' },

  loadingBox: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.regular },

  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.xl },
  storeCard: {
    width: '30%',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair,
    padding: 10, alignItems: 'center', gap: 5,
    overflow: 'hidden',
  },
  limitedBadge: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: Colors.accentSoft, paddingVertical: 3,
  },
  limitedTxt: { fontSize: 8.5, fontFamily: Fonts.extraBold, color: Colors.accent },
  storeEmoji: { fontSize: 34, marginTop: 14 },
  storeName: { fontSize: 10.5, fontFamily: Fonts.semiBold, color: Colors.ink, textAlign: 'center' },
  storeTypeBadge: { borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  storeTypeTxt: { fontSize: 9, fontFamily: Fonts.semiBold },
  storePrice: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.goldSoft, borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  storePriceTxt: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.goldDeep },

  giftSubCard: { gap: 8, marginBottom: Spacing.lg },
  giftSubRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  giftSubTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.goldDeep },
  giftSubSub: { fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular },
  giftSubBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.gold, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 9, alignSelf: 'flex-start', marginTop: 4,
  },
  giftSubBtnTxt: { fontSize: 12.5, fontFamily: Fonts.bold, color: '#3A2C0A' },

  receivedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.md,
    marginBottom: 10,
  },
  receivedEmoji: { fontSize: 32, marginTop: 2 },
  receivedInfo: { flex: 1, gap: 4 },
  receivedTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  receivedType: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  receivedTypeTxt: { fontSize: 9.5, fontFamily: Fonts.semiBold },
  receivedFrom: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular },
  receivedNote: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.regular, fontStyle: 'italic' },
  pinnedBadge: { padding: 4 },
  pinnedTxt: { fontSize: 16 },
});
