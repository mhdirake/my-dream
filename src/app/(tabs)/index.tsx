import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { GiftModal } from '@/components/GiftModal';
import { TemplateMessageModal } from '@/components/TemplateMessageModal';
import { Colors, Fonts } from '@/constants/colors';
import { DiscoverProfile, discoverApi } from '@/lib/api/discover';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileCache } from '@/lib/cache/profileCache';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Bell, Gift, Heart, MessageCircle,
  Search, ShieldCheck, Sparkles, User,
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
import { useCallback, useEffect, useState } from 'react';
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
  onSwipeLeft,
  onSwipeRight,
  onLike,
}: {
  profile: DiscoverProfile;
  liked: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onLike: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const age = calcAge(profile.birth_date);
  const photoUrl = profile.profile_photo?.urls.large;

  const pan = Gesture.Pan()
    .minDistance(10)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        const cb = dir > 0 ? onSwipeRight : onSwipeLeft;
        translateX.value = withTiming(dir * SW * 1.5, { duration: 260 }, () => runOnJS(cb)());
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

      {/* Bottom gradient for readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.55)']}
        locations={[0.4, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* LIKE / NOPE swipe indicators */}
      <Animated.View style={[styles.swipeHint, styles.likeHint, likeOpacity]}>
        <Text style={styles.likeHintTxt}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeHint, styles.passHint, nopeOpacity]}>
        <Text style={styles.passHintTxt}>NOPE</Text>
      </Animated.View>

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

// ── SwipeView ─────────────────────────────────────────────────────────────────
function SwipeView({
  profiles,
  loading,
  token,
  onInteract,
}: {
  profiles: DiscoverProfile[];
  loading: boolean;
  token: string;
  onInteract: (userId: number, type: 'like' | 'pass') => void;
}) {
  const { bottom } = useSafeAreaInsets();
  // tab bar: height 68 + bottom: insets.bottom + 8 (from _layout.tsx)
  const tabBarSpace = bottom + 8 + 68;
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [giftTarget, setGiftTarget] = useState<DiscoverProfile | null>(null);
  const [chatTarget, setChatTarget] = useState<DiscoverProfile | null>(null);

  useEffect(() => {
    setIndex(0);
    setLiked(false);
  }, [profiles]);

  const current = profiles[index];

  useEffect(() => {
    setLiked(current?.liked_by_me ?? false);
  }, [index, current]);

  const handleSwipeLeft = () => {
    if (!current) return;
    onInteract(current.id, 'pass');
    setIndex(i => i + 1);
  };

  const handleSwipeRight = () => {
    if (!current) return;
    onInteract(current.id, 'like');
    setIndex(i => i + 1);
  };

  const handleLike = () => {
    if (!current) return;
    if (!liked) onInteract(current.id, 'like');
    setLiked(l => !l);
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
    return (
      <LinearGradient
        colors={[Colors.purpleSoft, Colors.accentSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fullCenter}
      >
        <Text style={styles.emptyEmoji}>🌸</Text>
        <Text style={styles.emptyTxtDark}>کشف جدیدی نیست</Text>
        <Text style={styles.emptySubDark}>بعداً دوباره بیا</Text>
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
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onLike={handleLike}
        />
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
function DailyView({ profiles, loading }: { profiles: DiscoverProfile[]; loading: boolean }) {
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
function AiView() {
  return (
    <View style={styles.listCenter}>
      <Sparkles size={52} color={Colors.purple} strokeWidth={1.3} />
      <Text style={styles.aiTitle}>AI Match Assistant</Text>
      <Text style={styles.aiSub}>این قابلیت فقط برای کاربران Gold فعال است</Text>
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
          <Text style={styles.goldBtnTxt}>ارتقا به Gold</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ── FloatingHeader ────────────────────────────────────────────────────────────
function FloatingHeader({
  mode,
  onModeChange,
  safeMode,
  onToggleSafe,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  safeMode: boolean;
  onToggleSafe: () => void;
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
          <TouchableOpacity style={styles.iconBtn}>
            <Search size={17} color={Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <View>
              <Bell size={17} color={Colors.ink} strokeWidth={2} />
              <View style={styles.notifDot} />
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
  const [loading, setLoading] = useState(true);
  const [safeMode, setSafeMode] = useState(false);

  const fetchProfiles = useCallback(
    (safe: boolean) => {
      if (!session) return;
      setLoading(true);
      discoverApi
        .getProfiles(session.accessToken, 15, safe)
        .then(data => {
          profileCache.setMany(data);
          setProfiles(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [session],
  );

  useEffect(() => {
    fetchProfiles(safeMode);
  }, [fetchProfiles]);

  const handleInteract = (userId: number, type: 'like' | 'pass') => {
    if (!session) return;
    discoverApi.interact(session.accessToken, userId, type).catch(() => {});
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
      />
      <View style={styles.content}>
        {mode === 'swipe' && (
          <SwipeView
            profiles={profiles}
            loading={loading}
            token={session?.accessToken ?? ''}
            onInteract={handleInteract}
          />
        )}
        {mode === 'daily' && <DailyView profiles={profiles} loading={loading} />}
        {mode === 'ai' && <AiView />}
      </View>
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
  swipeHint: {
    position: 'absolute', top: '35%',
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 14, borderWidth: 3,
  },
  likeHint: { left: 24, borderColor: Colors.ok, transform: [{ rotate: '-15deg' }] },
  passHint: { right: 24, borderColor: Colors.danger, transform: [{ rotate: '15deg' }] },
  likeHintTxt: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ok, letterSpacing: 2 },
  passHintTxt: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.danger, letterSpacing: 2 },

  // ── States ──────────────────────────────────────────────────────────────────
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 44 },
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
  goldBtnInner: { paddingVertical: 14, alignItems: 'center' },
  goldBtnTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
