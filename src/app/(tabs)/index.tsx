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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 90;

type Mode = 'swipe' | 'daily' | 'ai';
const MODES: { id: Mode; label: string }[] = [
  { id: 'swipe', label: 'Swipe' },
  { id: 'daily', label: 'پیشنهاد روزانه' },
  { id: 'ai', label: 'AI Match' },
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
function LikeButton({ onPress, liked }: { onPress: () => void; liked?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const down = () => Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const up = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={down} onPressOut={up}>
      <Animated.View style={[styles.actionLike, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={Colors.gradColors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Heart size={30} color="#fff" fill={liked ? '#fff' : 'none'} strokeWidth={liked ? 0 : 2} />
      </Animated.View>
    </Pressable>
  );
}

// ── SwipeCard ─────────────────────────────────────────────────────────────────
function SwipeCard({
  profile, onSwipe, onLike, onGift, onChat,
}: {
  profile: DiscoverProfile;
  onSwipe: () => void;
  onLike: () => void;
  onGift: () => void;
  onChat: () => void;
}) {
  const { bottom } = useSafeAreaInsets();
  const tabBarClear = bottom + 20 + 68 + 16;
  const [liked, setLiked] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const age = calcAge(profile.birth_date);
  const photoUrl = profile.profile_photo?.urls.large;

  const handleLike = () => {
    if (!liked) onLike();
    setLiked(l => !l);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) > SWIPE_THRESHOLD) {
          const dir = g.dy < 0 ? -1 : 1;
          Animated.timing(pan, { toValue: { x: 0, y: dir * SH * 1.5 }, duration: 280, useNativeDriver: false })
            .start(onSwipe);
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6, tension: 40 }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.card, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      {/* Photo / default avatar */}
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <LinearGradient
          colors={['#6C4AB6', '#D94F70']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.cardPhInitial}>
            <Text style={styles.cardPhInitialTxt}>{profile.first_name[0]}</Text>
          </View>
        </LinearGradient>
      )}

      {/* Bottom gradient for readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.62)']}
        locations={[0.38, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Compat pill — top left */}
      {profile.compatibility_score != null && (
        <View style={styles.compatPill}>
          <Sparkles size={11} color={Colors.purple} strokeWidth={2} />
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

      {/* Bottom overlay */}
      <View style={[styles.cardBottom, { paddingBottom: tabBarClear }]}>
        {/* Glass info card */}
        <View style={styles.glassCard}>
          {/* Name row */}
          <View style={styles.cardNameRow}>
            <TouchableOpacity
              onPress={() => { profileCache.set(profile); router.push(`/user/${profile.id}` as never); }}
              activeOpacity={0.8}
              style={styles.cardNamePressable}
            >
              <Text style={styles.cardName}>{profile.first_name}، {age}</Text>
              <ShieldCheck size={15} color={Colors.trust} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLike}
              style={[styles.likeCountPill, liked && styles.likeCountPillActive]}
              activeOpacity={0.8}
            >
              <Heart size={14} color={liked ? '#fff' : Colors.accent} fill={liked ? '#fff' : 'none'} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Location · goal */}
          {(profile.city || profile.relationship_goal) && (
            <View style={styles.cardMeta}>
              {profile.city && <Text style={styles.cardMetaTxt}>📍 {profile.city}</Text>}
              {profile.relationship_goal && (
                <Text style={[styles.cardMetaTxt, { color: Colors.accent, fontFamily: Fonts.bold }]}> · {profile.relationship_goal.title}</Text>
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

        {/* Action buttons: Gift · Like · Chat */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionGift} onPress={onGift} activeOpacity={0.75}>
            <Gift size={20} color={Colors.goldDeep} strokeWidth={2} />
          </TouchableOpacity>
          <LikeButton onPress={handleLike} liked={liked} />
          <TouchableOpacity style={styles.actionChat} onPress={onChat} activeOpacity={0.75}>
            <MessageCircle size={20} color={Colors.trust} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ── SwipeView ─────────────────────────────────────────────────────────────────
function SwipeView({ profiles, loading, token, onInteract }: {
  profiles: DiscoverProfile[];
  loading: boolean;
  token: string;
  onInteract: (userId: number, type: 'like' | 'pass') => void;
}) {
  const [index, setIndex] = useState(0);
  const [giftTarget, setGiftTarget] = useState<DiscoverProfile | null>(null);
  const [chatTarget, setChatTarget] = useState<DiscoverProfile | null>(null);

  // Reset index when profiles refresh
  useEffect(() => { setIndex(0); }, [profiles]);

  const current = profiles[index];

  if (loading) return (
    <LinearGradient
      colors={[Colors.purpleSoft, Colors.accentSoft]}
      style={styles.fullCenter}
    >
      <ActivityIndicator color={Colors.accent} size="large" />
    </LinearGradient>
  );

  if (!current) return (
    <LinearGradient
      colors={[Colors.purpleSoft, Colors.accentSoft]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.fullCenter}
    >
      <Text style={styles.emptyEmoji}>🌸</Text>
      <Text style={styles.emptyTxtDark}>کشف جدیدی نیست</Text>
      <Text style={styles.emptySubDark}>بعداً دوباره بیا</Text>
    </LinearGradient>
  );

  return (
    <>
      {/* Next card peek (behind current) */}
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

      {/* Current card */}
      <SwipeCard
        key={current.id}
        profile={current}
        onSwipe={() => { onInteract(current.id, 'pass'); setIndex(i => i + 1); }}
        onLike={() => onInteract(current.id, 'like')}
        onGift={() => setGiftTarget(current)}
        onChat={() => setChatTarget(current)}
      />

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
    </>
  );
}

// ── DailyView ────────────────────────────────────────────────────────────────
function DailyView({ profiles, loading, headerH }: { profiles: DiscoverProfile[]; loading: boolean; headerH: number }) {
  if (loading) return (
    <View style={styles.listCenter}>
      <ActivityIndicator color={Colors.accent} />
    </View>
  );
  return (
    <ScrollView
      contentContainerStyle={[styles.dailyContent, { paddingTop: headerH + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      {profiles.map(p => (
        <TouchableOpacity
          key={p.id}
          activeOpacity={0.85}
          onPress={() => { profileCache.set(p); router.push(`/user/${p.id}` as never); }}
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
                <Text style={styles.dailyName}>{p.first_name}، {calcAge(p.birth_date)}</Text>
                {p.city && <Text style={styles.dailyCity}>{p.city}</Text>}
                {p.relationship_goal && (
                  <View style={styles.dailyGoal}>
                    <Text style={styles.dailyGoalTxt}>{p.relationship_goal.title}</Text>
                  </View>
                )}
                <View style={styles.tagRow}>
                  {p.lifestyle_tags.slice(0, 3).map(t => <Chip key={t.id} small>{t.title}</Chip>)}
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
function AiView({ headerH }: { headerH: number }) {
  return (
    <View style={[styles.listCenter, { paddingTop: headerH }]}>
      <Sparkles size={52} color={Colors.purple} strokeWidth={1.3} />
      <Text style={styles.aiTitle}>AI Match Assistant</Text>
      <Text style={styles.aiSub}>این قابلیت فقط برای کاربران Gold فعال است</Text>
      <TouchableOpacity style={styles.goldBtn} onPress={() => router.push('/subscription' as never)}>
        <LinearGradient colors={['#6C4AB6', '#D94F70']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goldBtnInner}>
          <Text style={styles.goldBtnTxt}>ارتقا به Gold</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ── FloatingHeader ────────────────────────────────────────────────────────────
function FloatingHeader({
  mode, onModeChange, safeMode, onToggleSafe, swipe,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  safeMode: boolean;
  onToggleSafe: () => void;
  swipe: boolean;
}) {
  return (
    <SafeAreaView
      style={[styles.floatingHeader, swipe && styles.floatingHeaderSwipe]}
      edges={['top']}
      pointerEvents="box-none"
    >
      <View style={styles.headerRow} pointerEvents="box-none">
        <Text style={[styles.headerTitle, swipe && styles.headerTitleWhite]}>کشف</Text>
        <View style={styles.headerActions} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.iconBtn, swipe && styles.iconBtnDark, safeMode && styles.iconBtnSafe]}
            onPress={onToggleSafe}
          >
            <ShieldCheck size={17} color={safeMode ? Colors.ok : (swipe ? '#fff' : Colors.ink)} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, swipe && styles.iconBtnDark]}>
            <Search size={17} color={swipe ? '#fff' : Colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, swipe && styles.iconBtnDark]}>
            <View>
              <Bell size={17} color={swipe ? '#fff' : Colors.ink} strokeWidth={2} />
              <View style={styles.notifDot} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {safeMode && (
        <View style={styles.safeBanner} pointerEvents="none">
          <ShieldCheck size={13} color={Colors.ok} strokeWidth={2} />
          <Text style={styles.safeBannerTxt}>حالت امن فعال — فقط کاربران تأییدشده</Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeScroll}
        style={styles.modeScrollWrap}
        pointerEvents="box-none"
      >
        {MODES.map(m => {
          const on = m.id === mode;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => onModeChange(m.id)}
              style={[
                styles.modeBtn,
                on && styles.modeBtnActive,
                swipe && !on && styles.modeBtnDark,
              ]}
            >
              <Text style={[styles.modeTxt, on && styles.modeTxtActive, swipe && !on && styles.modeTxtDark]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const [mode, setMode] = useState<Mode>('swipe');
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [safeMode, setSafeMode] = useState(false);
  const insets = useSafeAreaInsets();

  // Approximate header height: safe-area top + header row (54) + mode switch (46) + safe banner (if shown, 36)
  const headerH = insets.top + 54 + 46 + (safeMode ? 36 : 0);

  const fetchProfiles = useCallback((safe: boolean) => {
    if (!session) return;
    setLoading(true);
    discoverApi.getProfiles(session.accessToken, 15, safe)
      .then(data => { profileCache.setMany(data); setProfiles(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => { fetchProfiles(safeMode); }, [fetchProfiles]);

  const handleInteract = (userId: number, type: 'like' | 'pass') => {
    if (!session) return;
    discoverApi.interact(session.accessToken, userId, type).catch(() => {});
  };

  const toggleSafe = () => {
    const next = !safeMode;
    setSafeMode(next);
    fetchProfiles(next);
  };

  const isSwipe = mode === 'swipe';

  return (
    <View style={[styles.root, isSwipe && styles.rootDark]}>
      {/* Content */}
      {isSwipe && (
        <SwipeView
          profiles={profiles}
          loading={loading}
          token={session?.accessToken ?? ''}
          onInteract={handleInteract}
        />
      )}
      {mode === 'daily' && (
        <DailyView profiles={profiles} loading={loading} headerH={headerH} />
      )}
      {mode === 'ai' && <AiView headerH={headerH} />}

      {/* Floating header — always on top */}
      <FloatingHeader
        mode={mode}
        onModeChange={setMode}
        safeMode={safeMode}
        onToggleSafe={toggleSafe}
        swipe={isSwipe}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  rootDark: { backgroundColor: '#111' },

  // ── Floating header ─────────────────────────────────────────────────────────
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 20,
  },
  floatingHeaderSwipe: {
    // no background — transparent over image
  },
  headerRow: {
    height: 54, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerTitleWhite: { color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDark: { backgroundColor: 'rgba(0,0,0,0.32)' },
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
  modeScroll: { paddingHorizontal: 16, paddingVertical: 6, gap: 7 },
  modeBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(36,33,42,0.06)',
  },
  modeBtnActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  modeBtnDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  modeTxt: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.muted },
  modeTxtActive: { color: '#fff', fontFamily: Fonts.extraBold },
  modeTxtDark: { color: 'rgba(255,255,255,0.8)' },

  // ── Card (fullscreen) ───────────────────────────────────────────────────────
  card: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  cardBehind: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
    top: 12,
  },
  cardPh: { backgroundColor: Colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  cardPhInitial: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardPhInitialTxt: { fontSize: 96, fontFamily: Fonts.extraBold, color: 'rgba(255,255,255,0.9)' },
  imageTapArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 200 },
  doubleTapHeart: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center' },

  // Swipe indicators
  swipeHint: {
    position: 'absolute', top: '35%',
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 14, borderWidth: 3,
    transform: [{ rotate: '-15deg' }],
  },
  likeHint: { left: 24, borderColor: Colors.ok },
  passHint: { right: 24, borderColor: Colors.danger, transform: [{ rotate: '15deg' }] },
  likeHintTxt: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ok, letterSpacing: 2 },
  passHintTxt: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.danger, letterSpacing: 2 },

  // Compat pill
  compatPill: {
    position: 'absolute', top: 120, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  compatTxt: { fontSize: 12, fontFamily: Fonts.extraBold, color: '#fff' },

  // Badges top-right
  cardBadgesTop: {
    position: 'absolute', top: 120, right: 16, flexDirection: 'row', gap: 6,
  },

  // Bottom overlay
  cardBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 20,
  },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },

  // Glass info card
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    padding: 14,
    marginBottom: 14,
  },
  cardNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  cardNamePressable: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1,
  },
  cardName: {
    fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.5,
  },
  likeCountPill: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(217,79,112,0.2)',
  },
  likeCountPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  cardMetaTxt: {
    fontSize: 12.5, color: Colors.inkSoft, fontFamily: Fonts.regular,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagPill: {
    backgroundColor: 'rgba(36,33,42,0.06)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(36,33,42,0.08)',
  },
  tagTxt: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.inkSoft },

  // Action buttons (on card)
  cardActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, marginBottom: 4,
  },
  actionGift: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLike: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.accent, // fallback for web if gradient fails
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
  },
  actionChat: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Counter
  counter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: 8,
  },
  counterTxt: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.semiBold },

  // States
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTxt: { fontSize: 16, color: '#fff', fontFamily: Fonts.bold, marginTop: 4 },
  emptySub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular },

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
  dailyName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  dailyCity: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },
  dailyGoal: {
    backgroundColor: Colors.accentSoft, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start',
  },
  dailyGoalTxt: { fontSize: 10.5, color: Colors.accent, fontFamily: Fonts.bold },
  emptyTxtDark: { fontSize: 16, color: Colors.ink, fontFamily: Fonts.bold, marginTop: 4 },
  emptySubDark: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular },

  // ── AI ─────────────────────────────────────────────────────────────────────
  aiTitle: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.ink, marginTop: 16 },
  aiSub: { fontSize: 12.5, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  goldBtn: { marginTop: 24, borderRadius: 999, overflow: 'hidden', alignSelf: 'stretch', marginHorizontal: 0 },
  goldBtnInner: { paddingVertical: 14, alignItems: 'center' },
  goldBtnTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
