import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { GiftModal } from '@/components/GiftModal';
import { TemplateMessageModal } from '@/components/TemplateMessageModal';
import { Colors, Fonts } from '@/constants/colors';
import { DailySuggestionProfile, DailySuggestionsMeta, DiscoverProfile, MutualUser, SwipePoolMeta, discoverApi } from '@/lib/api/discover';
import { MatchCelebrationModal } from '@/components/MatchCelebrationModal';
import { notificationsApi } from '@/lib/api/notifications';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileCache } from '@/lib/cache/profileCache';
import { formatPersianDate, formatPersianTime } from '@/lib/date/persian';
import { toast } from '@/lib/toast';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell, Clock, Gift, Heart, MessageCircle,
  Search, ShieldCheck, Sparkles, User, X,
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
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

type Mode = 'swipe' | 'daily' | 'ai';
const MODES: { id: Mode; label: string }[] = [
  { id: 'swipe', label: 'جستجو' },
  { id: 'daily', label: 'پیشنهاد روزانه' },
  { id: 'ai', label: 'مچ هوشمند' },
];

function calcAge(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

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
        <LinearGradient
          colors={Colors.gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Heart style={styles.actionLikeIcon} size={30} color="#fff" fill={liked ? '#fff' : 'none'} strokeWidth={liked ? 0 : 2} />
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
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [checking, setChecking] = useState(false);
  const age = calcAge(profile.birth_date);
  const photoUrl = profile.profile_photo?.urls.large;

  const attemptSwipe = async (dir: 1 | -1) => {
    if (checking) return;
    setChecking(true);
    const ok = await onInteract(dir > 0 ? 'swipe_like' : 'swipe_pass');
    setChecking(false);
    if (ok) {
      translateX.value = withTiming(dir * SW * 1.5, { duration: 220 }, () => runOnJS(onSwiped)());
    } else {
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }
  };

  const pan = Gesture.Pan()
    .minDistance(10)
    .enabled(!checking)
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
    <GestureDetector gesture={pan}>
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
        <LinearGradient
          colors={['#6C4AB6', '#D94F70']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.cardPhInitial}>
            <Text style={styles.cardPhInitialTxt}>{profile.first_name[0]}</Text>
          </View>
        </LinearGradient>
      )}

      {checking && (
        <View style={styles.checkingOverlay} pointerEvents="none">
          <ActivityIndicator color="#fff" />
        </View>
      )}

      {/* Bottom gradient for readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.55)']}
        locations={[0.4, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* LIKE / NOPE swipe indicators */}
      <View style={styles.swipeHintRow} pointerEvents="none">
        <Animated.View style={[styles.swipeHintBadge, styles.likeHintBadge, likeOpacity]}>
          <Heart size={20} color="#fff" fill="#fff" strokeWidth={0} />
          <Text style={styles.likeHintTxt}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeHintBadge, styles.passHintBadge, nopeOpacity]}>
          <X size={20} color="#fff" strokeWidth={3} />
          <Text style={styles.passHintTxt}>NOPE</Text>
        </Animated.View>
      </View>

      {/* Compat pill — top left */}
      {profile.compatibility_score != null && (
        <View style={styles.compatPill}>
          <Sparkles size={12} color={Colors.purple} strokeWidth={2} />
          <Text style={styles.compatTxt}>{profile.compatibility_score}٪</Text>
        </View>
      )}

      {/* Badges — top right */}
      {profile.badges.length > 0 && (
        <View style={styles.cardBadgesTop}>
          {profile.badges.slice(0, 1).map(b => (
            <Badge key={b.id} kind={badgeKind(b.slug)} label="" />
          ))}
        </View>
      )}

      {/* Glass info card — bottom */}
      <View style={styles.glassCard}>
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
              {profile.first_name}، {age}
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
              color={liked ? '#fff' : Colors.accent}
              fill={liked ? '#fff' : 'none'}
              strokeWidth={2.4}
            />
            {profile.likes_count > 0 && (
              <Text style={[styles.likeCountTxt, liked && styles.likeCountTxtActive]}>
                {profile.likes_count}
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
        <View style={[styles.guideIconWrap, { backgroundColor: Colors.danger }]}>
          <X size={20} color="#fff" strokeWidth={2.5} />
        </View>
        <Text style={styles.guideTxt}>{'بکش چپ\nرد کردن'}</Text>
      </View>
      <View style={styles.guideCard}>
        <View style={[styles.guideIconWrap, { backgroundColor: Colors.ok }]}>
          <Heart size={20} color="#fff" fill="#fff" strokeWidth={0} />
        </View>
        <Text style={styles.guideTxt}>{'بکش راست\nپسندیدن'}</Text>
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
  onInteract,
  onExhausted,
}: {
  profiles: DiscoverProfile[];
  loading: boolean;
  token: string;
  swipeMeta: SwipePoolMeta | null;
  onInteract: (userId: number, type: 'like' | 'pass' | 'swipe_like' | 'swipe_pass') => Promise<boolean>;
  onExhausted: () => void;
}) {
  const { bottom } = useSafeAreaInsets();
  // tab bar: height 68 + bottom: insets.bottom + 8 (from _layout.tsx)
  const tabBarSpace = bottom + 8 + 68;
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [giftTarget, setGiftTarget] = useState<DiscoverProfile | null>(null);
  const [chatTarget, setChatTarget] = useState<DiscoverProfile | null>(null);
  const refilledRef = useRef(false);

  useEffect(() => {
    setIndex(0);
    setLiked(false);
    refilledRef.current = false;
  }, [profiles]);

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
    if (!current || liked) {
      setLiked(l => !l);
      return;
    }
    const ok = await onInteract(current.id, 'like');
    if (ok) setLiked(true);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[Colors.purpleSoft, Colors.accentSoft]}
        style={styles.fullCenter}
      >
        <ActivityIndicator color={Colors.accent} size="large" />
      </LinearGradient>
    );
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
          {limitReached ? 'سقف کشف امروزت تمام شد' : 'کشف جدیدی نیست'}
        </Text>
        <Text style={styles.emptySubDark}>
          {limitReached
            ? unlocksAtLabel
              ? `${unlocksAtLabel} دوباره باز می‌شود`
              : 'فردا دوباره سر بزن یا با ارتقای اشتراک بیشتر کشف کن'
            : 'بعداً دوباره بیا'}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.swipeContainer}>
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
    </View>
  );
}

// ── DailyView ────────────────────────────────────────────────────────────────
function DailyView({ profiles, loading, meta }: { profiles: DiscoverProfile[]; loading: boolean; meta: DailySuggestionsMeta | null }) {
  if (loading)
    return (
      <View style={styles.listCenter}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  return (
    <ScrollView
      contentContainerStyle={styles.dailyContent}
      showsVerticalScrollIndicator={false}
    >
      {meta != null && profiles.length > 0 && (
        <Text style={styles.dailyMetaTxt}>
          {toPersianDigits(meta.generated_count)} پیشنهاد از {toPersianDigits(meta.daily_limit)} پیشنهاد امروز
        </Text>
      )}
      {profiles.map(p => (
        <TouchableOpacity
          key={p.id}
          activeOpacity={0.85}
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
                {p.compatibility_score != null && (
                  <View style={styles.dailyCompat}>
                    <Sparkles size={9} color={Colors.purple} strokeWidth={2} />
                    <Text style={styles.dailyCompatTxt}>{p.compatibility_score}٪</Text>
                  </View>
                )}
              </View>
              <View style={styles.dailyInfo}>
                <View style={styles.dailyNameRow}>
                  <Text style={styles.dailyName}>
                    {p.first_name}، {calcAge(p.birth_date)}
                  </Text>
                  {p.likes_count > 0 && (
                    <View style={styles.dailyLikePill}>
                      <Heart size={11} color={Colors.accent} fill={Colors.accent} strokeWidth={0} />
                      <Text style={styles.dailyLikeTxt}>{p.likes_count}</Text>
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
          </Card>
        </TouchableOpacity>
      ))}
      {profiles.length === 0 && (
        <View style={styles.listCenter}>
          <Text style={styles.emptyTxtDark}>پیشنهادی موجود نیست</Text>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ── AiView ───────────────────────────────────────────────────────────────────
function AiView({ plan, profiles, loading }: { plan: string; profiles: DailySuggestionProfile[]; loading: boolean }) {
  if (plan !== 'gold') {
    return (
      <View style={styles.listCenter}>
        <Sparkles size={52} color={Colors.purple} strokeWidth={1.3} />
        <Text style={styles.aiTitle}>دستیار مچ هوشمند</Text>
        <Text style={styles.aiSub}>این قابلیت فقط برای کاربران طلایی فعال است</Text>
        <TouchableOpacity
          style={styles.goldBtn}
          onPress={() => router.push('/subscription' as never)}
        >
          <LinearGradient
            colors={['#6C4AB6', '#D94F70']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.goldBtnInner}
          >
            <Text style={styles.goldBtnTxt}>ارتقا به طلایی</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading)
    return (
      <View style={styles.listCenter}>
        <ActivityIndicator color={Colors.purple} />
      </View>
    );

  const sorted = [...profiles].sort(
    (a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0),
  );

  return (
    <ScrollView contentContainerStyle={styles.dailyContent} showsVerticalScrollIndicator={false}>
      <View style={styles.aiHeaderRow}>
        <Sparkles size={16} color={Colors.purple} strokeWidth={2} />
        <Text style={styles.aiHeaderTxt}>مچ‌های هوشمند امروز بر اساس امتیاز سازگاری</Text>
      </View>
      {sorted.map(p => {
        const exp = p.compatibility?.explanation;
        return (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.85}
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
                      {p.first_name}، {calcAge(p.birth_date)}
                    </Text>
                    {p.compatibility_score != null && (
                      <View style={styles.aiScorePill}>
                        <Sparkles size={11} color={Colors.purple} strokeWidth={2} />
                        <Text style={styles.aiScoreTxt}>{toPersianDigits(p.compatibility_score)}٪ سازگاری</Text>
                      </View>
                    )}
                  </View>
                  {p.city && <Text style={styles.dailyCity}>{p.city}</Text>}
                  {exp != null && (
                    <View style={styles.aiExpRow}>
                      {(exp.shared_lifestyle_tags ?? 0) > 0 && (
                        <Chip small tone="purple">{toPersianDigits(exp.shared_lifestyle_tags!)} سبک زندگی مشترک</Chip>
                      )}
                      {(exp.shared_languages ?? 0) > 0 && (
                        <Chip small tone="trust">{toPersianDigits(exp.shared_languages!)} زبان مشترک</Chip>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}
      {sorted.length === 0 && (
        <View style={styles.listCenter}>
          <Text style={styles.emptyTxtDark}>هنوز مچ هوشمندی برای امروز نیست</Text>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ── FloatingHeader ────────────────────────────────────────────────────────────
function FloatingHeader({
  mode,
  onModeChange,
  safeMode,
  onToggleSafe,
  hasUnread,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  safeMode: boolean;
  onToggleSafe: () => void;
  hasUnread: boolean;
}) {
  return (
    <View style={styles.floatingHeader}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>کشف</Text>
        <View style={styles.headerActions}>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeScroll}
        style={styles.modeScrollWrap}
      >
        {MODES.map(m => {
          const on = m.id === mode;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => onModeChange(m.id)}
              style={[styles.modeBtn, on && styles.modeBtnActive]}
            >
              {m.id === 'ai' && (
                <Sparkles
                  size={12}
                  color={on ? '#fff' : Colors.purple}
                  strokeWidth={2}
                />
              )}
              <Text style={[styles.modeTxt, on && styles.modeTxtActive]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const [mode, setMode] = useState<Mode>('swipe');
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [swipeMeta, setSwipeMeta] = useState<SwipePoolMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [safeMode, setSafeMode] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [planSlug, setPlanSlug] = useState<string>('basic');
  const [daily, setDaily] = useState<DailySuggestionProfile[]>([]);
  const [dailyMeta, setDailyMeta] = useState<DailySuggestionsMeta | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyLoaded, setDailyLoaded] = useState(false);

  const fetchUnread = useCallback(() => {
    if (!session?.accessToken) return;
    notificationsApi.list(session.accessToken, 1, true)
      .then(r => setHasUnread(r.unread_count > 0))
      .catch(() => {});
  }, [session?.accessToken]);

  useFocusEffect(useCallback(() => { fetchUnread(); }, [fetchUnread]));

  const fetchProfiles = useCallback(
    (safe: boolean) => {
      if (!session) return;
      setLoading(true);
      discoverApi
        .getProfiles(session.accessToken, 15, safe)
        .then(({ data, meta }) => {
          profileCache.setMany(data);
          setProfiles(data);
          setSwipeMeta(meta);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [session],
  );

  useFocusEffect(useCallback(() => {
    fetchProfiles(safeMode);
  }, [fetchProfiles, safeMode]));

  const handleExhausted = useCallback(() => {
    fetchProfiles(safeMode);
  }, [fetchProfiles, safeMode]);

  useEffect(() => {
    if (!session?.accessToken) return;
    profileApi.getProfile(session.accessToken)
      .then(p => setPlanSlug(p.active_subscription?.plan?.slug ?? 'basic'))
      .catch(() => {});
  }, [session?.accessToken]);

  const fetchDaily = useCallback(() => {
    if (!session?.accessToken) return;
    setDailyLoading(true);
    discoverApi.getDailySuggestions(session.accessToken)
      .then(({ data, meta }) => {
        profileCache.setMany(data);
        setDaily(data);
        setDailyMeta(meta);
        setDailyLoaded(true);
      })
      .catch(() => {})
      .finally(() => setDailyLoading(false));
  }, [session?.accessToken]);

  useEffect(() => {
    if ((mode === 'daily' || mode === 'ai') && !dailyLoaded && !dailyLoading) fetchDaily();
  }, [mode, dailyLoaded, dailyLoading, fetchDaily]);

  const [matchInfo, setMatchInfo] = useState<{ user: MutualUser; message?: string | null } | null>(null);

  const handleInteract = async (
    userId: number,
    type: 'like' | 'pass' | 'swipe_like' | 'swipe_pass',
  ): Promise<boolean> => {
    if (!session) return false;
    try {
      const res = await discoverApi.interact(session.accessToken, userId, type);
      if (res.data?.mutual && res.data.mutual_user) {
        setMatchInfo({ user: res.data.mutual_user, message: res.data.mutual_message });
      }
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? 'خطا در ثبت واکنش');
      return false;
    }
  };

  const toggleSafe = () => {
    const next = !safeMode;
    setSafeMode(next);
    fetchProfiles(next);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FloatingHeader
        mode={mode}
        onModeChange={setMode}
        safeMode={safeMode}
        onToggleSafe={toggleSafe}
        hasUnread={hasUnread}
      />
      <View style={styles.content}>
        {mode === 'swipe' && (
          <SwipeView
            profiles={profiles}
            loading={loading}
            token={session?.accessToken ?? ''}
            swipeMeta={swipeMeta}
            onInteract={handleInteract}
            onExhausted={handleExhausted}
          />
        )}
        {mode === 'daily' && <DailyView profiles={daily} loading={dailyLoading} meta={dailyMeta} />}
        {mode === 'ai' && <AiView plan={planSlug} profiles={daily} loading={dailyLoading} />}
      </View>

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

  // ── Floating header ─────────────────────────────────────────────────────────
  floatingHeader: { backgroundColor: Colors.bg },
  headerRow: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
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
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: Colors.okSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  safeBannerTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ok },
  modeScrollWrap: { flexGrow: 0 },
  modeScroll: { paddingHorizontal: 16, paddingVertical: 6, gap: 7, flexDirection: 'row', alignItems: 'center' },
  modeBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(36,33,42,0.06)',
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  modeBtnActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  modeTxt: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.muted },
  modeTxtActive: { color: '#fff', fontFamily: Fonts.extraBold },

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
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
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
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
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
  likeCountTxtActive: { color: '#fff' },
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
  // Like — gradient, size 64 (handled by LikeButton)
  actionLike: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
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
    backgroundColor: 'rgba(255,255,255,0.55)',
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
    backgroundColor: 'rgba(255,255,255,0.9)',
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

  // ── AI ─────────────────────────────────────────────────────────────────────
  aiTitle: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.ink, marginTop: 16 },
  aiSub: {
    fontSize: 12.5, color: Colors.muted, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: 6, lineHeight: 20,
  },
  goldBtn: { marginTop: 24, borderRadius: 999, overflow: 'hidden', alignSelf: 'stretch' },
  dailyMetaTxt: {
    fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.muted,
    textAlign: 'center', marginBottom: 10,
  },
  aiHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: 12,
  },
  aiHeaderTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.purple },
  aiScorePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.purple + '12',
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  aiScoreTxt: { fontSize: 10.5, fontFamily: Fonts.bold, color: Colors.purple },
  aiExpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  goldBtnInner: { paddingVertical: 14, alignItems: 'center' },
  goldBtnTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
