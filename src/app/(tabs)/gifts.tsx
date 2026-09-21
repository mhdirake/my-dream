import { DetailCard } from '@/components/ui/DetailCard';
import { Avatar } from '@/components/ui/Avatar';
import { AppMaxWidth, Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { giftDisplayTitle, giftUserPhotoUrl, giftsApi, SentGift } from '@/lib/api/gifts';
import { BackendGift } from '@/lib/api/discover';
import { paymentsApi } from '@/lib/api/payments';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, ChevronLeft, Coins, Gift, Package, Star, Wallet } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

// Fixed px gap for the 3-column store grid below — see the identical note in
// likes.tsx: percentage widths + a gap never sum to exactly 100%, and the row
// vs. column gaps end up different sizes. A width computed from the real
// screen width keeps both gaps identical and the grid flush with the container.
const GRID_GAP = 10;
const STORE_COLUMNS = 3;

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
  const { width: winWidth } = useWindowDimensions();
  // #root is capped to AppMaxWidth on web (see +html.tsx) and centered, but
  // useWindowDimensions() still reports the raw browser window width — on a
  // wide monitor that made cards blow up far past the actual visible column.
  const contentWidth = Math.min(winWidth, AppMaxWidth);
  const storeCardWidth = (contentWidth - Spacing.lg * 2 - GRID_GAP * (STORE_COLUMNS - 1)) / STORE_COLUMNS;
  const params = useLocalSearchParams<{ tab?: string }>();

  const [screenTab, setScreenTab] = useState<'store' | 'received'>(
    params.tab === 'received' ? 'received' : 'store',
  );
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
    if (params.tab === 'received') setScreenTab('received');
  }, [params.tab]);

  useEffect(() => {
    if (screenTab === 'received' && received.length === 0) loadReceived();
  }, [screenTab]);

  const filtered = filterTab === 'all' ? gifts : gifts.filter(g => g.type === filterTab);

  const openGift = (g: BackendGift) => {
    router.push({
      pathname: '/gifts/[id]' as any,
      params: {
        id: String(g.id),
        title: giftDisplayTitle(g.title),
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
                <Package size={28} color={Colors.hair} strokeWidth={1.5} />
                <Text style={styles.emptyTxt}>هدیه‌ای در این دسته موجود نیست</Text>
                <Text style={styles.emptySub}>دسته‌ی دیگه‌ای رو امتحان کن</Text>
              </View>
            ) : (
              <View style={styles.giftGrid}>
                {filtered.map(g => {
                  const meta = TYPE_META[g.type] ?? { label: g.type, color: Colors.muted, bg: Colors.ph2 };
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.storeCard, { width: storeCardWidth }]}
                      onPress={() => openGift(g)}
                      activeOpacity={0.8}
                    >
                      {g.is_limited && (
                        <View style={styles.limitedBadge}>
                          <Package size={8} color={Colors.accent} strokeWidth={2.5} />
                          <Text style={styles.limitedTxt}>محدود</Text>
                        </View>
                      )}
                      <Text style={styles.storeEmoji}>{giftEmoji(g)}</Text>
                      <Text style={styles.storeName} numberOfLines={2}>{giftDisplayTitle(g.title)}</Text>
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
            <DetailCard
              style={styles.giftSubCard}
              icon={<Star size={26} color={Colors.trust} strokeWidth={1.8} />}
              title="هدیه اشتراک یا سکه"
              subtitle="اشتراک نقره‌ای یا طلایی یا سکه به دوستت هدیه بده"
              items={[
                'یک ماه اشتراک کامل',
                'فعال‌سازی آنی برای دوستت',
                'کاملاً غافلگیرکننده',
              ].map(b => ({ icon: <CheckCircle size={12} color={Colors.ok} strokeWidth={2} />, text: b }))}
              footer={
                <TouchableOpacity
                  style={styles.giftSubBtn}
                  onPress={() => router.push('/gifts/gift-sub' as any)}
                >
                  <Gift size={13} color={Colors.accent} strokeWidth={2} />
                  <Text style={styles.giftSubBtnTxt}>ارسال هدیه ویژه</Text>
                </TouchableOpacity>
              }
            />
          </>
        ) : (
          <>
            {loadingReceived ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.accent} />
              </View>
            ) : received.length === 0 ? (
              <View style={styles.emptyBox}>
                <Gift size={28} color={Colors.hair} strokeWidth={1.5} />
                <Text style={styles.emptyTxt}>هنوز هدیه‌ای دریافت نکردی</Text>
                <Text style={styles.emptySub}>وقتی کسی هدیه بفرسته اینجا میاد</Text>
              </View>
            ) : (
              received.map(sg => {
                const meta = TYPE_META[sg.gift_type] ?? { label: sg.gift_type, color: Colors.muted, bg: Colors.ph2 };
                return (
                  <TouchableOpacity
                    key={sg.sent_gift_id}
                    style={styles.receivedCard}
                    onPress={() => sg.sender && router.push({
                      pathname: '/user/[id]' as any,
                      params: { id: String(sg.sender.id) },
                    })}
                    disabled={!sg.sender}
                    activeOpacity={0.75}
                    accessibilityRole={sg.sender ? 'button' : undefined}
                  >
                    <Avatar
                      size={44}
                      name={sg.sender?.first_name ?? sg.sender?.username}
                      photoUrl={giftUserPhotoUrl(sg.sender)}
                      iconFallback
                    />
                    <View style={styles.receivedInfo}>
                      <Text style={styles.receivedTitle}>{giftDisplayTitle(sg.gift_title)}</Text>
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
                    <View style={styles.receivedActions}>
                      {sg.is_pinned && (
                        <View style={styles.pinnedBadge}>
                          <Text style={styles.pinnedTxt}>📌</Text>
                        </View>
                      )}
                      {sg.sender && <ChevronLeft size={18} color={Colors.muted} strokeWidth={2} />}
                    </View>
                  </TouchableOpacity>
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

  filterScroll: { flexGrow: 0, marginBottom: Spacing.md },
  filterRow: { gap: 7, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(36,33,42,0.06)', borderRadius: 999,
    borderWidth: 1.5, borderColor: 'transparent',
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  filterChipActive: {
    backgroundColor: Colors.accentSoft,
    borderWidth: 1.5, borderColor: Colors.accent,
  },
  filterTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.muted },
  filterTxtActive: { color: Colors.accent, fontFamily: Fonts.extraBold },

  loadingBox: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyTxt: { fontSize: 13.5, color: Colors.inkSoft, fontFamily: Fonts.semiBold },
  emptySub: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular },

  // Column width is computed per-render from the real screen width (see
  // `storeCardWidth` above) so all three columns sit flush against the
  // container edges; CSS `gap` (not per-item margins) spaces the cards,
  // since logical marginStart/End doesn't apply symmetrically under RTL.
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginBottom: Spacing.xl },
  storeCard: {
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

  giftSubCard: { marginBottom: Spacing.lg },
  giftSubBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accentSoft, borderWidth: 1.5, borderColor: Colors.accent,
    borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 9,
  },
  giftSubBtnTxt: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.accent },

  receivedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.md,
    marginBottom: 10,
  },
  receivedInfo: { flex: 1, gap: 4 },
  receivedTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  receivedType: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  receivedTypeTxt: { fontSize: 9.5, fontFamily: Fonts.semiBold },
  receivedFrom: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular },
  receivedNote: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.regular, fontStyle: 'italic' },
  receivedActions: { alignItems: 'center', gap: 6 },
  pinnedBadge: { padding: 4 },
  pinnedTxt: { fontSize: 16 },
});
