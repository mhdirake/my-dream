import { Avatar } from '@/components/ui/Avatar';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { ProfileView, discoverApi } from '@/lib/api/discover';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Eye, Lock, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

function absoluteUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${BASE}${path}`;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  if (diff < 172800) return 'دیروز';
  return `${Math.floor(diff / 86400)} روز پیش`;
}

function LockedView({ count }: { count: number }) {
  const fakeCount = count || 4;
  return (
    <View style={styles.lockedWrap}>
      <View style={styles.upsellCard}>
        <LinearGradient
          colors={['#FEF3DD', '#FCE8ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.upsellIcon}>
          <Sparkles size={20} color={Colors.gold} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.upsellTitle}>{fakeCount} نفر پروفایلت رو دیدن</Text>
          <Text style={styles.upsellSub}>با Silver ببین کی نگاهت کرده</Text>
        </View>
      </View>

      {Array.from({ length: Math.min(fakeCount, 6) }).map((_, i) => (
        <View key={i} style={styles.lockedRow}>
          <View style={styles.lockedAvatar}>
            <Lock size={16} color={Colors.muted} strokeWidth={2} />
          </View>
          <View style={styles.lockedInfo}>
            <View style={[styles.blurBar, { width: `${48 + (i % 3) * 14}%` as any }]} />
            <View style={[styles.blurBar, { width: '28%', height: 10, marginTop: 6 }]} />
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.85}>
        <LinearGradient
          colors={Colors.gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: Radius.pill }]}
        />
        <Sparkles size={16} color="#fff" strokeWidth={2} />
        <Text style={styles.upgradeBtnTxt}>ارتقا به Silver</Text>
      </TouchableOpacity>
    </View>
  );
}

function ViewRow({ view }: { view: ProfileView }) {
  const avatarUrl = absoluteUrl(view.viewer_user.profile_photo?.urls.medium);
  return (
    <View style={styles.viewRow}>
      <Avatar size={50} name={view.viewer_user.first_name} photoUrl={avatarUrl} />
      <View style={styles.viewInfo}>
        <Text style={styles.viewName}>{view.viewer_user.first_name}</Text>
        <Text style={styles.viewTime}>{timeAgo(view.viewed_at)}</Text>
      </View>
      <View style={styles.viewEyeWrap}>
        <Eye size={14} color={Colors.muted} strokeWidth={1.8} />
      </View>
    </View>
  );
}

export default function ViewedMeScreen() {
  const { session } = useAuth();
  const [views, setViews] = useState<ProfileView[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [viewsData, profileData] = await Promise.all([
        discoverApi.getProfileViews(session.accessToken),
        profileApi.getProfile(session.accessToken),
      ]);
      setViews(viewsData);
      const plan = profileData.active_subscription?.plan?.toLowerCase();
      setIsUnlocked(plan === 'silver' || plan === 'gold');
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/me' as never)}
        >
          <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>کی منو دید؟</Text>
        {isUnlocked && views.length > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countTxt}>{views.length}</Text>
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : isUnlocked ? (
        <FlatList
          data={views}
          keyExtractor={v => String(v.id)}
          renderItem={({ item }) => <ViewRow view={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Eye size={44} color={Colors.ph} strokeWidth={1.4} />
              <Text style={styles.emptyTxt}>هنوز کسی پروفایلت رو ندیده</Text>
              <Text style={styles.emptySub}>بازدیدها اینجا نشون داده میشن</Text>
            </View>
          }
        />
      ) : (
        <LockedView count={views.length} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink },
  countBadge: {
    width: 36, height: 24, borderRadius: 12,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  countTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.accent },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  emptySub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },

  // Unlocked list
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hair,
  },
  viewInfo: { flex: 1 },
  viewName: { fontSize: 14.5, fontFamily: Fonts.bold, color: Colors.ink },
  viewTime: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  viewEyeWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.ph2,
    alignItems: 'center', justifyContent: 'center',
  },

  // Locked state
  lockedWrap: { flex: 1, padding: 16, gap: 0 },
  upsellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.lineSoft,
  },
  upsellIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  upsellTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  upsellSub: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },

  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hair,
  },
  lockedAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.ph2,
    alignItems: 'center', justifyContent: 'center',
  },
  lockedInfo: { flex: 1 },
  blurBar: {
    height: 13,
    borderRadius: 6,
    backgroundColor: Colors.ph,
  },

  upgradeBtn: {
    height: 52,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    overflow: 'hidden',
  },
  upgradeBtnTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
