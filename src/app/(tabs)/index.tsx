import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { SegmentedTabs, SegmentedTabItem } from '@/components/ui/SegmentedTabs';
import { GiftModal } from '@/components/GiftModal';
import { TemplateMessageModal } from '@/components/TemplateMessageModal';
import { Colors, Fonts, Spacing } from '@/constants/colors';
import { useAppWidth } from '@/components/ui/AppFrame';
import { DailySuggestionProfile, DailySuggestionsMeta, DiscoverProfile, MutualUser, SwipePoolMeta, discoverApi } from '@/lib/api/discover';
import { MatchCelebrationModal } from '@/components/MatchCelebrationModal';
import { isGroupMessageNotification, notificationsApi } from '@/lib/api/notifications';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileCache } from '@/lib/cache/profileCache';
import { formatPersianDate, formatPersianTime } from '@/lib/date/persian';
import { toast } from '@/lib/toast';
import { dailyIsPending, dailyReason } from '@/lib/discovery/dailySuggestions';
import { useDailySuggestions } from '@/lib/discovery/useDailySuggestions';
import { CompatibilitySummary } from '@/components/discovery/CompatibilitySummary';
import { DiscoveryFiltersSheet } from '@/components/discovery/DiscoveryFiltersSheet';
import { discoveryFilterSession, filterCount } from '@/lib/discovery/filters';
import { useSwipeProfiles } from '@/lib/discovery/useSwipeProfiles';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell, Clock, Gift, Heart, MessageCircle,
  Search, ShieldCheck, SlidersHorizontal, Sparkles, User, X,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SWIPE_THRESHOLD = 80;
// CSS accepts combinations; Gesture Handler's type only lists single keywords.
const SWIPE_TOUCH_ACTION = 'pan-y pinch-zoom' as React.ComponentProps<typeof GestureDetector>['touchAction'];

type Mode = 'swipe' | 'daily' | 'ai';
const MODES: SegmentedTabItem<Mode>[] = [
  { key: 'swipe', label: 'جستجو' },
  { key: 'daily', label: 'پیشنهاد روزانه' },
  {
    key: 'ai', label: 'مچ هوشمند',
    icon: active => <Sparkles size={12} color={active ? Colors.accent : Colors.purple} strokeWidth={2} />,
  },
];

function toPersianDigits(n: number) {
  return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

function formatUnlockLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
  const time = formatPersianTime(iso);
  if (diffDays <= 0) return `امروز ساعت ${time}`;
  if (diffDays === 1) return `فردا ساعت ${time}`;
  return `${formatPersianDate(iso, { year: d.getFullYear() !== now.getFullYear() })} ساعت ${time}`;
}

function badgeKind(slug: string): 'ai' | 'community' | 'gold' | 'complete' | 'personality' | 'check' {
  if (slug === 'ai_trusted' || slug === 'ai-trusted') return 'ai';
  if (slug === 'community_verified' || slug === 'community-verified') return 'community';
  if (slug === 'gold_badge' || slug === 'gold-badge') return 'gold';
  return 'check';
}

// ── LikeButton with spring press ─────────────────────────────────────────────
function LikeButton({ onPress, liked }: { onPress: () => void; liked: boolean }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.86, { damping: 20, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 200 }); }}
    >
      <Animated.View style={[styles.actionLike, animStyle]}>
        <Heart style={styles.actionLikeIcon} size={30} color={Colors.accent} fill={liked ? Colors.accent : 'none'} strokeWidth={liked ? 0 : 2} />
      </Animated.View>
    </Pressable>
  );
}

// ── SwipeCard ─────────────────────────────────────────────────────────────────
function SwipeCard({
  profile,
  liked,
  onInteract,
  onSwiped,
  onLike,
}: {
  profile: DiscoverProfile;
  liked: boolean;
  onInteract: (type: 'swipe_like' | 'swipe_pass') => Promise<boolean>;
  onSwiped: () => void;
  onLike: () => void;
}) {
  const SW = useAppWidth();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const [widgetsVisible, setWidgetsVisible] = useState(true);
  const revealWidgets = () => setWidgetsVisible(true);
  const age = profile.age;
  const photoUrl = profile.profile_photo?.urls.large;

  const finishSwipe = () => {
    onSwiped();
    checkingRef.current = false;
    setChecking(false);
  };

  const attemptSwipe = async (dir: 1 | -1) => {
    revealWidgets();
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    const ok = await onInteract(dir > 0 ? 'swipe_like' : 'swipe_pass');
    if (ok) {
      translateX.value = withTiming(dir * SW * 1.5, { duration: 220 }, () => runOnJS(finishSwipe)());
    } else {
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      checkingRef.current = false;
      setChecking(false);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .minDistance(10)
    .enabled(!checking)
    .onStart(() => { runOnJS(revealWidgets)(); })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        runOnJS(attemptSwipe)(dir);
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-SW / 2, 0, SW / 2], [-12, 0, 12], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD * 0.6], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD * 0.6, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan} touchAction={SWIPE_TOUCH_ACTION}>
      <Animated.View style={[styles.card, cardStyle]}>
      {/* Photo / default avatar */}
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          pointerEvents="none"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.accent }]}>
          <View style={styles.cardPhInitial}>
            <Text style={styles.cardPhInitialTxt}>{profile.first_name[0]}</Text>
          </View>
        </View>
      )}

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setWidgetsVisible(visible => !visible)}
        accessibilityRole="button"
        accessibilityLabel={widgetsVisible ? 'مخفی کردن اطلاعات روی عکس' : 'نمایش اطلاعات روی عکس'}
      />

      {checking && (
        <View style={styles.checkingOverlay} pointerEvents="none">
          <ActivityIndicator color="#fff" />
        </View>
      )}

      {/* Bottom gradient for readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.55)']}
        locations={[0.4, 0.65, 1]}
        style={[StyleSheet.absoluteFill, { opacity: widgetsVisible ? 1 : 0 }]}
        pointerEvents="none"
      />

      {/* LIKE / NOPE swipe indicators */}
      <View style={styles.swipeHintRow} pointerEvents="none">
        <Animated.View style={[styles.swipeHintBadge, styles.likeHintBadge, likeOpacity]}>
          <Heart size={20} color="#fff" fill="#fff" strokeWidth={0} />
          <Text style={styles.likeHintTxt}>پسند</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeHintBadge, styles.passHintBadge, nopeOpacity]}>
          <X size={20} color="#fff" strokeWidth={3} />
          <Text style={styles.passHintTxt}>رد</Text>
        </Animated.View>
      </View>

      {/* Compat pill — top left */}
      {widgetsVisible && profile.compatibility_score != null && (
        <View style={styles.compatPill}>
          <Sparkles size={12} color={Colors.purple} strokeWidth={2} />
          <Text style={styles.compatTxt}>{toPersianDigits(profile.compatibility_score)}٪</Text>
        </View>
      )}

      {/* Badges — top right */}
      {widgetsVisible && profile.badges.length > 0 && (
        <View style={styles.cardBadgesTop}>
          {profile.badges.slice(0, 1).map(b => (
            <Badge key={b.id} kind={badgeKind(b.slug)} label="" />
          ))}
        </View>
      )}

      {/* Glass info card — bottom */}
      <View style={[styles.glassCard, { opacity: widgetsVisible ? 1 : 0 }]} pointerEvents={widgetsVisible ? 'auto' : 'none'}>
        {/* Name row */}
        <View style={styles.cardNameRow}>
          <TouchableOpacity
            onPress={() => {
              profileCache.set(profile);
              router.push(`/user/${profile.id}` as never);
            }}
            activeOpacity={0.8}
            style={styles.cardNamePressable}
          >
            <Text style={styles.cardName}>
              {profile.first_name}، {age == null ? '—' : toPersianDigits(age)}
            </Text>
            <ShieldCheck size={15} color={Colors.trust} strokeWidth={2} />
          </TouchableOpacity>
          {/* Like toggle pill */}
          <TouchableOpacity
            onPress={onLike}
            style={[styles.likeCountPill, liked && styles.likeCountPillActive]}
            activeOpacity={0.8}
          >
            <Heart
              size={13}
              color={liked ? Colors.onAccent : Colors.accent}
              fill={liked ? Colors.onAccent : 'none'}
              strokeWidth={2.4}
            />
            {profile.likes_count > 0 && (
              <Text style={[styles.likeCountTxt, liked && styles.likeCountTxtActive]}>
                {toPersianDigits(profile.likes_count)}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Location · goal */}
        {(profile.city || profile.relationship_goal) && (
          <View style={styles.cardMeta}>
            {profile.city && <Text style={styles.cardMetaTxt}>📍 {profile.city}</Text>}
            {profile.relationship_goal && (
              <Text style={[styles.cardMetaTxt, { color: Colors.accent, fontFamily: Fonts.bold }]}>
                {' '}· {profile.relationship_goal.title}
              </Text>
            )}
          </View>
        )}

        {/* Tags */}
        {profile.lifestyle_tags.length > 0 && (
          <View style={styles.tagRow}>
            {profile.lifestyle_tags.slice(0, 3).map(t => (
              <View key={t.id} style={styles.tagPill}>
                <Text style={styles.tagTxt}>{t.title}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ── SwipeGuide (fade in/out tutorial shown when the screen opens) ───────────
function SwipeGuide() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 });
    }, 2200);
    return () => clearTimeout(timer);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.guideOverlay, style]} pointerEvents="none">
      <View style={styles.guideCard}>
        <View style={[styles.guideIconWrap, { backgroundColor: Colors.ok }]}>
          <Heart size={20} color="#fff" fill="#fff" strokeWidth={0} />
        </View>
        <Text style={styles.guideTxt}>{'بکش راست\nپسندیدن'}</Text>
      </View>
      <View style={styles.guideCard}>
        <View style={[styles.guideIconWrap, { backgroundColor: Colors.danger }]}>
          <X size={20} color="#fff" strokeWidth={2.5} />
        </View>
        <Text style={styles.guideTxt}>{'بکش چپ\nرد کردن'}</Text>
      </View>
    </Animated.View>
  );
}

// ── SwipeView ─────────────────────────────────────────────────────────────────
function SwipeView({
  profiles,
  loading,
  token,
  swipeMeta,
  error,
  filtered,
  onFilters,
  onInteract,
  onExhausted,
  onProfileUpdate,
}: {
  profiles: DiscoverProfile[];
  loading: boolean;
  token: string;
  swipeMeta: SwipePoolMeta | null;
  error: string | null;
  filtered: boolean;
  onFilters: () => void;
  onInteract: (userId: number, type: 'like' | 'pass' | 'swipe_like' | 'swipe_pass') => Promise<boolean>;
  onExhausted: () => void;
  onProfileUpdate: (userId: number, patch: Partial<DiscoverProfile>) => void;
}) {
  const { bottom } = useSafeAreaInsets();
  // tab bar: height 68 + bottom: insets.bottom + 8 (from _layout.tsx)
  const tabBarSpace = bottom + 8 + 68;
  const { height } = useWindowDimensions();
  const compact = height < 650;
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [giftTarget, setGiftTarget] = useState<DiscoverProfile | null>(null);
  const [chatTarget, setChatTarget] = useState<DiscoverProfile | null>(null);
  const refilledRef = useRef(false);
  const profileIdsSignature = profiles.map(profile => profile.id).join(',');

  useEffect(() => {
    setIndex(0);
    setLiked(false);
    refilledRef.current = false;
  }, [profileIdsSignature]);

  const current = profiles[index];

  // Local batch is only a page of the pool — once it's swiped through, pull the next
  // page instead of showing "nothing left" while the daily quota still has room.
  useEffect(() => {
    if (!current && profiles.length > 0 && !refilledRef.current && !loading) {
      refilledRef.current = true;
      onExhausted();
    }
  }, [current, profiles, loading, onExhausted]);

  useEffect(() => {
    setLiked(current?.liked_by_me ?? false);
  }, [index, current]);

  const handleCardInteract = (type: 'swipe_like' | 'swipe_pass') => {
    if (!current) return Promise.resolve(false);
    return onInteract(current.id, type);
  };

  const handleSwiped = () => setIndex(i => i + 1);

  const handleLike = async () => {
    if (!current) return;
    const previousLiked = liked;
    const previousCount = current.likes_count ?? 0;
    const optimisticLiked = !previousLiked;
    const optimisticCount = Math.max(0, previousCount + (optimisticLiked ? 1 : -1));

    setLiked(optimisticLiked);
    onProfileUpdate(current.id, { liked_by_me: optimisticLiked, likes_count: optimisticCount });

    const ok = await onInteract(current.id, 'like');
    if (!ok) {
      setLiked(previousLiked);
      onProfileUpdate(current.id, { liked_by_me: previousLiked, likes_count: previousCount });
    }
  };

  if (loading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return <View style={styles.fullCenter}>
      <Text accessibilityLiveRegion="polite" style={styles.emptySubDark}>{error}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onExhausted} style={styles.filterButton}>
        <Text style={styles.filterButtonText}>تلاش مجدد</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={onFilters} style={styles.filterButton}>
        <Text style={styles.filterButtonText}>اصلاح یا حذف فیلترها</Text>
      </TouchableOpacity>
    </View>;
  }

  if (!current) {
    const limitReached = swipeMeta != null && !swipeMeta.available;
    const unlocksAtLabel = swipeMeta?.unlocks_at ? formatUnlockLabel(swipeMeta.unlocks_at) : null;
    return (
      <LinearGradient
        colors={[Colors.purpleSoft, Colors.accentSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fullCenter}
      >
        {limitReached ? (
          <View style={styles.emptyIconWrap}>
            <Clock size={34} color={Colors.purple} strokeWidth={1.6} />
          </View>
        ) : (
          <Text style={styles.emptyEmoji}>🌸</Text>
        )}
        <Text style={styles.emptyTxtDark}>
          {limitReached ? 'سقف کشف امروزت تمام شد' : filtered ? 'فردی مطابق فیلترها پیدا نشد' : 'کشف جدیدی نیست'}
        </Text>
        <Text style={styles.emptySubDark}>
          {limitReached
            ? unlocksAtLabel
              ? `${unlocksAtLabel} دوباره باز می‌شود`
              : 'فردا دوباره سر بزن یا با ارتقای اشتراک بیشتر کشف کن'
            : filtered ? 'فیلترها را تغییر بده یا حذف کن؛ شرایط انتخابی خودکار گسترده نمی‌شوند.' : 'بعداً دوباره بیا'}
        </Text>
        {!limitReached && <TouchableOpacity accessibilityRole="button" onPress={onFilters} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>اصلاح یا حذف فیلترها</Text>
        </TouchableOpacity>}
      </LinearGradient>
    );
  }

  return (
    <ScrollView
      style={styles.swipeContainer}
      contentContainerStyle={{ flexGrow: 1, minHeight: compact ? 520 : undefined }}
      scrollEnabled={compact || Platform.OS === 'web'}
      showsVerticalScrollIndicator={false}
    >
      {/* Card area */}
      <View style={styles.cardContainer}>
        {/* Next card peek */}
        {profiles[index + 1] && (
          <View style={[styles.card, styles.cardBehind]} pointerEvents="none">
            {profiles[index + 1].profile_photo?.urls.large ? (
              <Image
                source={{ uri: profiles[index + 1].profile_photo!.urls.large }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.cardPh]} />
            )}
          </View>
        )}

        <SwipeCard
          key={current.id}
          profile={current}
          liked={liked}
          onInteract={handleCardInteract}
          onSwiped={handleSwiped}
          onLike={handleLike}
        />

        <SwipeGuide />
      </View>

      {/* Action buttons — below card, per design */}
      <View style={[styles.actionsRow, { paddingBottom: tabBarSpace + 8 }]}>
        <TouchableOpacity
          style={styles.actionGift}
          onPress={() => setGiftTarget(current)}
          activeOpacity={0.8}
        >
          <Gift size={22} color={Colors.goldDeep} strokeWidth={2} />
        </TouchableOpacity>

        <LikeButton onPress={handleLike} liked={liked} />

        <TouchableOpacity
          style={styles.actionChat}
          onPress={() => setChatTarget(current)}
          activeOpacity={0.8}
        >
          <MessageCircle size={22} color={Colors.trust} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {giftTarget && (
        <GiftModal
          visible
          userId={giftTarget.id}
          firstName={giftTarget.first_name}
          token={token}
          onClose={() => setGiftTarget(null)}
        />
      )}
      {chatTarget && (
        <TemplateMessageModal
          visible
          userId={chatTarget.id}
          firstName={chatTarget.first_name}
          token={token}
          onClose={() => setChatTarget(null)}
          onSent={() => setChatTarget(null)}
        />
      )}
    </ScrollView>
  );
}

// ── DailyView ────────────────────────────────────────────────────────────────
function DailyView({ profiles, loading, meta, error, restricted, onRetry, onReject }: {
  profiles: DailySuggestionProfile[];
  loading: boolean;
  meta: DailySuggestionsMeta | null;
  error: string | null;
  restricted: boolean;
  onRetry: () => void;
  onReject: (id: number) => Promise<boolean>;
}) {
  const { bottom } = useSafeAreaInsets();
  const [rejecting, setRejecting] = useState<number | null>(null);
  const rejectingRef = useRef(false);
  const pending = dailyIsPending(meta);
  const reject = async (id: number) => {
    if (rejectingRef.current) return;
    rejectingRef.current = true;
    setRejecting(id);
    try { await onReject(id); } finally { rejectingRef.current = false; setRejecting(null); }
  };
  if (loading && profiles.length === 0 && !pending)
    return (
      <View style={styles.listCenter}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  return (
    <ScrollView
      contentContainerStyle={[styles.dailyContent, { paddingBottom: bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {restricted ? (
        <View style={styles.listCenter}>
          <ShieldCheck size={32} color={Colors.muted} />
          <Text style={styles.emptyTxtDark}>در حال حاضر دسترسی به پیشنهادها برای این حساب محدود است.</Text>
          <TouchableOpacity style={styles.dailyRetry} onPress={onRetry} disabled={loading} accessibilityRole="button">
            <Text style={styles.dailyRetryTxt}>بررسی دوباره</Text>
          </TouchableOpacity>
        </View>
      ) : error ? (
        <View style={styles.dailyStatus} accessibilityLiveRegion="polite">
          <Text style={styles.emptyTxtDark}>{error}</Text>
          <TouchableOpacity style={styles.dailyRetry} onPress={onRetry} disabled={loading} accessibilityRole="button">
            <Text style={styles.dailyRetryTxt}>تلاش مجدد</Text>
          </TouchableOpacity>
        </View>
      ) : pending ? (
        <View style={styles.dailyStatus} accessibilityLiveRegion="polite">
          {loading && <ActivityIndicator color={Colors.accent} />}
          <Text style={styles.emptyTxtDark}>پیشنهادهای امروز در حال آماده‌سازی است</Text>
          <TouchableOpacity style={styles.dailyRetry} onPress={onRetry} disabled={loading} accessibilityRole="button">
            <Text style={styles.dailyRetryTxt}>بررسی وضعیت</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {meta != null && profiles.length > 0 && (
        <Text style={styles.dailyMetaTxt}>
          {toPersianDigits(profiles.length)} پیشنهاد از سقف {toPersianDigits(meta.limit ?? meta.daily_limit)} پیشنهاد امروز
        </Text>
      )}
      {!restricted && meta?.status === 'ready_partial' && profiles.length > 0 && (
        <Text style={styles.dailyMetaTxt}>امروز افراد مناسب کمتری پیدا شدند؛ پیشنهادهای موجود آماده‌اند.</Text>
      )}
      {!restricted && profiles.map(p => (
        <View key={p.id}>
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`مشاهده پروفایل ${p.first_name}`}
          onPress={() => {
            profileCache.set(p);
            router.push(`/user/${p.id}` as never);
          }}
        >
          <Card style={styles.dailyCard}>
            <View style={styles.dailyRow}>
              <View style={styles.dailyAvatar}>
                {p.profile_photo?.urls.medium ? (
                  <Image
                    source={{ uri: p.profile_photo.urls.medium }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <User size={36} color="rgba(150,140,170,0.6)" strokeWidth={1.3} />
                )}
              </View>
              <View style={styles.dailyInfo}>
                <View style={styles.dailyNameRow}>
                  <Text style={styles.dailyName}>
                    {p.first_name}، {p.age ?? '—'}
                  </Text>
                  {p.likes_count > 0 && (
                    <View style={styles.dailyLikePill}>
                      <Heart size={11} color={Colors.accent} fill={Colors.accent} strokeWidth={0} />
                      <Text style={styles.dailyLikeTxt}>{toPersianDigits(p.likes_count)}</Text>
                    </View>
                  )}
                </View>
                {p.city && <Text style={styles.dailyCity}>{p.city}</Text>}
                {p.relationship_goal && (
                  <View style={styles.dailyGoal}>
                    <Text style={styles.dailyGoalTxt}>{p.relationship_goal.title}</Text>
                  </View>
                )}
                <View style={styles.tagRow}>
                  {p.lifestyle_tags.slice(0, 3).map(t => (
                    <Chip key={t.id} small>
                      {t.title}
                    </Chip>
                  ))}
                </View>
              </View>
            </View>
            <CompatibilitySummary compatibility={p.compatibility} fallbackReason={dailyReason(p)} />
          </Card>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dailyReject}
          onPress={() => { void reject(p.id); }}
          disabled={rejecting !== null}
          accessibilityRole="button"
          accessibilityLabel={`رد پیشنهاد ${p.first_name}`}
        >
          {rejecting === p.id ? <ActivityIndicator size="small" color={Colors.muted} /> : <X size={16} color={Colors.muted} />}
          <Text style={styles.dailyRejectTxt}>رد پیشنهاد</Text>
        </TouchableOpacity>
        </View>
      ))}
      {!restricted && !pending && !error && profiles.length === 0 && (
        <View style={styles.listCenter}>
          <Text style={styles.emptyTxtDark}>امروز فرد مناسبی برای پیشنهاد پیدا نشد.</Text>
          <Text style={styles.dailyMetaTxt}>پیشنهادهای جدید روز بعد آماده می‌شوند.</Text>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ── AiView ───────────────────────────────────────────────────────────────────
// The whole smart-match assistant is still in development — show a plain
// "coming soon" state for every user instead of gating it behind a gold
// upgrade prompt (it isn't actually available to anyone yet).
function AiView() {
  return (
    <View style={styles.listCenter}>
      <Sparkles size={52} color={Colors.purple} strokeWidth={1.3} />
      <Text style={styles.aiTitle}>دستیار مچ هوشمند</Text>
      <Text style={styles.aiSub}>به زودی</Text>
    </View>
  );
}

// ── FloatingHeader ────────────────────────────────────────────────────────────
function FloatingHeader({
  mode,
  onModeChange,
  safeMode,
  onToggleSafe,
  hasUnread,
  onFilters,
  activeFilters,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  safeMode: boolean;
  onToggleSafe: () => void;
  hasUnread: boolean;
  onFilters: () => void;
  activeFilters: number;
}) {
  return (
    <View style={styles.floatingHeader}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>کشف</Text>
        <View style={styles.headerActions}>
          {mode === 'swipe' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`فیلترهای کشف${activeFilters ? `، ${toPersianDigits(activeFilters)} فیلتر فعال` : ''}`}
            style={[styles.iconBtn, styles.filterIcon, activeFilters > 0 && styles.iconBtnSafe]} onPress={onFilters}>
            <SlidersHorizontal size={19} color={activeFilters ? Colors.accent : Colors.ink} />
            {activeFilters > 0 && <Text style={styles.filterButtonText}>{toPersianDigits(activeFilters)}</Text>}
          </TouchableOpacity>}
          <TouchableOpacity
            style={[styles.iconBtn, safeMode && styles.iconBtnSafe]}
            onPress={onToggleSafe}
          >
            <ShieldCheck size={17} color={safeMode ? Colors.ok : Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/search' as never)}>
            <Search size={17} color={Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications' as never)}>
            <View>
              <Bell size={17} color={Colors.ink} strokeWidth={2} />
              {hasUnread && <View style={styles.notifDot} />}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {safeMode && (
        <View style={styles.safeBanner}>
          <ShieldCheck size={13} color={Colors.ok} strokeWidth={2} />
          <Text style={styles.safeBannerTxt}>حالت امن فعال — فقط کاربران تأییدشده</Text>
        </View>
      )}

      <SegmentedTabs
        items={MODES}
        value={mode}
        onChange={onModeChange}
        scrollable
        style={styles.modeTabs}
      />
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const [mode, setMode] = useState<Mode>('swipe');
  const { session, user } = useAuth();
  const [safeMode, setSafeMode] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const viewerId = session?.userId ?? user?.id;
  const { profiles, meta: swipeMeta, loading, error: swipeError, selection, entitled, tier, filtersActive,
    refresh: fetchProfiles, patchProfile: patchSwipeProfile, rememberSwipe } = useSwipeProfiles(session?.accessToken, viewerId, mode === 'swipe', safeMode);
  const {
    profiles: daily, meta: dailyMeta, loading: dailyLoading, error: dailyError, restricted: dailyRestricted,
    refresh: fetchDaily, patchProfile: patchDailyProfile, removeProfile: removeDailyProfile,
  } = useDailySuggestions(session?.accessToken, mode === 'daily', user?.id ?? session?.userId);

  const fetchUnread = useCallback(() => {
    if (!session?.accessToken) return;
    notificationsApi.list(session.accessToken, 1, true)
      .then(response => setHasUnread(response.data.some(notification =>
        !notification.read_at && !isGroupMessageNotification(notification),
      )))
      .catch(() => {});
  }, [session?.accessToken]);

  useFocusEffect(useCallback(() => { fetchUnread(); }, [fetchUnread]));

  const handleExhausted = fetchProfiles;

  const updateProfile = useCallback((userId: number, patch: Partial<DiscoverProfile>) => {
    profileCache.patch(userId, patch);
    patchSwipeProfile(userId, patch);
    patchDailyProfile(userId, patch);
  }, [patchDailyProfile, patchSwipeProfile]);

  const [matchInfo, setMatchInfo] = useState<{ user: MutualUser; message?: string | null } | null>(null);

  const handleInteract = async (
    userId: number,
    type: 'like' | 'pass' | 'reject' | 'swipe_like' | 'swipe_pass',
  ): Promise<boolean> => {
    if (!session) return false;
    try {
      const res = await discoverApi.interact(session.accessToken, userId, type);
      if (type === 'like') {
        updateProfile(userId, {
          liked_by_me: !!res.data?.liked_by_me,
          likes_count: res.data?.likes_count ?? 0,
        });
      }
      if (type === 'swipe_like' && res.data?.sent_by_me) {
        updateProfile(userId, { anonymous_interest: {
          sent_by_me: true, is_mutual: !!res.data.mutual, can_remove: true,
        } });
      }
      if (res.data?.mutual && res.data.mutual_user) {
        setMatchInfo({ user: res.data.mutual_user, message: res.data.mutual_message });
      }
      if (type === 'swipe_like' || type === 'swipe_pass') {
        rememberSwipe(userId);
      }
      if (type === 'reject') removeDailyProfile(userId);
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? 'خطا در ثبت واکنش');
      return false;
    }
  };

  const toggleSafe = () => {
    setSafeMode(previous => !previous);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <FloatingHeader
        mode={mode}
        onModeChange={setMode}
        safeMode={safeMode}
        onToggleSafe={toggleSafe}
        hasUnread={hasUnread}
        onFilters={() => setFiltersOpen(true)}
        activeFilters={entitled ? filterCount(selection, tier) : 0}
      />
      <View style={styles.content}>
        {mode === 'swipe' && (
          <SwipeView
            profiles={profiles}
            loading={loading}
            token={session?.accessToken ?? ''}
          swipeMeta={swipeMeta}
          error={swipeError}
          filtered={filtersActive}
          onFilters={() => setFiltersOpen(true)}
          onInteract={handleInteract}
          onExhausted={handleExhausted}
          onProfileUpdate={updateProfile}
        />
        )}
        {mode === 'daily' && <DailyView
          profiles={daily} loading={dailyLoading} meta={dailyMeta}
          error={dailyError} restricted={dailyRestricted} onRetry={fetchDaily}
          onReject={id => handleInteract(id, 'reject')}
        />}
        {mode === 'ai' && <AiView />}
      </View>

      {filtersOpen && viewerId != null && <DiscoveryFiltersSheet key={`${viewerId}:${session?.accessToken}`}
        token={session?.accessToken ?? ''} selection={selection} allowed={entitled} gold={entitled && tier === 'gold'}
        onClose={() => setFiltersOpen(false)}
        onApply={value => { discoveryFilterSession.apply(viewerId, value); setFiltersOpen(false); }}
        onReset={() => { discoveryFilterSession.reset(viewerId); setFiltersOpen(false); }} />}

      <MatchCelebrationModal
        visible={!!matchInfo}
        otherName={matchInfo?.user.first_name ?? ''}
        otherAvatarUrl={matchInfo?.user.profile_photo?.urls?.medium ?? null}
        message={matchInfo?.message}
        onClose={() => setMatchInfo(null)}
        onStartChat={() => {
          const u = matchInfo?.user;
          setMatchInfo(null);
          if (u) router.push({ pathname: '/user/[id]', params: { id: String(u.id) } } as never);
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1 },
  filterIcon: { minWidth: 44, minHeight: 44, width: 'auto', paddingHorizontal: 10, flexDirection: 'row', gap: 4 },
  filterButton: { minHeight: 44, padding: 12, marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: Colors.accent, justifyContent: 'center' },
  filterButtonText: { fontFamily: Fonts.bold, color: Colors.accent, fontSize: 13, textAlign: 'center' },

  // ── Floating header ─────────────────────────────────────────────────────────
  floatingHeader: { backgroundColor: Colors.bg, paddingTop: Spacing.lg, gap: 2 },
  headerRow: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(16,19,26,0.88)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnSafe: { backgroundColor: Colors.okSoft },
  notifDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0)',
  },
  safeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16,
    backgroundColor: Colors.okSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  safeBannerTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ok },
  modeTabs: { marginHorizontal: Spacing.lg, marginBottom: 6 },

  // ── Swipe layout ────────────────────────────────────────────────────────────
  swipeContainer: { flex: 1 },
  cardContainer: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },
  cardBehind: {
    transform: [{ scale: 0.96 }],
    opacity: 0.65,
    top: 6,
  },
  cardPh: { backgroundColor: Colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  checkingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 5,
  },
  cardPhInitial: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardPhInitialTxt: { fontSize: 96, fontFamily: Fonts.extraBold, color: 'rgba(255,255,255,0.9)' },

  // Compat pill — top left (per design: top: 14)
  compatPill: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,19,26,0.76)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.line,
  },
  compatTxt: { fontSize: 13, fontFamily: Fonts.extraBold, color: Colors.purple },

  // Badges — top right (per design: top: 14)
  cardBadgesTop: {
    position: 'absolute', top: 14, right: 14, flexDirection: 'row', gap: 6,
  },

  // Glass info card — bottom (per design: bottom: 12, left: 12, right: 12)
  glassCard: {
    position: 'absolute',
    bottom: 12, left: 12, right: 12,
    backgroundColor: 'rgba(16,19,26,0.78)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 14,
  },
  cardNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  cardNamePressable: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1,
  },
  cardName: {
    fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink,
  },
  likeCountPill: {
    height: 34, borderRadius: 17,
    paddingHorizontal: 10,
    backgroundColor: Colors.accentSoft,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(217,79,112,0.2)',
  },
  likeCountPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  likeCountTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.accent },
  likeCountTxtActive: { color: Colors.onAccent },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  cardMetaTxt: { fontSize: 12.5, color: Colors.inkSoft, fontFamily: Fonts.regular },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagPill: {
    backgroundColor: 'rgba(36,33,42,0.06)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(36,33,42,0.08)',
  },
  tagTxt: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.inkSoft },

  // ── Action buttons row — below card (per design) ──────────────────────────
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  // Gift — warm yellow bg (warnSoft), size 52
  actionGift: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.warnSoft,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.goldDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 12,
    elevation: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  // Like — soft accent, size 64 (handled by LikeButton)
  actionLike: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
    borderWidth: 1.5, borderColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },

  actionLikeIcon: {
    zIndex: 1
  },
  // Chat — trust blue bg (trustSoft), size 52
  actionChat: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.trustSoft,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.trust,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 12,
    elevation: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },

  // ── Swipe hint overlays ─────────────────────────────────────────────────────
  swipeHintRow: {
    position: 'absolute', top: '38%', left: 0, right: 0,
    alignItems: 'center',
  },
  swipeHintBadge: {
    position: 'absolute',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 8,
  },
  likeHintBadge: { backgroundColor: Colors.ok, transform: [{ rotate: '-10deg' }] },
  passHintBadge: { backgroundColor: Colors.danger, transform: [{ rotate: '10deg' }] },
  likeHintTxt: { fontSize: 19, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: 1.5 },
  passHintTxt: { fontSize: 19, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: 1.5 },

  // ── Swipe tutorial guide (shown once on open) ──────────────────────────────
  guideOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22,
    zIndex: 10,
  },
  guideCard: {
    alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  guideIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  guideTxt: {
    fontSize: 11.5, fontFamily: Fonts.bold, color: '#fff',
    textAlign: 'center', lineHeight: 16,
  },

  // ── States ──────────────────────────────────────────────────────────────────
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTxtDark: { fontSize: 16, color: Colors.ink, fontFamily: Fonts.bold, marginTop: 4 },
  emptySubDark: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular },

  // ── Daily ──────────────────────────────────────────────────────────────────
  listCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  dailyContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 100 },
  dailyCard: { padding: 12 },
  dailyRow: { flexDirection: 'row', gap: 12 },
  dailyAvatar: {
    width: 78, height: 98, borderRadius: 16,
    backgroundColor: Colors.ph2, alignItems: 'center', justifyContent: 'center',
  },
  dailyCompat: {
    position: 'absolute', bottom: 5, alignSelf: 'center',
    backgroundColor: 'rgba(16,19,26,0.9)',
    borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  dailyCompatTxt: { fontFamily: Fonts.extraBold, fontSize: 10, color: Colors.purple },
  dailyInfo: { flex: 1 },
  dailyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  dailyLikePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accentSoft, borderRadius: 999,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  dailyLikeTxt: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.accent },
  dailyCity: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },
  dailyGoal: {
    backgroundColor: Colors.accentSoft, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start',
  },
  dailyGoalTxt: { fontSize: 10.5, color: Colors.accent, fontFamily: Fonts.bold },
  dailyReason: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 21, marginTop: 5 },
  dailyStatus: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  dailyRetry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  dailyRetryTxt: { fontFamily: Fonts.bold, color: Colors.accent, fontSize: 13 },
  dailyReject: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  dailyRejectTxt: { fontFamily: Fonts.regular, color: Colors.muted, fontSize: 12 },

  // ── AI ─────────────────────────────────────────────────────────────────────
  aiTitle: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.ink, marginTop: 16 },
  aiSub: {
    fontSize: 12.5, color: Colors.muted, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: 6, lineHeight: 20,
  },
  dailyMetaTxt: {
    fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.muted,
    textAlign: 'center', marginBottom: 10,
  },
});
