import { GiftModal } from '@/components/GiftModal';
import { MatchCelebrationModal } from '@/components/MatchCelebrationModal';
import { TemplateMessageModal } from '@/components/TemplateMessageModal';
import { Badge } from '@/components/ui/Badge';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { blockApi, type BlockStatus } from '@/lib/api/block';
import { chatApi, type Conversation } from '@/lib/api/chat';
import { discoverApi, type MutualUser } from '@/lib/api/discover';
import { giftsApi, type SentGift } from '@/lib/api/gifts';
import { toast } from '@/lib/toast';
import { profileApi, type ClientProfile, type UserProfile } from '@/lib/api/profile';
import { profileCache } from '@/lib/cache/profileCache';
import { useAuth } from '@/lib/auth/AuthContext';
import { Image } from 'expo-image';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Briefcase,
  Eye,
  Flag,
  Gift,
  GraduationCap,
  Heart,
  Languages as LanguagesIcon,
  Lock,
  MapPin,
  MessageCircle,
  Moon,
  MoreVertical,
  Pause,
  Play,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  UserX,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcAge(birth: string) {
  return Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function badgeKind(slug: string): 'ai' | 'community' | 'gold' | 'complete' | 'personality' | 'check' {
  if (slug === 'ai_trusted' || slug === 'ai-trusted') return 'ai';
  if (slug === 'community_verified' || slug === 'community-verified') return 'community';
  if (slug === 'gold_badge' || slug === 'gold-badge') return 'gold';
  if (slug === 'complete_profile' || slug === 'complete-profile') return 'complete';
  if (slug === 'psychology_test_completed' || slug === 'psychology-test-completed') return 'personality';
  return 'check';
}

function formatVoiceDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function VoiceIntroPlayer({ uri, durationSeconds }: { uri: string; durationSeconds: number }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.currentTime >= (status.duration || durationSeconds)) player.seekTo(0);
      player.play();
    }
  };

  const remaining = status.playing || status.currentTime > 0
    ? Math.max(0, Math.ceil((status.duration || durationSeconds) - status.currentTime))
    : durationSeconds;

  return (
    <TouchableOpacity style={styles.voiceIntroRow} onPress={toggle} activeOpacity={0.8}>
      <View style={styles.voiceIntroBtn}>
        {status.playing
          ? <Pause size={16} color="#fff" fill="#fff" strokeWidth={0} />
          : <Play size={16} color="#fff" fill="#fff" strokeWidth={0} />
        }
      </View>
      <View style={styles.voiceIntroWave} />
      <Text style={styles.voiceIntroDuration}>{formatVoiceDuration(remaining)}</Text>
    </TouchableOpacity>
  );
}

const RELIGIOSITY: Record<number, string> = {
  1: 'غیرمذهبی',
  2: 'کم‌مذهب',
  3: 'متوسط',
  4: 'مذهبی',
  5: 'بسیار مذهبی',
};

const TRAIT_LABELS: Record<string, string> = {
  warmth: 'صمیمیت',
  energy: 'انرژی',
};

function computeLifestyleMatch(mine: { id: number }[], theirs: { id: number }[]) {
  if (!mine.length || !theirs.length) return null;
  const myIds = new Set(mine.map(t => t.id));
  const matched = theirs.filter(t => myIds.has(t.id)).length;
  return Math.round((matched / Math.max(theirs.length, mine.length)) * 100);
}

function religiosityDiff(mine: number | null | undefined, theirs: number | null | undefined) {
  if (mine == null || theirs == null) return null;
  const diff = Math.abs(mine - theirs);
  if (diff === 0) return 'یکسان';
  if (diff === 1) return `اختلاف ۱ سطح (نزدیک)`;
  if (diff === 2) return `اختلاف ۲ سطح (متوسط)`;
  return `اختلاف ${diff} سطح (زیاد)`;
}

// ── ProgressRing ──────────────────────────────────────────────────────────────

function ProgressRing({
  value, size = 74, stroke = 8, color = Colors.accent,
  children,
}: {
  value: number; size?: number; stroke?: number; color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - value / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.lineSoft} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ}`}
          strokeDashoffset={fill}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
}

// ── AnimatedBanner ────────────────────────────────────────────────────────────
// Abstract gradient banner with slow-floating blobs — decorative, not tied to the
// viewed user's photo (the photo already shows prominently in the avatar circle).

function AnimatedBanner() {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    loop(float1, 5200, 0);
    loop(float2, 6400, 400);
    loop(float3, 4600, 900);
  }, [float1, float2, float3]);

  const t1 = float1.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const t2 = float2.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const t3 = float3.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const s3 = float3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <LinearGradient
      colors={Colors.gradColors}
      start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      <Animated.View style={[styles.blobA, { transform: [{ translateY: t1 }] }]} />
      <Animated.View style={[styles.blobB, { transform: [{ translateY: t2 }] }]} />
      <Animated.View style={[styles.blobC, { transform: [{ translateY: t3 }, { scale: s3 }] }]} />
    </LinearGradient>
  );
}

function TraitBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.traitRow}>
      <Text style={styles.traitLabel}>{label}</Text>
      <View style={styles.traitTrack}>
        <View style={[styles.traitFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.traitValue}>{pct}</Text>
    </View>
  );
}

// ── ProfileActionsSheet ───────────────────────────────────────────────────────

function ProfileActionsSheet({
  visible, firstName, isBlocked, onClose, onGift, onGoldBadge, onAnon, onInsight, onBlock, onReport, onShare,
}: {
  visible: boolean;
  firstName: string;
  isBlocked: boolean;
  onClose: () => void;
  onGift: () => void;
  onGoldBadge: () => void;
  onAnon: () => void;
  onInsight: () => void;
  onBlock: () => void;
  onReport: () => void;
  onShare: () => void;
}) {
  const slideY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    } else {
      Animated.timing(slideY, { toValue: 500, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, slideY]);

  const rows: { icon: React.ReactNode; label: string; sub?: string; danger?: boolean; onPress: () => void }[] = [
    { icon: <Share2 size={18} color={Colors.trust} strokeWidth={2} />, label: 'اشتراک‌گذاری پروفایل', onPress: onShare },
    { icon: <Gift size={18} color={Colors.goldDeep} strokeWidth={2} />, label: 'فرستادن هدیه', sub: 'با سکه', onPress: onGift },
    { icon: <Star size={18} color={Colors.goldDeep} strokeWidth={2} />, label: 'اهدای نشان طلایی', sub: 'با سکه', onPress: onGoldBadge },
    { icon: <Eye size={18} color={Colors.purple} strokeWidth={2} />, label: 'علاقه ناشناس', onPress: onAnon },
    { icon: <Sparkles size={18} color={Colors.purple} strokeWidth={2} />, label: `AI Insight ${firstName}`, sub: '۵۰ سکه', onPress: onInsight },
    { icon: <UserX size={18} color={Colors.danger} strokeWidth={2} />, label: isBlocked ? 'رفع مسدودیت' : 'مسدود کردن', danger: true, onPress: onBlock },
    { icon: <Flag size={18} color={Colors.danger} strokeWidth={2} />, label: 'گزارش', danger: true, onPress: onReport },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetContainer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{firstName}</Text>
        <Text style={styles.sheetSub}>عملیات پروفایل</Text>
        <View style={styles.sheetRows}>
          {rows.map((r, i) => (
            <TouchableOpacity
              key={r.label}
              style={[styles.sheetRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => { onClose(); setTimeout(r.onPress, 240); }}
              activeOpacity={0.7}
            >
              <View style={styles.sheetRowIcon}>{r.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetRowLabel, r.danger && { color: Colors.danger }]}>{r.label}</Text>
                {r.sub && <Text style={styles.sheetRowSub}>{r.sub}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.sheetCancelTxt}>انصراف</Text>
        </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── LockedRow ─────────────────────────────────────────────────────────────────

function LockedRow({ label }: { label: string }) {
  return (
    <View style={styles.lockedRow}>
      <Lock size={14} color={Colors.muted} strokeWidth={2} />
      <Text style={styles.lockedLabel}>{label}</Text>
      <Text style={styles.lockedCta}>ارتقا ←</Text>
    </View>
  );
}

// ── GoldLockedCard ────────────────────────────────────────────────────────────

function GoldLockedCard() {
  return (
    <View style={styles.goldLockCard}>
      <Star size={16} color={Colors.goldDeep} fill={Colors.goldDeep} strokeWidth={0} />
      <Text style={styles.goldLockTxt}>
        Personality · Trust score · پاسخ آشنایی · Red Flag check
      </Text>
      <TouchableOpacity onPress={() => router.push('/subscription' as never)} activeOpacity={0.8}>
        <Text style={styles.goldLockCta}>Gold ←</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── AboutCard ──────────────────────────────────────────────────────────────────
// Consolidates bio/goal/lifestyle/languages/religiosity/dealbreakers into one
// compact grouped card (icon-led rows with thin dividers) instead of five
// separate top-level sections each with their own heading and margins.

function AboutCard({
  bio, relationshipGoal, lifestyleTags, myTagIds, matchCount,
  languages, religiosityLevel, religioDiff, dealbreakers, firstName,
}: {
  bio: string | null;
  relationshipGoal: { title: string } | null;
  lifestyleTags: { id: number; title: string }[];
  myTagIds: Set<number>;
  matchCount?: number | null;
  languages: { id: number; title: string }[];
  religiosityLevel: number | null;
  religioDiff: string | null;
  dealbreakers: { id: number; body: string }[];
  firstName: string;
}) {
  const hasFacts =
    !!relationshipGoal || lifestyleTags.length > 0 || languages.length > 0 ||
    religiosityLevel != null || dealbreakers.length > 0;

  return (
    <View style={styles.infoCard}>
      {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      {bio && hasFacts && <View style={styles.infoDivider} />}

      {relationshipGoal && (
        <View style={styles.infoRow}>
          <View style={styles.infoRowIcon}>
            <Target size={15} color={Colors.accent} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoRowLabel}>هدف رابطه</Text>
            <Text style={styles.infoRowValue}>{relationshipGoal.title}</Text>
          </View>
        </View>
      )}

      {lifestyleTags.length > 0 && (
        <>
          {relationshipGoal && <View style={styles.infoDivider} />}
          <View style={styles.infoBlock}>
            <View style={styles.infoBlockHead}>
              <Text style={styles.infoBlockLabel}>سبک زندگی</Text>
              {!!matchCount && (
                <Text style={styles.infoMatchTxt}>{matchCount} تگ مشترک</Text>
              )}
            </View>
            <View style={styles.tagRow}>
              {lifestyleTags.map(t => (
                <View key={t.id} style={[styles.tag, myTagIds.has(t.id) && styles.tagMatch]}>
                  <Text style={[styles.tagTxt, myTagIds.has(t.id) && styles.tagTxtMatch]}>
                    {myTagIds.has(t.id) ? '✓ ' : ''}{t.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {languages.length > 0 && (
        <>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoRowIcon}>
              <LanguagesIcon size={15} color={Colors.purple} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoRowLabel}>زبان‌ها</Text>
              <Text style={styles.infoRowValue}>{languages.map(l => l.title).join(' · ')}</Text>
            </View>
          </View>
        </>
      )}

      {religiosityLevel != null && (
        <>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoRowIcon}>
              <Moon size={15} color={Colors.trust} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoRowLabel}>میزان مذهبی</Text>
              <Text style={styles.infoRowValue}>
                {RELIGIOSITY[religiosityLevel]}
                {religioDiff && <Text style={{ color: Colors.muted }}> · {religioDiff}</Text>}
              </Text>
            </View>
          </View>
        </>
      )}

      {dealbreakers.length > 0 && (
        <>
          <View style={styles.infoDivider} />
          <View style={styles.infoBlock}>
            <View style={styles.infoBlockHead}>
              <ShieldAlert size={13} color={Colors.danger} strokeWidth={2} />
              <Text style={[styles.infoBlockLabel, { color: Colors.danger }]}>خط قرمزهای {firstName}</Text>
            </View>
            <View style={styles.tagRow}>
              {dealbreakers.map(d => (
                <View key={d.id} style={styles.dealbreakerTag}>
                  <Text style={styles.dealbreakerTxt}>{d.body}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileViewScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, user } = useAuth();
  const userId = Number(id);
  const myId = user?.id ?? -1;

  const cached = profileCache.get(userId);
  const [profile, setProfile] = useState<UserProfile | null>(
    cached ? {
      ...cached,
      last_name: null,
      job: null,
      education: null,
      religiosity_level: null,
      dealbreakers: [],
      languages: [],
      prompt_answers: [],
      latest_personality_test: null,
    } : null,
  );
  const [myProfile, setMyProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);

  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [userGifts, setUserGifts] = useState<SentGift[]>([]);
  const [matchInfo, setMatchInfo] = useState<{ user: MutualUser; message?: string | null } | null>(null);
  const [existingConversation, setExistingConversation] = useState<Conversation | null>(null);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    try {
      const [data, me, bStatus, gifts, convs, pendingIn, pendingOut] = await Promise.all([
        profileApi.getUserProfile(session.accessToken, userId),
        profileApi.getProfile(session.accessToken),
        blockApi.getBlockStatus(session.accessToken, userId).catch(() => null),
        giftsApi.listUserGifts(session.accessToken, userId).catch(() => [] as SentGift[]),
        chatApi.listConversations(session.accessToken).catch(() => [] as Conversation[]),
        chatApi.listPendingIncoming(session.accessToken).catch(() => [] as Conversation[]),
        chatApi.listPendingOutgoing(session.accessToken).catch(() => [] as Conversation[]),
      ]);
      setProfile(prev => ({
        ...data,
        compatibility_score: prev?.compatibility_score ?? data.compatibility_score,
      }));
      setMyProfile(me);
      setBlockStatus(bStatus);
      setUserGifts(gifts);
      setExistingConversation(
        [...convs, ...pendingIn, ...pendingOut].find(
          c => c.first_user_id === userId || c.second_user_id === userId,
        ) ?? null,
      );
      setError(false);
    } catch {
      if (!cached) setError(true);
    } finally {
      setLoading(false);
    }
  }, [session, userId, cached]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity style={styles.backBtnDark} onPress={goBack}>
            <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity style={styles.backBtnDark} onPress={goBack}>
            <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTxt}>پروفایل یافت نشد</Text>
          <Text style={[styles.emptyTxt, { fontSize: 12, color: Colors.muted }]}>
            اتصال اینترنت را بررسی کن
          </Text>
          <TouchableOpacity
            onPress={fetchProfile}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnTxt}>تلاش دوباره</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goBack} style={{ marginTop: 8 }}>
            <Text style={[styles.emptyTxt, { color: Colors.muted, fontSize: 12 }]}>بازگشت</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const age = calcAge(profile.birth_date);
  const photoUrl = profile.profile_photo?.urls.large;
  const plan = (myProfile?.active_subscription?.plan?.slug ?? 'basic').toLowerCase() as 'basic' | 'silver' | 'gold';
  const isAtLeastSilver = plan === 'silver' || plan === 'gold';
  const isGold = plan === 'gold';

  const myDealbreakers = myProfile?.dealbreakers?.map(d => d.body) ?? [];
  const redFlags = myDealbreakers.filter(d =>
    profile.lifestyle_tags.some(
      t =>
        t.title.toLowerCase().includes(d.toLowerCase()) ||
        d.toLowerCase().includes(t.title.toLowerCase()),
    ),
  );

  const lifestyleMatchPct = computeLifestyleMatch(
    myProfile?.lifestyle_tags ?? [],
    profile.lifestyle_tags,
  );
  const religioDiff = religiosityDiff(myProfile?.religiosity_level, profile.religiosity_level);
  const myTagIds = new Set((myProfile?.lifestyle_tags ?? []).map(t => t.id));
  const promptAnswers = (profile.prompt_answers ?? []).filter(
    a => a.answer?.trim() && a.moderation_status === 'approved',
  );
  const dealbreakers = (profile.dealbreakers ?? []).filter(d => d.moderation_status === 'approved');
  const traitScores = Object.entries(profile.latest_personality_test?.scores ?? {});
  const showAiSummary =
    profile.latest_personality_test?.assistant_analysis_status === 'completed' &&
    !!profile.latest_personality_test?.assistant_analysis?.summary;

  const handleLike = () => {
    if (!session) return;
    discoverApi.interact(session.accessToken, profile.id, 'like')
      .then(res => {
        if (res.data?.mutual && res.data.mutual_user) {
          setMatchInfo({ user: res.data.mutual_user, message: res.data.mutual_message });
        } else {
          goBack();
        }
      })
      .catch(() => goBack());
  };
  const handlePass = () => {
    if (!session) return;
    discoverApi.interact(session.accessToken, profile.id, 'pass').catch(() => {});
    goBack();
  };
  const handleAnon = () => {
    if (!session || !profile) return;
    Alert.alert(
      'علاقه ناشناس',
      `علاقه ناشناس به ${profile.first_name} فرستاده می‌شه. هویتت فاش نمی‌شه.`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'ارسال',
          onPress: () => {
            discoverApi.interact(session.accessToken, profile.id, 'anonymous_interest')
              .then(res => {
                if (res.data?.mutual && res.data.mutual_user) {
                  setMatchInfo({ user: res.data.mutual_user, message: res.data.mutual_message });
                } else {
                  toast.success('علاقه ناشناس فرستاده شد!');
                }
              })
              .catch((e: any) => toast.error(e.message ?? 'خطا'));
          },
        },
      ],
    );
  };
  const handleInsight = () => {
    router.push({ pathname: '/ai-insight/user' as any, params: { userId: String(profile?.id), userName: profile?.first_name } });
  };
  const handleBlock = () => {
    if (!session || !profile) return;
    const isBlocked = blockStatus?.blocked_by_me ?? false;
    if (isBlocked) {
      Alert.alert('رفع مسدودیت', `آیا می‌خواهی ${profile.first_name} را رفع بلاک کنی؟`, [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'رفع بلاک', style: 'destructive',
          onPress: async () => {
            try {
              await blockApi.unblockUser(session.accessToken, profile.id);
              setBlockStatus(prev => prev ? { ...prev, blocked_by_me: false, is_blocked_between: prev.blocked_me } : null);
              toast.success('رفع مسدودیت انجام شد');
            } catch { toast.error('خطا در رفع مسدودیت'); }
          },
        },
      ]);
    } else {
      Alert.alert('مسدود کردن', `آیا می‌خواهی ${profile.first_name} را مسدود کنی؟`, [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'مسدود کردن', style: 'destructive',
          onPress: async () => {
            try {
              await blockApi.blockUser(session.accessToken, profile.id);
              setBlockStatus(prev => prev ? { ...prev, blocked_by_me: true, is_blocked_between: true } : null);
              toast.success(`${profile.first_name} مسدود شد`);
              setActionsOpen(false);
              goBack();
            } catch { toast.error('خطا در مسدود کردن'); }
          },
        },
      ]);
    }
  };
  const handleReport = () => {
    if (!profile) return;
    router.push({
      pathname: '/report-user' as any,
      params: { userId: String(profile.id), userName: profile.first_name },
    });
  };
  const handleShare = () => {
    Alert.alert('اشتراک‌گذاری', 'این قابلیت به زودی اضافه می‌شه.', [{ text: 'باشه' }]);
  };
  const handleMessagePress = () => {
    if (!profile) return;
    if (existingConversation) {
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: String(existingConversation.id),
          publicId: existingConversation.public_id,
          otherId: String(profile.id),
          name: profile.first_name,
          avatar: photoUrl ?? '',
          status: existingConversation.status,
          isSender: existingConversation.first_user_id === myId ? '1' : '0',
        },
      } as never);
    } else {
      setTemplateOpen(true);
    }
  };

  const stats: { label: string; value: string; accent?: boolean; onPress?: () => void }[] = [
    { label: 'سن', value: String(age) },
  ];
  if (profile.height_cm != null) stats.push({ label: 'قد', value: `${profile.height_cm}` });
  if (profile.compatibility_score != null) {
    stats.push({
      label: 'تطابق', value: `${profile.compatibility_score}٪`, accent: true,
      onPress: () => router.push(`/user/compatibility?id=${profile.id}` as never),
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.heroWrap}>
        {/* ── Banner ──────────────────────────────────────────────────────── */}
        <View style={styles.banner}>
          <AnimatedBanner />

          <SafeAreaView style={styles.heroTop} edges={['top']}>
            <TouchableOpacity style={styles.backBtnLight} onPress={goBack}>
              <ArrowLeft size={20} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn} onPress={() => setActionsOpen(true)}>
              <MoreVertical size={20} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* ── Profile card ────────────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          {profile.badges.length > 0 && (
            <View style={styles.badgeRow}>
              {profile.badges.map(b => (
                <Badge key={b.id} kind={badgeKind(b.slug)} label="" />
              ))}
            </View>
          )}
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName}>{profile.first_name}، {age}</Text>
            {profile.username && <Text style={styles.usernameTxt}>@{profile.username}</Text>}
          </View>
          <View style={styles.metaRow}>
            {(profile.city || profile.province) && (
              <View style={styles.metaChip}>
                <MapPin size={11.5} color={Colors.muted} strokeWidth={2} />
                <Text style={styles.metaTxt}>{profile.city ?? profile.province}</Text>
              </View>
            )}
            {profile.job && (
              <View style={styles.metaChip}>
                <Briefcase size={11.5} color={Colors.muted} strokeWidth={2} />
                <Text style={styles.metaTxt}>{profile.job}</Text>
              </View>
            )}
            {profile.education && (
              <View style={styles.metaChip}>
                <GraduationCap size={11.5} color={Colors.muted} strokeWidth={2} />
                <Text style={styles.metaTxt}>{profile.education}</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            {stats.map(s => {
              const Wrap = s.onPress ? TouchableOpacity : View;
              return (
                <Wrap
                  key={s.label}
                  style={[styles.statBox, s.accent && styles.statBoxAccent]}
                  onPress={s.onPress}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.statValue, s.accent && styles.statValueAccent]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </Wrap>
              );
            })}
          </View>
        </View>

        {/* Avatar overlapping the banner/card boundary — painted last so it sits on top */}
        <View style={styles.avatarOverlap} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.avatarRing}
            activeOpacity={photoUrl ? 0.85 : 1}
            disabled={!photoUrl}
            onPress={() => setAvatarViewerOpen(true)}
          >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={[styles.avatarImg, styles.heroPh]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Red Flag Banner ───────────────────────────────────────────────── */}
      {redFlags.length > 0 && (
        <View style={styles.redFlagBanner}>
          <AlertTriangle size={14} color={Colors.danger} strokeWidth={2} />
          <Text style={styles.redFlagTxt}>
            این پروفایل با {redFlags.length > 1 ? 'چند' : 'یک'} خط قرمز تو همخوانی داره
          </Text>
        </View>
      )}

      {/* ── Content by tier ───────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── BASIC ─────────────────────────────────────────────────── */}
        {!isAtLeastSilver && (
          <>
            {/* Upsell card */}
            <View style={styles.upsellCard}>
              <View style={styles.upsellIcon}>
                <Lock size={20} color={Colors.purple} strokeWidth={2} />
              </View>
              <Text style={styles.upsellTxt}>
                برای دیدن سازگاری، سبک زندگی و موارد بیشتر، اشتراکت رو ارتقا بده
              </Text>
              <TouchableOpacity
                style={styles.upsellBtn}
                onPress={() => router.push('/subscription' as never)}
                activeOpacity={0.8}
              >
                <Text style={styles.upsellBtnTxt}>ارتقا</Text>
              </TouchableOpacity>
            </View>

            <AboutCard
              bio={profile.bio}
              relationshipGoal={profile.relationship_goal}
              lifestyleTags={[]}
              myTagIds={myTagIds}
              languages={[]}
              religiosityLevel={null}
              religioDiff={null}
              dealbreakers={[]}
              firstName={profile.first_name}
            />

            {/* Locked rows */}
            <View style={styles.lockedList}>
              <Text style={styles.infoBlockLabel}>قفل در Basic</Text>
              {['تطابق سبک زندگی', 'سبک زندگی', 'تست شخصیت', 'پاسخ آشنایی', 'معرفی صوتی'].map(l => (
                <LockedRow key={l} label={l} />
              ))}
            </View>
          </>
        )}

        {/* ── SILVER ────────────────────────────────────────────────── */}
        {isAtLeastSilver && profile.voice_intro_url && (
          <View style={styles.section}>
            <Text style={styles.infoBlockLabel}>معرفی صوتی</Text>
            <VoiceIntroPlayer uri={profile.voice_intro_url} durationSeconds={profile.voice_intro_duration_seconds ?? 1} />
          </View>
        )}

        {isAtLeastSilver && !isGold && (
          <>
            {/* Lifestyle Match ring card */}
            {lifestyleMatchPct != null && (
              <View style={styles.matchCard}>
                <ProgressRing value={lifestyleMatchPct} size={72} stroke={7} color={Colors.accent}>
                  <Text style={styles.ringNum}>{lifestyleMatchPct}</Text>
                </ProgressRing>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchTitle}>Lifestyle Match</Text>
                  <Text style={styles.matchSub}>
                    {profile.lifestyle_tags.filter(t => myTagIds.has(t.id)).length} تگ مشترک با شما
                  </Text>
                  {profile.relationship_goal && (
                    <Text style={styles.matchSub}>هدف رابطه: {profile.relationship_goal.title}</Text>
                  )}
                </View>
              </View>
            )}

            <AboutCard
              bio={profile.bio}
              relationshipGoal={profile.relationship_goal}
              lifestyleTags={profile.lifestyle_tags}
              myTagIds={myTagIds}
              matchCount={profile.lifestyle_tags.filter(t => myTagIds.has(t.id)).length}
              languages={profile.languages}
              religiosityLevel={profile.religiosity_level}
              religioDiff={religioDiff}
              dealbreakers={dealbreakers}
              firstName={profile.first_name}
            />

            {/* Gold locked */}
            <GoldLockedCard />
          </>
        )}

        {/* ── GOLD ──────────────────────────────────────────────────── */}
        {isGold && (
          <>
            {/* Compatibility card */}
            {profile.compatibility_score != null ? (
              <TouchableOpacity
                style={styles.compatCard}
                onPress={() => router.push(`/user/compatibility?id=${profile.id}` as never)}
                activeOpacity={0.85}
              >
                <ProgressRing value={profile.compatibility_score} size={80} stroke={9} color={Colors.purple}>
                  <Text style={styles.ringNumLg}>{profile.compatibility_score}</Text>
                  <Text style={styles.ringLabel}>سازگاری</Text>
                </ProgressRing>
                <View style={{ flex: 1 }}>
                  <View style={styles.compatTitleRow}>
                    <Text style={styles.compatTitle}>
                      {profile.compatibility_score >= 80 ? 'تطابق عالی' :
                        profile.compatibility_score >= 60 ? 'تطابق خوب' : 'تطابق متوسط'}
                    </Text>
                    <Badge kind="gold" label="GOLD" />
                  </View>
                  <Text style={styles.compatSubTxt}>
                    هدف، سبک زندگی و سبک ارتباطی{redFlags.length === 0 ? ' · بدون Red Flag' : ''}
                  </Text>
                  <Text style={[styles.compatSubTxt, { color: Colors.purple, marginTop: 4 }]}>
                    جزئیات تطابق ←
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.noCompatCard}>
                <Sparkles size={16} color={Colors.purple} strokeWidth={2} />
                <Text style={styles.noCompatTxt}>
                  Compatibility Score در پیشنهادهای روزانه نمایش داده می‌شود
                </Text>
              </View>
            )}

            <AboutCard
              bio={profile.bio}
              relationshipGoal={profile.relationship_goal}
              lifestyleTags={profile.lifestyle_tags}
              myTagIds={myTagIds}
              languages={profile.languages}
              religiosityLevel={profile.religiosity_level}
              religioDiff={religioDiff}
              dealbreakers={dealbreakers}
              firstName={profile.first_name}
            />

            {/* Personality test */}
            {profile.latest_personality_test && (
              <View style={styles.section}>
                <Text style={styles.infoBlockLabel}>تست شخصیت</Text>
                <View style={styles.personalityChip}>
                  <Brain size={13} color={Colors.purple} strokeWidth={2} />
                  <Text style={styles.personalityTxt}>{profile.latest_personality_test.result_title}</Text>
                </View>
                {traitScores.length > 0 && (
                  <View style={styles.traitList}>
                    {traitScores.map(([key, value]) => (
                      <TraitBar key={key} label={TRAIT_LABELS[key] ?? key} value={value} />
                    ))}
                  </View>
                )}
                {showAiSummary && (
                  <View style={styles.aiSummaryCard}>
                    <Sparkles size={13} color={Colors.purple} strokeWidth={2} style={{ marginTop: 2 }} />
                    <Text style={styles.aiSummaryTxt}>
                      {profile.latest_personality_test!.assistant_analysis!.summary}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Prompt answers */}
            {promptAnswers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.infoBlockLabel}>آشنایی با من</Text>
                <View style={styles.promptList}>
                  {promptAnswers.slice(0, 5).map(a => (
                    <View key={a.id} style={styles.promptCard}>
                      <Text style={styles.promptMark}>”</Text>
                      {a.prompt?.body && (
                        <Text style={styles.promptQ}>{a.prompt.body}</Text>
                      )}
                      <Text style={styles.promptA}>{a.answer}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Received gifts */}
            {userGifts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.infoBlockLabel}>هدایای دریافتی</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.giftScroll}>
                  {userGifts.slice(0, 12).map(g => (
                    <View key={g.sent_gift_id} style={[styles.giftItem, g.is_pinned && styles.giftItemPinned]}>
                      <Text style={styles.giftItemEmoji}>🎁</Text>
                      <Text style={styles.giftItemTitle} numberOfLines={1}>{g.gift_title}</Text>
                      {g.is_pinned && <Star size={10} color={Colors.goldDeep} fill={Colors.gold} strokeWidth={1.5} />}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Action Bar ───────────────────────────────────────────────────── */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.passBtn} onPress={handlePass}>
          <X size={22} color={Colors.danger} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.giftBtn} onPress={() => setGiftOpen(true)}>
          <Gift size={20} color={Colors.goldDeep} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatGradBtn}
          onPress={handleMessagePress}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Colors.gradColors}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.chatGradInner}
          >
            <MessageCircle size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.chatGradTxt}>{existingConversation ? 'برو به چت' : 'پیام بفرست'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
          <Heart size={26} color="#fff" fill="#fff" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <GiftModal
        visible={giftOpen}
        userId={profile.id}
        firstName={profile.first_name}
        token={session?.accessToken ?? ''}
        onClose={() => setGiftOpen(false)}
      />
      <TemplateMessageModal
        visible={templateOpen}
        userId={profile.id}
        firstName={profile.first_name}
        token={session?.accessToken ?? ''}
        onClose={() => setTemplateOpen(false)}
        onSent={() => { setTemplateOpen(false); goBack(); }}
      />
      <ProfileActionsSheet
        visible={actionsOpen}
        firstName={profile.first_name}
        isBlocked={blockStatus?.blocked_by_me ?? false}
        onClose={() => setActionsOpen(false)}
        onGift={() => setGiftOpen(true)}
        onGoldBadge={() => router.push({ pathname: '/subscription/gold-badge', params: { userId: String(userId), userName: profile.first_name } } as never)}
        onAnon={handleAnon}
        onInsight={handleInsight}
        onBlock={handleBlock}
        onReport={handleReport}
        onShare={handleShare}
      />
      <MatchCelebrationModal
        visible={!!matchInfo}
        otherName={matchInfo?.user.first_name ?? ''}
        otherAvatarUrl={matchInfo?.user.profile_photo?.urls?.medium ?? null}
        message={matchInfo?.message}
        onClose={() => { setMatchInfo(null); goBack(); }}
        onStartChat={() => { setMatchInfo(null); setTemplateOpen(true); }}
      />

      {/* Full-screen avatar viewer */}
      <Modal visible={avatarViewerOpen} transparent animationType="fade" onRequestClose={() => setAvatarViewerOpen(false)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setAvatarViewerOpen(false)}>
          {photoUrl && (
            <Image source={{ uri: photoUrl }} style={styles.viewerImage} contentFit="contain" />
          )}
          <TouchableOpacity style={styles.viewerClose} onPress={() => setAvatarViewerOpen(false)} hitSlop={10}>
            <X size={22} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTxt: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.regular },
  retryBtn: {
    marginTop: 4, paddingHorizontal: 24, paddingVertical: 9,
    backgroundColor: Colors.accentSoft, borderRadius: 20,
  },
  retryBtnTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.accent },
  loadingHeader: { paddingTop: 12, paddingHorizontal: 12 },
  backBtnDark: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.ph2,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Banner + Profile card ────────────────────────────────────────────────
  heroWrap: { position: 'relative' },
  banner: { height: 132, backgroundColor: Colors.purpleSoft, overflow: 'hidden' },
  heroPh: { backgroundColor: Colors.purpleSoft },
  heroTop: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  backBtnLight: {
    margin: 12, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  moreBtn: {
    margin: 12, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  blobA: {
    position: 'absolute', top: -30, right: -30,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  blobB: {
    position: 'absolute', bottom: -50, left: -40,
    width: 190, height: 190, borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blobC: {
    position: 'absolute', top: 20, left: '38%',
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  avatarOverlap: {
    position: 'absolute', top: 78, left: 0, right: 0, zIndex: 20,
    alignItems: 'center',
  },
  avatarRing: {
    width: 108, height: 108, borderRadius: 54, padding: 4,
    backgroundColor: Colors.bg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  profileCard: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    paddingTop: 58, paddingBottom: 18, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 },
  heroNameRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  heroName: { fontSize: 21, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.5, textAlign: 'center' },
  usernameTxt: { fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.bg, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 4.5,
  },
  metaTxt: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.semiBold },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  statBox: {
    flex: 1, alignItems: 'center',
    backgroundColor: Colors.bg, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 8,
    borderWidth: 1, borderColor: Colors.lineSoft,
  },
  statBoxAccent: { backgroundColor: Colors.purpleSoft, borderColor: Colors.purple + '33' },
  statValue: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink },
  statValueAccent: { color: Colors.purple },
  statLabel: { fontSize: 10.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },

  // ── Red Flag ──────────────────────────────────────────────────────────────
  redFlagBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: Colors.dangerSoft, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.danger + '22',
  },
  redFlagTxt: { flex: 1, fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.danger, lineHeight: 18 },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: 14 },

  section: { gap: 10 },
  voiceIntroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.hair,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
  },
  voiceIntroBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  voiceIntroWave: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.lineSoft },
  voiceIntroDuration: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  infoBlockLabel: { fontSize: 11.5, fontFamily: Fonts.bold, color: Colors.muted, letterSpacing: 0.3 },
  giftScroll: { gap: 8, paddingVertical: 2 },
  giftItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.hair,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
    maxWidth: 160,
  },
  giftItemPinned: { borderColor: Colors.gold, backgroundColor: Colors.goldSoft },
  giftItemEmoji: { fontSize: 18 },
  giftItemTitle: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.ink, flexShrink: 1 },
  bio: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 24 },

  // ── AboutCard (compact grouped info) ─────────────────────────────────────
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 16, borderWidth: 1, borderColor: Colors.lineSoft,
  },
  infoDivider: { height: 1, backgroundColor: Colors.hair, marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoRowIcon: { width: 24, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  infoRowLabel: { fontSize: 10.5, fontFamily: Fonts.regular, color: Colors.muted, marginBottom: 3 },
  infoRowValue: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.ink, lineHeight: 19 },
  infoBlock: { gap: 8 },
  infoBlockHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoMatchTxt: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.ok },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tagMatch: { backgroundColor: Colors.okSoft },
  tagTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.purple },
  tagTxtMatch: { color: Colors.ok },
  dealbreakerTag: {
    backgroundColor: Colors.dangerSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  dealbreakerTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.danger },

  promptList: { gap: 10 },
  promptCard: {
    position: 'relative', overflow: 'hidden',
    backgroundColor: Colors.purpleSoft, borderRadius: 14,
    padding: 14, paddingTop: 12,
    borderRightWidth: 3, borderRightColor: Colors.purple,
  },
  promptMark: {
    position: 'absolute', top: -14, right: 6,
    fontSize: 56, fontFamily: Fonts.extraBold, color: Colors.purple, opacity: 0.14,
  },
  promptQ: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.purple, marginBottom: 5 },
  promptA: { fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 20 },

  personalityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  personalityTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.purple },
  traitList: { gap: 8, marginTop: 10 },
  traitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  traitLabel: { width: 56, fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  traitTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.lineSoft, overflow: 'hidden' },
  traitFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.purple },
  traitValue: { width: 22, fontSize: 11, fontFamily: Fonts.bold, color: Colors.purple, textAlign: 'left' },
  aiSummaryCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.purpleSoft, borderRadius: 14, padding: 12, marginTop: 10,
  },
  aiSummaryTxt: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 19 },

  // ── Basic ─────────────────────────────────────────────────────────────────
  upsellCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.purpleSoft, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.purple + '22',
  },
  upsellIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  upsellTxt: { flex: 1, fontSize: 11.5, color: Colors.inkSoft, lineHeight: 17, fontFamily: Fonts.regular },
  upsellBtn: {
    backgroundColor: Colors.purple, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  upsellBtnTxt: { fontSize: 12, fontFamily: Fonts.bold, color: '#fff' },

  lockedList: { gap: 8 },
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.lineSoft,
  },
  lockedLabel: { flex: 1, fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.muted },
  lockedCta: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.accent },

  // ── Silver ────────────────────────────────────────────────────────────────
  matchCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.accentSoft, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: Colors.accent + '22',
  },
  ringNum: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.accent },
  matchTitle: { fontSize: 13.5, fontFamily: Fonts.extraBold, color: Colors.ink },
  matchSub: { fontSize: 11, color: Colors.inkSoft, fontFamily: Fonts.regular, marginTop: 3, lineHeight: 16 },

  goldLockCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.goldSoft, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.goldDeep + '33',
  },
  goldLockTxt: { flex: 1, fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.regular, lineHeight: 17 },
  goldLockCta: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.goldDeep },

  // ── Gold ──────────────────────────────────────────────────────────────────
  compatCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.purpleSoft, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: Colors.purple + '22',
  },
  ringNumLg: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.purple },
  ringLabel: { fontSize: 8.5, fontFamily: Fonts.semiBold, color: Colors.muted },
  compatTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  compatTitle: { fontSize: 13.5, fontFamily: Fonts.extraBold, color: Colors.purple },
  compatSubTxt: { fontSize: 11, color: Colors.inkSoft, fontFamily: Fonts.regular, lineHeight: 17 },
  noCompatCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.purpleSoft, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.purple + '22',
  },
  noCompatTxt: { flex: 1, fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular, lineHeight: 18 },

  // ── Action Bar ────────────────────────────────────────────────────────────
  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.bg,
    borderTopWidth: 1, borderTopColor: Colors.lineSoft,
  },
  passBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.dangerSoft, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.danger, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  giftBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.goldSoft, alignItems: 'center', justifyContent: 'center',
  },
  chatGradBtn: {
    flex: 1, height: 50, borderRadius: 25, overflow: 'hidden',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  chatGradInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  chatGradTxt: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
  likeBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 7,
  },

  // ── Profile Actions Sheet ─────────────────────────────────────────────────
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 36, paddingHorizontal: 16, paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.line, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink, textAlign: 'center' },
  sheetSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted, textAlign: 'center', marginTop: 2, marginBottom: 14 },
  sheetRows: {
    backgroundColor: Colors.ph2, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.lineSoft,
  },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.lineSoft,
  },
  sheetRowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  sheetRowLabel: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.ink },
  sheetRowSub: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  sheetCancel: {
    marginTop: 10, paddingVertical: 14,
    backgroundColor: Colors.ph2, borderRadius: 16,
    alignItems: 'center',
  },
  sheetCancelTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.inkSoft },

  // ── Avatar viewer ─────────────────────────────────────────────────────────
  viewerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: {
    position: 'absolute', top: 56, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
});
