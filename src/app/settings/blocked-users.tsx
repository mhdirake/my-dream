import { Avatar } from '@/components/ui/Avatar';
import { AppBar } from '@/components/ui/AppBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { blockApi, type BlockedItem } from '@/lib/api/block';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 86400) return 'امروز';
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days} روز پیش`;
  const months = Math.floor(days / 30);
  return `${months} ماه پیش`;
}

export default function BlockedUsersScreen() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';

  const [items, setItems] = useState<BlockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unblocking, setUnblocking] = useState<number | null>(null);

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    if (!token) return;
    try {
      const res = await blockApi.getBlocked(token, p);
      setItems(prev => replace ? res.data : [...prev, ...res.data]);
      setHasMore(res.meta.current_page < res.meta.last_page);
      setPage(p);
    } catch {
      toast.error('خطا در دریافت لیست');
    }
  }, [token]);

  useEffect(() => {
    fetchPage(1, true).finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
  };

  const handleUnblock = (item: BlockedItem) => {
    Alert.alert(
      'رفع مسدودیت',
      `آیا می‌خواهی ${item.blocked_user.first_name} را رفع بلاک کنی؟`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'رفع بلاک',
          style: 'destructive',
          onPress: async () => {
            setUnblocking(item.blocked_user.id);
            try {
              await blockApi.unblockUser(token, item.blocked_user.id);
              setItems(prev => prev.filter(i => i.blocked_user.id !== item.blocked_user.id));
              toast.success('رفع مسدودیت انجام شد');
            } catch {
              toast.error('خطا در رفع مسدودیت');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: BlockedItem }) => {
    const u = item.blocked_user;
    const isUnblocking = unblocking === u.id;
    return (
      <View style={styles.row}>
        <Avatar
          size={46}
          name={u.first_name}
          photoUrl={u.profile_photo?.urls?.thumbnail ?? null}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{u.first_name}</Text>
          <Text style={styles.sub}>@{u.username} · مسدود از {timeAgo(item.blocked_at)}</Text>
        </View>
        <TouchableOpacity
          style={styles.unblockBtn}
          onPress={() => handleUnblock(item)}
          disabled={isUnblocking}
          activeOpacity={0.8}
        >
          {isUnblocking
            ? <ActivityIndicator size="small" color={Colors.danger} />
            : <Text style={styles.unblockTxt}>رفع</Text>
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppBar
        title="کاربران مسدود"
        sub={items.length > 0 ? `${items.length} کاربر` : undefined}
        back
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.blocked_user.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTxt}>هیچ کاربری مسدود نشده</Text>
            </View>
          }
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
  list: { padding: Spacing.lg, gap: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.hair,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.ink },
  sub: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },

  unblockBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.dangerSoft,
    backgroundColor: Colors.dangerSoft,
    minWidth: 52, alignItems: 'center',
  },
  unblockTxt: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.danger },

  emptyTxt: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.muted },
});
