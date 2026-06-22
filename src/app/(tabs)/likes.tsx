import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import {
  AnonSummary, ReceivedAnonInterest, ReceivedResponse,
  RevealPackage, SentAnonInterest, likesApi, mediaUrl,
} from '@/lib/api/likes';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { Coins, Eye, Heart, Lock, Sparkles, UserX } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${toPersian(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${toPersian(Math.floor(diff / 3600))} ساعت پیش`;
  return `${toPersian(Math.floor(diff / 86400))} روز پیش`;
}

type Tab = 'received' | 'sent';

export default function LikesScreen() {
  const { session } = useAuth();
  const { bottom } = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('received');
  const [summary, setSummary] = useState<AnonSummary | null>(null);
  const [received, setReceived] = useState<ReceivedResponse | null>(null);
  const [sent, setSent] = useState<SentAnonInterest[]>([]);
  const [packages, setPackages] = useState<RevealPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (!session?.accessToken) return;
    showRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [sumRes, recRes, sentRes, pkgRes] = await Promise.all([
        likesApi.summary(session.accessToken),
        likesApi.received(session.accessToken),
        likesApi.listSentAnonInterests(session.accessToken, 'active'),
        likesApi.revealPackages(session.accessToken),
      ]);
      setSummary(sumRes.data);
      setReceived(recRes.data);
      setSent(sentRes.data);
      setPackages(pkgRes.data);
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در بارگذاری');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.accessToken]);

  useEffect(() => { load(); }, [load]);

  const handlePurchaseReveal = () => {
    if (!packages.length) {
      toast.error('بسته‌ای موجود نیست');
      return;
    }
    const pkg = packages[0];
    Alert.alert(
      'خرید دسترسی به علاقه ناشناس',
      `با ${toPersian(pkg.coin_price)} سکه، ${toPersian(pkg.duration_days)} روز دسترسی داری.`,
      [
        { text: 'لغو', style: 'cancel' },
        { text: 'خرید', onPress: () => doPurchase(pkg) },
      ],
    );
  };

  const doPurchase = async (pkg: RevealPackage) => {
    if (!session?.accessToken) return;
    setPurchasing(true);
    try {
      await likesApi.purchaseReveal(session.accessToken, pkg.id);
      toast.success('دسترسی فعال شد!');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در خرید');
    } finally {
      setPurchasing(false);
    }
  };

  const isLocked = !received || received.locked;
  const receivedItems = (!received || received.locked) ? [] : (received as any).items as ReceivedAnonInterest[];
  const receivedCount = summary?.received_count ?? 0;
  const mutualCount = sent.filter(s => s.is_mutual).length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 92 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>مَچ و لایک</Text>
          {mutualCount > 0 && (
            <View style={styles.mutualBadge}>
              <Heart size={12} color="#fff" strokeWidth={2} fill="#fff" />
              <Text style={styles.mutualBadgeTxt}>{toPersian(mutualCount)} متقابل</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'received' && styles.tabBtnActive]}
            onPress={() => setTab('received')}
          >
            <Text style={[styles.tabTxt, tab === 'received' && styles.tabTxtActive]}>دریافتی</Text>
            {receivedCount > 0 && (
              <View style={[styles.tabCount, tab === 'received' && styles.tabCountActive]}>
                <Text style={[styles.tabCountTxt, tab === 'received' && styles.tabCountTxtActive]}>
                  {toPersian(receivedCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'sent' && styles.tabBtnActive]}
            onPress={() => setTab('sent')}
          >
            <Text style={[styles.tabTxt, tab === 'sent' && styles.tabTxtActive]}>فرستاده‌شده</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : tab === 'received' ? (
          <ReceivedSection
            locked={isLocked}
            count={receivedCount}
            items={receivedItems}
            packages={packages}
            purchasing={purchasing}
            onPurchase={handlePurchaseReveal}
          />
        ) : (
          <SentSection items={sent} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Received Section ───────────────────────────────────────────────────────────

function ReceivedSection({
  locked, count, items, packages, purchasing, onPurchase,
}: {
  locked: boolean;
  count: number;
  items: ReceivedAnonInterest[];
  packages: RevealPackage[];
  purchasing: boolean;
  onPurchase: () => void;
}) {
  const pkg = packages[0];

  if (locked) {
    const fakeCount = Math.max(count, 3);
    return (
      <>
        {/* Upsell card */}
        <Card tint="gold" style={styles.upsellCard}>
          <View style={styles.upsellRow}>
            <View style={styles.upsellIcon}>
              <Eye size={20} color={Colors.goldDeep} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.upsellTitle}>
                {count > 0 ? `${toPersian(count)} نفر علاقه ناشناس فرستادن` : 'شاید کسی علاقه فرستاده'}
              </Text>
              <Text style={styles.upsellSub}>
                {pkg ? `${toPersian(pkg.coin_price)} سکه · ${toPersian(pkg.duration_days)} روز دسترسی` : 'برای دیدن دسترسی بخر'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.upsellBtn}
            onPress={onPurchase}
            disabled={purchasing}
          >
            {purchasing
              ? <ActivityIndicator size="small" color="#3A2C0A" />
              : <>
                  <Coins size={13} color="#3A2C0A" strokeWidth={2} />
                  <Text style={styles.upsellBtnTxt}>
                    {pkg ? `خرید با ${toPersian(pkg.coin_price)} سکه` : 'خرید دسترسی'}
                  </Text>
                </>
            }
          </TouchableOpacity>
        </Card>

        {/* Blurred placeholder cards */}
        <View style={styles.grid}>
          {Array.from({ length: Math.min(fakeCount, 6) }).map((_, i) => (
            <View key={i} style={styles.lockedCard}>
              <View style={styles.lockedAvatar}>
                <UserX size={28} color={Colors.purple} strokeWidth={1.5} />
              </View>
              <View style={styles.lockedName} />
              <View style={styles.lockedCity} />
            </View>
          ))}
        </View>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Sparkles size={32} color={Colors.hair} strokeWidth={1.5} />
        <Text style={styles.emptyTxt}>هنوز علاقه ناشناسی نداری</Text>
        <Text style={styles.emptySub}>وقتی کسی علاقه بفرسته اینجا میاد</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {items.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[styles.receivedCard, item.is_mutual && styles.receivedCardMutual]}
          onPress={() => router.push({ pathname: '/user/[id]' as any, params: { id: String(item.sender.id) } })}
          activeOpacity={0.85}
        >
          {item.is_mutual && (
            <View style={styles.mutualTag}>
              <Heart size={9} color="#fff" strokeWidth={2} fill="#fff" />
              <Text style={styles.mutualTagTxt}>متقابل</Text>
            </View>
          )}
          <Avatar size={72} name={item.sender.first_name} photoUrl={mediaUrl(item.sender.profile_photo)} />
          <Text style={styles.cardName} numberOfLines={1}>
            {item.sender.first_name}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(item.sent_at)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Sent Section ──────────────────────────────────────────────────────────────

function SentSection({ items }: { items: SentAnonInterest[] }) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Heart size={32} color={Colors.hair} strokeWidth={1.5} />
        <Text style={styles.emptyTxt}>هنوز علاقه ناشناسی نفرستادی</Text>
        <Text style={styles.emptySub}>از صفحه کشف می‌تونی ارسال کنی</Text>
      </View>
    );
  }

  return (
    <View style={styles.sentList}>
      {items.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.sentRow}
          onPress={() => router.push({ pathname: '/user/[id]' as any, params: { id: String(item.target.id) } })}
          activeOpacity={0.8}
        >
          <Avatar size={50} name={item.target.first_name} photoUrl={mediaUrl(item.target.profile_photo)} />
          <View style={styles.sentInfo}>
            <Text style={styles.sentName}>
              {item.target.first_name}{item.target.last_name ? ' ' + item.target.last_name : ''}
            </Text>
            <Text style={styles.sentTime}>{timeAgo(item.sent_at)}</Text>
          </View>
          {item.is_mutual && (
            <View style={styles.mutualPill}>
              <Heart size={10} color={Colors.accent} strokeWidth={2} fill={Colors.accent} />
              <Text style={styles.mutualPillTxt}>متقابل</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl },

  header: {
    height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  mutualBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accent, borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  mutualBadgeTxt: { fontSize: 11.5, fontFamily: Fonts.bold, color: '#fff' },

  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: Spacing.lg,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.pill, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.hair,
  },
  tabBtnActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  tabTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.muted },
  tabTxtActive: { color: '#fff' },
  tabCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabCountActive: { backgroundColor: Colors.accent },
  tabCountTxt: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.accent },
  tabCountTxtActive: { color: '#fff' },

  center: { paddingVertical: 60, alignItems: 'center' },

  // Upsell
  upsellCard: { gap: 12, marginBottom: Spacing.lg },
  upsellRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upsellIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: Colors.goldSoft, alignItems: 'center', justifyContent: 'center',
  },
  upsellTitle: { fontSize: 13.5, fontFamily: Fonts.bold, color: Colors.goldDeep },
  upsellSub: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.regular, marginTop: 2 },
  upsellBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.gold, borderRadius: Radius.md,
    paddingHorizontal: 18, paddingVertical: 10, alignSelf: 'flex-start',
  },
  upsellBtnTxt: { fontSize: 13, fontFamily: Fonts.bold, color: '#3A2C0A' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Locked placeholder cards
  lockedCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.hair,
  },
  lockedAvatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.purpleSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  lockedName: { width: 60, height: 10, borderRadius: 5, backgroundColor: Colors.hair },
  lockedCity: { width: 40, height: 8, borderRadius: 4, backgroundColor: Colors.ph2 },

  // Real received cards
  receivedCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 12, alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.hair, overflow: 'hidden',
  },
  receivedCardMutual: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  mutualTag: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.accent, paddingVertical: 3,
  },
  mutualTagTxt: { fontSize: 9.5, fontFamily: Fonts.bold, color: '#fff' },
  cardName: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink, marginTop: 4 },
  cardTime: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular },

  // Sent list
  sentList: { gap: 8 },
  sentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.hair, padding: 12,
  },
  sentInfo: { flex: 1 },
  sentName: { fontSize: 13.5, fontFamily: Fonts.bold, color: Colors.ink },
  sentTime: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },
  mutualPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentSoft, borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  mutualPillTxt: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.accent },

  emptyBox: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  emptyTxt: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.inkSoft },
  emptySub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular },
});
