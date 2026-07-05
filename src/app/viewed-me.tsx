import { Avatar } from '@/components/ui/Avatar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import {
  ProfileViewSummary,
  ProfileViewTimelineItem,
  ViewPackage,
  discoverApi,
} from '@/lib/api/discover';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
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

function toPersianDigits(n: number) {
  return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

function LockedView({
  count,
  packages,
  purchasing,
  onPurchase,
}: {
  count: number;
  packages: ViewPackage[];
  purchasing: boolean;
  onPurchase: (pkg: ViewPackage) => void;
}) {
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
          <Text style={styles.upsellTitle}>{toPersianDigits(fakeCount)} نفر پروفایلت رو دیدن</Text>
          <Text style={styles.upsellSub}>با فعال‌سازی ببین کی نگاهت کرده</Text>
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

      {packages.map(pkg => (
        <TouchableOpacity
          key={pkg.id}
          style={styles.pkgBtn}
          activeOpacity={0.85}
          disabled={purchasing}
          onPress={() => onPurchase(pkg)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.pkgName}>{pkg.name}</Text>
            {pkg.duration_days != null && (
              <Text style={styles.pkgSub}>{toPersianDigits(pkg.duration_days)} روز دسترسی</Text>
            )}
          </View>
          {purchasing ? (
            <ActivityIndicator color={Colors.goldDeep} size="small" />
          ) : (
            <View style={styles.pkgPricePill}>
              <Text style={styles.pkgPriceTxt}>{toPersianDigits(pkg.coin_price)} سکه</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.upgradeBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/subscription' as never)}
      >
        <LinearGradient
          colors={Colors.gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: Radius.pill }]}
        />
        <Sparkles size={16} color="#fff" strokeWidth={2} />
        <Text style={styles.upgradeBtnTxt}>ارتقا به اشتراک نقره‌ای</Text>
      </TouchableOpacity>
    </View>
  );
}

function ViewRow({ item }: { item: ProfileViewTimelineItem }) {
  const avatarUrl = item.viewer ? absoluteUrl(item.viewer.profile_photo?.urls?.medium) : null;
  const content = (
    <>
      <Avatar size={50} name={item.display_name} photoUrl={avatarUrl} />
      <View style={styles.viewInfo}>
        <Text style={styles.viewName}>{item.display_name}</Text>
        <Text style={styles.viewTime}>
          {item.last_viewed_at ? timeAgo(item.last_viewed_at) : ''}
          {item.view_count > 1 ? ` · ${toPersianDigits(item.view_count)} بازدید` : ''}
        </Text>
      </View>
      <View style={styles.viewEyeWrap}>
        <Eye size={14} color={Colors.muted} strokeWidth={1.8} />
      </View>
    </>
  );
  if (item.can_open_profile && item.viewer) {
    return (
      <TouchableOpacity
        style={styles.viewRow}
        activeOpacity={0.8}
        onPress={() => router.push(`/user/${item.viewer!.id}` as never)}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.viewRow, { opacity: 0.55 }]}>{content}</View>;
}

export default function ViewedMeScreen() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<ProfileViewSummary | null>(null);
  const [views, setViews] = useState<ProfileViewTimelineItem[]>([]);
  const [packages, setPackages] = useState<ViewPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const isUnlocked = summary?.has_active_access === true;

  const load = useCallback(async () => {
    if (!session) return;
    setLoadError(false);
    try {
      const s = await discoverApi.getProfileViewSummary(session.accessToken);
      setSummary(s);
      if (s.has_active_access) {
        const timeline = await discoverApi.getProfileViewTimeline(session.accessToken);
        setViews(timeline.data?.data ?? []);
      } else {
        const pkgs = await discoverApi.getViewPackages(session.accessToken);
        setPackages(pkgs);
      }
    } catch {
      setLoadError(true);
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handlePurchase = async (pkg: ViewPackage) => {
    if (!session || purchasing) return;
    setPurchasing(true);
    try {
      await discoverApi.purchaseViewAccess(session.accessToken, pkg.id);
      toast.success('دسترسی فعال شد');
      setLoading(true);
      await load();
    } catch (e) {
      const msg = e instanceof Error && e.message.includes('coin') ? 'سکه کافی نداری' : 'خرید انجام نشد';
      toast.error(msg);
    } finally {
      setPurchasing(false);
    }
  };

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
            <Text style={styles.countTxt}>{toPersianDigits(views.length)}</Text>
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Eye size={44} color={Colors.ph} strokeWidth={1.4} />
          <Text style={styles.emptyTitle}>خطا در بارگذاری</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={styles.retryBtn}>
            <Text style={styles.retryTxt}>تلاش دوباره</Text>
          </TouchableOpacity>
        </View>
      ) : isUnlocked ? (
        <FlatList
          data={views}
          keyExtractor={v => String(v.profile_view_id)}
          renderItem={({ item }) => <ViewRow item={item} />}
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
        <LockedView
          count={summary?.total_count ?? 0}
          packages={packages}
          purchasing={purchasing}
          onPurchase={handlePurchase}
        />
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
  emptyTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  emptyTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  emptySub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted },
  retryBtn: {
    marginTop: 4, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    backgroundColor: Colors.accentSoft, borderRadius: Radius.lg,
  },
  retryTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.accent },

  // Unlocked list
  list: { paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 100 },
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
  lockedWrap: { flex: 1, padding: Spacing.lg, gap: 0 },
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

  pkgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.goldSoft,
    backgroundColor: Colors.surface,
  },
  pkgName: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  pkgSub: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  pkgPricePill: {
    backgroundColor: Colors.goldSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pkgPriceTxt: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.goldDeep },

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
