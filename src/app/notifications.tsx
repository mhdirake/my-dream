import { AppBar } from '@/components/ui/AppBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { type AppNotification, notificationsApi } from '@/lib/api/notifications';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import {
  AlertTriangle, Bell, Clock, Eye, Gift, Heart,
  MessageCircle, Sparkles, Star,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type NotifMeta = { icon: React.ComponentType<any>; color: string; bg: string };

const TYPE_META: Record<string, NotifMeta> = {
  anonymous_interest_mutual: { icon: Heart,          color: '#E91E8C', bg: '#FFE5F4' },
  like_received:             { icon: Heart,          color: Colors.accent, bg: Colors.accentSoft },
  gift_received:             { icon: Gift,           color: Colors.goldDeep, bg: Colors.goldSoft },
  new_message:               { icon: MessageCircle,  color: Colors.trust, bg: Colors.trustSoft },
  message_received:          { icon: MessageCircle,  color: Colors.trust, bg: Colors.trustSoft },
  profile_viewed:            { icon: Eye,            color: Colors.purple, bg: Colors.purpleSoft },
  badge_earned:              { icon: Star,           color: Colors.goldDeep, bg: Colors.goldSoft },
  restriction_applied:       { icon: AlertTriangle,  color: Colors.danger, bg: '#FFF1F0' },
  subscription_expired:      { icon: Clock,          color: Colors.gold, bg: Colors.goldSoft },
  ai_insight:                { icon: Sparkles,       color: Colors.purple, bg: Colors.purpleSoft },
};

const DEFAULT_META: NotifMeta = { icon: Bell, color: Colors.inkSoft, bg: Colors.ph2 };

function getMeta(type: string): NotifMeta {
  return TYPE_META[type] ?? DEFAULT_META;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)  return 'همین الان';
  if (mins < 60) return `${toPersian(mins)} دقیقه پیش`;
  if (hours < 24) return `${toPersian(hours)} ساعت پیش`;
  if (days === 1) return 'دیروز';
  if (days < 7)  return `${toPersian(days)} روز پیش`;
  return `${toPersian(days)} روز پیش`;
}

function groupDay(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'امروز';
  if (days === 1) return 'دیروز';
  if (days < 7)  return 'این هفته';
  return 'قدیمی‌تر';
}

type GroupedItem =
  | { kind: 'header'; label: string; key: string }
  | { kind: 'notif'; item: AppNotification };

function buildGrouped(items: AppNotification[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let lastGroup = '';
  for (const item of items) {
    const g = groupDay(item.created_at);
    if (g !== lastGroup) {
      result.push({ kind: 'header', label: g, key: `h-${g}` });
      lastGroup = g;
    }
    result.push({ kind: 'notif', item });
  }
  return result;
}

function handleNavigation(n: AppNotification) {
  const m = n.metadata ?? {};
  switch (n.type) {
    case 'new_message':
    case 'message_received':
      if (m.conversation_id) router.push({ pathname: '/chat/[id]' as any, params: { id: String(m.conversation_id) } });
      break;
    case 'gift_received':
      router.push('/gifts/wallet' as any);
      break;
    case 'profile_viewed':
      router.push('/viewed-me' as any);
      break;
    case 'subscription_expired':
      router.push('/subscription' as any);
      break;
    case 'restriction_applied':
      router.push('/settings/restrictions' as any);
      break;
    case 'anonymous_interest_mutual':
    case 'like_received':
      if (n.related_user?.id) router.push({ pathname: '/user/[id]' as any, params: { id: String(n.related_user.id) } });
      break;
    default:
      break;
  }
}

export default function NotificationsScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (p: number, replace: boolean) => {
    if (!session?.accessToken) return;
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await notificationsApi.list(session.accessToken, p);
      setItems(prev => replace ? res.data : [...prev, ...res.data]);
      setUnreadCount(res.unread_count);
      setLastPage(res.meta.last_page);
      setPage(p);
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در بارگذاری');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session?.accessToken]);

  useEffect(() => { load(1, true); }, [load]);

  const markAllRead = async () => {
    if (!session?.accessToken || markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead(session.accessToken);
      setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      toast.error('خطا');
    } finally {
      setMarkingAll(false);
    }
  };

  const markRead = async (n: AppNotification) => {
    if (!session?.accessToken || n.read_at) return;
    try {
      await notificationsApi.markRead(session.accessToken, n.id);
      setItems(prev => prev.map(item => item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handlePress = (n: AppNotification) => {
    markRead(n);
    handleNavigation(n);
  };

  const grouped = buildGrouped(items);

  const renderItem = ({ item: row }: { item: GroupedItem }) => {
    if (row.kind === 'header') {
      return <Text style={styles.groupHeader}>{row.label}</Text>;
    }

    const n = row.item;
    const meta = getMeta(n.type);
    const Icon = meta.icon;
    const isUnread = !n.read_at;

    return (
      <TouchableOpacity
        style={[styles.row, isUnread && styles.rowUnread]}
        onPress={() => handlePress(n)}
        activeOpacity={0.8}
      >
        {isUnread && <View style={styles.unreadDot} />}
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Icon size={18} color={meta.color} strokeWidth={2} />
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, isUnread && styles.rowTitleBold]} numberOfLines={1}>
              {n.title ?? n.type}
            </Text>
            <Text style={styles.rowTime}>{relativeTime(n.created_at)}</Text>
          </View>
          {n.body ? (
            <Text style={styles.rowBody} numberOfLines={2}>{n.body}</Text>
          ) : null}
          {n.related_user && (
            <Text style={styles.rowUser}>
              {n.related_user.first_name ?? n.related_user.username}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar
        title={unreadCount > 0 ? `اعلان‌ها (${toPersian(unreadCount)})` : 'اعلان‌ها'}
        back
        right={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} disabled={markingAll} style={styles.markAllBtn}>
              <Text style={styles.markAllTxt}>
                {markingAll ? '…' : 'خواندن همه'}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={40} color={Colors.hair} strokeWidth={1.5} />
          <Text style={styles.emptyTxt}>اعلانی ندارید</Text>
          <Text style={styles.emptySub}>وقتی اتفاقی بیفته اینجا می‌بینید</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(row, i) => row.kind === 'header' ? row.key : String(row.item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (!loadingMore && page < lastPage) load(page + 1, false);
          }}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  markAllBtn: { paddingHorizontal: 4, paddingVertical: 6 },
  markAllTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.accent },

  list: { paddingBottom: 40 },

  groupHeader: {
    fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.muted,
    paddingHorizontal: Spacing.xl, paddingTop: 20, paddingBottom: 6,
  },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: Spacing.xl, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
    position: 'relative',
  },
  rowUnread: { backgroundColor: Colors.accentSoft + '60' },

  unreadDot: {
    position: 'absolute', top: 20, right: 10,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.accent,
  },

  iconWrap: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  rowContent: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowTitle: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  rowTitleBold: { fontFamily: Fonts.extraBold, color: Colors.ink },
  rowTime: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, flexShrink: 0, marginTop: 1 },
  rowBody: { fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular, lineHeight: 18 },
  rowUser: { fontSize: 11, color: Colors.accent, fontFamily: Fonts.semiBold },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTxt: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.inkSoft },
  emptySub: { fontSize: 12.5, color: Colors.muted, fontFamily: Fonts.regular },
});
