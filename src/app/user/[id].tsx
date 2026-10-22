import { useCoinBalance } from '@/lib/CoinBalanceContext';
import { GiftModal } from '@/components/GiftModal';
import { MatchCelebrationModal } from '@/components/MatchCelebrationModal';
import { CompatibilitySummary } from '@/components/discovery/CompatibilitySummary';
import { TemplateMessageModal } from '@/components/TemplateMessageModal';
import { Sheet } from '@/components/ui/Sheet';
import { AppBar } from '@/components/ui/AppBar';
import { Modal } from '@/components/ui/BlurredModal';
import { Badge } from '@/components/ui/Badge';
import { SimpleBadgeInfoModal } from '@/components/SimpleBadgeInfoModal';
import { UserBadgeInfoModal } from '@/components/UserBadgeInfoModal';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { hasBadge, TIERS, type Tier } from '@/constants/verificationTiers';
import { blockApi, type BlockStatus } from '@/lib/api/block';
import { chatApi, type Conversation } from '@/lib/api/chat';
import { confirmSheet } from '@/lib/confirmSheet';
import { discoverApi, type MutualUser } from '@/lib/api/discover';
import { giftsApi, giftDisplayTitle, type SentGift } from '@/lib/api/gifts';
import { toast } from '@/lib/toast';
import { toFaDigits } from '@/lib/localization';
import { profileApi, type ClientProfile, type UserProfile } from '@/lib/api/profile';
import { apiUrl } from '@/lib/api/url';
import { profileCache } from '@/lib/cache/profileCache';
import { useAuth } from '@/lib/auth/AuthContext';
import { normalizeCompatibility } from '@/lib/discovery/compatibility';
import { Image } from 'expo-image';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  Brain,
  Briefcase,
  Coins,
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
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  User,
  UserX,
  VenetianMask,
  X,
} from 'lucide-react-native';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Catalog gifts have no uploaded asset yet — same fallback map as (tabs)/gifts.tsx,
// keyed by title since SentGift only snapshots gift_title, not slug.
const GIFT_TITLE_EMOJI: Record<string, string> = {
  'Dream Rose': '🌹',
  'گل رز': '🌹',
  'گل رز رویایی': '🌹',
  'Coffee Invite': '☕',
  'دعوت قهوه': '☕',
  'دعوت به قهوه': '☕',
  'Cool Moon': '🌙',
  'ماه باحال': '🌙',
  'ماه خنک': '🌙',
  'Golden Heart': '💛',
  'قلب طلایی': '💛',
  'Legendary Star': '⭐',
  'ستاره افسانه‌ای': '⭐',
  'ستاره افسانه ای': '⭐',
};
const giftEmoji = (g: SentGift) => GIFT_TITLE_EMOJI[g.gift_title] ?? '🎁';

function calcAge(birth: string) {
  return Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * Classifies a badge slug for the "other badges" row (gold / complete-profile /
 * personality-test — the three verification tiers are rendered separately from
 * `TIERS` and excluded here). Returns `null` for anything unrecognized instead
 * of falling back to `'check'`, which would render as an extra, non-clickable
 * copy of the basic-verification pill.
 */
function badgeKind(slug: string): 'gold' | 'complete' | 'personality' | null {
  if (slug.includes('gold')) return 'gold';
  if (slug.includes('complete')) return 'complete';
  if (slug.includes('psychology') || slug.includes('personality')) return 'personality';
  return null;
}

const OTHER_BADGE_DESC: Record<'gold' | 'complete' | 'personality', string> = {
  gold: 'این کاربر نشان طلایی گرفته — یعنی کاربرهای دیگه با سکه بهش این نشان رو هدیه دادن.',
  complete: 'این کاربر پروفایلش رو صددرصد تکمیل کرده.',
  personality: 'این کاربر تست شخصیت رو کامل کرده.',
};

function formatVoiceDuration(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return toFaDigits(`${m}:${String(s).padStart(2, '0')}`);
}

function VoiceIntroPlayer({ uri, token, durationSeconds }: { uri: string; token: string; durationSeconds: number }) {
  const requestKey = `${uri}:${token}`;
  const [failedRequest, setFailedRequest] = useState<string | null>(null);
  const [audioRetry, setAudioRetry] = useState(0);
  const [webAudio, setWebAudio] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const controller = new AbortController();
    let objectUrl: string | null = null;
    void fetch(apiUrl(uri), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    }).then(response => {
      if (!response.ok) throw new Error('Voice intro is unavailable');
      return response.blob();
    }).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setWebAudio({ key: requestKey, url: objectUrl });
      setFailedRequest(null);
    }).catch(() => {
      if (!controller.signal.aborted) { setWebAudio(null); setFailedRequest(requestKey); }
    });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri, token, requestKey, audioRetry]);

  const source = Platform.OS === 'web'
    ? (webAudio?.key === requestKey ? webAudio.url : null)
    : { uri: apiUrl(uri), headers: { Authorization: `Bearer ${token}` } };
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (!status.isLoaded) return;
    if (status.playing) player.pause();
    else {
      if (status.currentTime >= (status.duration || durationSeconds)) player.seekTo(0);
      player.play();
    }
  };

  if (failedRequest === requestKey || status.error) {
    return <TouchableOpacity style={styles.voiceIntroRow} accessibilityRole="button" onPress={() => {
      if (Platform.OS === 'web') { setFailedRequest(null); setAudioRetry(value => value + 1); }
      else player.replace(source);
    }}>
      <Text style={styles.infoRowValue}>صدا پخش نشد؛ برای تلاش مجدد بزن</Text>
    </TouchableOpacity>;
  }

  const resolvedDuration = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : durationSeconds;
  const remaining = status.playing || status.currentTime > 0
    ? Math.max(0, Math.ceil(resolvedDuration - status.currentTime))
    : resolvedDuration;

  return (
    <TouchableOpacity style={styles.voiceIntroRow} onPress={toggle} disabled={!status.isLoaded} activeOpacity={0.8}>
      <View style={styles.voiceIntroBtn}>
        {!status.isLoaded ? <ActivityIndicator color="#fff" size="small" /> : status.playing
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

type PersonalityDimensionScore = {
  label?: string;
  positive_score?: number;
  negative_score?: number;
  leaning_label?: string;
};

function buildPersonalityTraits(scores: unknown): { key: string; label: string; value: number }[] {
  if (!scores || typeof scores !== 'object') return [];
  const dimensions = (scores as { dimensions?: unknown }).dimensions;
  if (!dimensions || typeof dimensions !== 'object') return [];

  return Object.entries(dimensions as Record<string, PersonalityDimensionScore>)
    .map(([key, dim]) => {
      const positive = Number(dim?.positive_score);
      const negative = Number(dim?.negative_score);
      const total = positive + negative;
      const value = Number.isFinite(total) && total > 0 ? Math.round((positive / total) * 100) : 50;
      return {
        key,
        label: dim?.leaning_label || dim?.label || key,
        value,
      };
    })
    .filter(trait => Number.isFinite(trait.value));
}

function TraitBar({ label, value }: { label: string; value: number }) {
  const pct = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <View style={styles.traitChip}>
      <Text style={styles.traitLabel}>{label}</Text>
      <Text style={styles.traitValue}>{toFaDigits(pct)}</Text>
    </View>
  );
}

// ── ProfileActionsSheet ───────────────────────────────────────────────────────

function ProfileActionsSheet({
  visible, firstName, isBlocked, coins, onClose, onGift, onGoldBadge, onAnon, onInsight, onBlock, onReport,
}: {
  visible: boolean;
  firstName: string;
  isBlocked: boolean;
  coins: number | null;
  onClose: () => void;
  onGift: () => void;
  onGoldBadge: () => void;
  onAnon: () => void;
  onInsight: () => void;
  onBlock: () => void;
  onReport: () => void;
}) {
  const rows: { icon: React.ReactNode; label: string; sub?: string; danger?: boolean; comingSoon?: boolean; onPress: () => void }[] = [
    { icon: <Gift size={18} color={Colors.goldDeep} strokeWidth={2} />, label: 'فرستادن هدیه', sub: 'با سکه', onPress: onGift },
    { icon: <Star size={18} color={Colors.goldDeep} strokeWidth={2} />, label: 'اهدای نشان طلایی', sub: 'با سکه', onPress: onGoldBadge },
    { icon: <VenetianMask size={18} color={Colors.purple} strokeWidth={2} />, label: 'علاقه ناشناس', onPress: onAnon },
    {
      icon: <Sparkles size={18} color={Colors.purple} strokeWidth={2} />,
      label: `آنالیز هوش مصنوعی ${firstName}`,
      sub: 'تحلیل شخصیتی و سازگاری',
      comingSoon: true,
      onPress: onInsight,
    },
    { icon: <UserX size={18} color={Colors.danger} strokeWidth={2} />, label: isBlocked ? 'رفع مسدودیت' : 'مسدود کردن', danger: true, onPress: onBlock },
    { icon: <Flag size={18} color={Colors.danger} strokeWidth={2} />, label: 'گزارش', danger: true, onPress: onReport },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} contentStyle={styles.sheetContent}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderText}>
          <Text style={styles.sheetHeaderTitle}>{firstName}</Text>
          <Text style={styles.sheetHeaderSub}>عملیات پروفایل</Text>
        </View>
        <View style={styles.sheetCoinPill}>
          <Coins size={13} color={Colors.goldDeep} strokeWidth={2} />
          <Text style={styles.sheetCoinTxt}>{coins == null ? '—' : toFaDigits(coins)}</Text>
        </View>
      </View>
      <View style={styles.sheetRows}>
        {rows.map((r, i) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.sheetRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => { if (r.comingSoon) return; onClose(); setTimeout(r.onPress, 240); }}
            activeOpacity={r.comingSoon ? 1 : 0.7}
          >
            <View style={[styles.sheetRowIcon, r.comingSoon && { opacity: 0.5 }]}>{r.icon}</View>
            <View style={{ flex: 1 }}>
              <View style={styles.sheetRowLabelRow}>
                <Text style={[styles.sheetRowLabel, r.danger && { color: Colors.danger }, r.comingSoon && { color: Colors.muted }]}>{r.label}</Text>
                {r.comingSoon && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonBadgeTxt}>به زودی</Text>
                  </View>
                )}
              </View>
              {r.sub && <Text style={styles.sheetRowSub}>{r.sub}</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.sheetCancel} onPress={onClose} activeOpacity={0.7}>
        <Text style={styles.sheetCancelTxt}>انصراف</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

// ── AnonConfirmSheet ─────────────────────────────────────────────────────────

function AnonConfirmSheet({
  visible, firstName, onClose, onConfirm,
}: {
  visible: boolean;
  firstName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} contentStyle={styles.sheetContent}>
      <View style={styles.anonIconWrap}>
        <VenetianMask size={22} color={Colors.purple} strokeWidth={2} />
      </View>
      <Text style={styles.sheetTitle}>علاقه ناشناس</Text>
      <Text style={[styles.sheetSub, { marginBottom: 20 }]}>
        علاقه ناشناس به {firstName} فرستاده می‌شه. هویتت فاش نمی‌شه.
      </Text>
      <TouchableOpacity
        style={styles.anonConfirmBtn}
        onPress={() => { onClose(); setTimeout(onConfirm, 240); }}
        activeOpacity={0.85}
      >
        <Text style={styles.anonConfirmTxt}>ارسال</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sheetCancel} onPress={onClose} activeOpacity={0.7}>
        <Text style={styles.sheetCancelTxt}>لغو</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

// ── LockedRow ─────────────────────────────────────────────────────────────────

function LockedRow({ label }: { label: string }) {
  return (
    <TouchableOpacity style={styles.lockedRow} onPress={() => router.push('/subscription')} accessibilityRole="button" accessibilityLabel={`ارتقای پلن برای ${label}`}>
      <Lock size={14} color={Colors.muted} strokeWidth={2} />
      <Text style={styles.lockedLabel}>{label}</Text>
      <Text style={styles.lockedCta}>ارتقا ←</Text>
    </TouchableOpacity>
  );
}

// ── GoldLockedCard ────────────────────────────────────────────────────────────

function GoldLockedCard() {
  return (
    <View style={styles.goldLockCard}>
      <Star size={16} color={Colors.goldDeep} fill={Colors.goldDeep} strokeWidth={0} />
      <Text style={styles.goldLockTxt}>
        شخصیت‌شناسی · امتیاز اعتماد · پاسخ آشنایی · تشخیص هشدار
      </Text>
      <TouchableOpacity onPress={() => router.push('/subscription' as never)} activeOpacity={0.8}>
        <Text style={styles.goldLockCta}>طلایی ←</Text>
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
  const bioText = bio?.trim() ?? '';
  const hasFacts =
    !!relationshipGoal || lifestyleTags.length > 0 || languages.length > 0 ||
    religiosityLevel != null || dealbreakers.length > 0;

  if (!bioText && !hasFacts) return null;

  return (
    <View style={styles.infoCard}>
      {bioText ? <Text style={styles.bio}>{bioText}</Text> : null}
      {!!bioText && hasFacts && <View style={styles.infoDivider} />}

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
  const viewerId = user?.id ?? session?.userId;
  const requestVersion = useRef(0);
  const currentIdentity = useRef({ userId, token: session?.accessToken });
  useEffect(() => {
    currentIdentity.current = { userId, token: session?.accessToken };
  }, [userId, session?.accessToken]);

  const cached = profileCache.get(userId);
  const [profile, setProfile] = useState<UserProfile | null>(
    cached ? {
      ...cached,
      compatibility: null,
      compatibility_score: null,
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
  const [anonConfirmOpen, setAnonConfirmOpen] = useState(false);
  const [userGifts, setUserGifts] = useState<SentGift[]>([]);
  const [failedGiftAssetIds, setFailedGiftAssetIds] = useState<Set<number>>(new Set());
  const [matchInfo, setMatchInfo] = useState<{ user: MutualUser; message?: string | null } | null>(null);
  const [existingConversation, setExistingConversation] = useState<Conversation | null>(null);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reactionSubmitting, setReactionSubmitting] = useState<'like' | null>(null);
  const [badgeTier, setBadgeTier] = useState<Tier | null>(null);
  const [otherBadgeKind, setOtherBadgeKind] = useState<'gold' | 'complete' | 'personality' | null>(null);
  const { coins } = useCoinBalance();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    const version = ++requestVersion.current;
    const isCurrent = () => requestVersion.current === version
      && currentIdentity.current.userId === userId && currentIdentity.current.token === session.accessToken;
    setProfile(previous => previous ? { ...previous, compatibility: null, compatibility_score: null } : previous);
    try {
      const [data, me, bStatus, gifts, convs, pendingIn, pendingOut] = await Promise.all([
        profileApi.getUserProfile(session.accessToken, userId, viewerId),
        profileApi.getProfile(session.accessToken),
        blockApi.getBlockStatus(session.accessToken, userId).catch(() => null),
        giftsApi.listUserGifts(session.accessToken, userId).catch(() => [] as SentGift[]),
        chatApi.listConversations(session.accessToken).catch(() => ({ data: [] as Conversation[], next_cursor: null })),
        chatApi.listPendingIncoming(session.accessToken).catch(() => [] as Conversation[]),
        chatApi.listPendingOutgoing(session.accessToken).catch(() => [] as Conversation[]),
      ]);
      if (!isCurrent()) return;
      // Fresh null/unavailable is authoritative: never preserve a cached score.
      setProfile(data);
      setLiked(!!data.liked_by_me);
      setMyProfile(me);
      setBlockStatus(bStatus);
      setUserGifts(gifts);
      setExistingConversation(
        [...convs.data, ...pendingIn, ...pendingOut].find(
          c => c.first_user_id === userId || c.second_user_id === userId,
        ) ?? null,
      );
      setError(false);
    } catch {
      if (!isCurrent()) return;
      setProfile(previous => previous?.id === userId ? { ...previous, compatibility: null, compatibility_score: null } : null);
      if (!cached) setError(true);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [session, viewerId, userId, cached]);

  useFocusEffect(useCallback(() => {
    void fetchProfile();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void fetchProfile(); });
    return () => { requestVersion.current++; subscription.remove(); };
  }, [fetchProfile]));

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <AppBar title="" back onBack={goBack} />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile || profile.id !== userId) {
    return (
      <SafeAreaView style={styles.root}>
        <AppBar title="" back onBack={goBack} />
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
  const age = profile.age ?? (profile.birth_date ? calcAge(profile.birth_date) : null);
  const photoUrl = profile.profile_photo?.urls.large;
  const plan = (myProfile?.active_subscription?.plan?.slug ?? 'basic').toLowerCase() as 'basic' | 'silver' | 'gold';
  const isAtLeastSilver = plan === 'silver' || plan === 'gold';
  const isGold = plan === 'gold';
  // Badges already rendered from TIERS above (basic/AI/community) — the rest
  // (gold, complete-profile, psychology test, ...) are shown as earned-only.
  const tierPrefixes = TIERS.map(t => t.slug.split('_')[0]);
  const otherBadges = profile.badges.filter(b => !tierPrefixes.some(p => (b.slug ?? '').includes(p)));

  const myTagIds = new Set((myProfile?.lifestyle_tags ?? []).map(t => t.id));
  const promptAnswers = (profile.prompt_answers ?? []).filter(
    a => a.answer?.trim() && a.moderation_status === 'approved',
  );
  const dealbreakers = (profile.dealbreakers ?? []).filter(d => d.moderation_status === 'approved');
  const traitScores = buildPersonalityTraits(profile.latest_personality_test?.scores);
  const traitMasonryColumns = [
    traitScores.filter((_, index) => index % 2 === 0),
    traitScores.filter((_, index) => index % 2 === 1),
  ];
  const showAiSummary =
    profile.latest_personality_test?.assistant_analysis_status === 'completed' &&
    !!profile.latest_personality_test?.assistant_analysis?.summary;

  const handleLike = async () => {
    if (!session) return;
    if (reactionSubmitting) return;
    setReactionSubmitting('like');
    const previousLiked = liked;
    const previousCount = profile.likes_count ?? 0;
    const optimisticLiked = !previousLiked;
    const optimisticCount = Math.max(0, previousCount + (optimisticLiked ? 1 : -1));
    setLiked(optimisticLiked);
    setProfile(current => current ? {
      ...current,
      liked_by_me: optimisticLiked,
      likes_count: optimisticCount,
    } : current);
    profileCache.patch(profile.id, {
      liked_by_me: optimisticLiked,
      likes_count: optimisticCount,
    });
    try {
      const res = await discoverApi.interact(session.accessToken, profile.id, 'like');
      const nextLiked = !!res.data?.liked_by_me;
      const nextCount = res.data?.likes_count ?? optimisticCount;
      setLiked(nextLiked);
      setProfile(current => current ? {
        ...current,
        liked_by_me: nextLiked,
        likes_count: nextCount,
      } : current);
      profileCache.patch(profile.id, { liked_by_me: nextLiked, likes_count: nextCount });
      if (nextLiked && res.data?.mutual && res.data.mutual_user) {
        setMatchInfo({ user: res.data.mutual_user, message: res.data.mutual_message });
      } else if (nextLiked) {
        toast.success('لایک شد');
      } else {
        toast.info('لایک برداشته شد');
      }
    } catch (e: any) {
      setLiked(previousLiked);
      setProfile(current => current ? {
        ...current,
        liked_by_me: previousLiked,
        likes_count: previousCount,
      } : current);
      profileCache.patch(profile.id, { liked_by_me: previousLiked, likes_count: previousCount });
      toast.error(e.message ?? 'خطا در ثبت لایک');
    } finally {
      setReactionSubmitting(null);
    }
  };
  const handleAnon = () => {
    if (!session || !profile) return;
    setAnonConfirmOpen(true);
  };
  const confirmAnon = () => {
    if (!session || !profile) return;
    discoverApi.interact(session.accessToken, profile.id, 'anonymous_interest')
      .then(res => {
        if (res.data?.mutual && res.data.mutual_user) {
          setMatchInfo({ user: res.data.mutual_user, message: res.data.mutual_message });
        } else {
          toast.success('علاقه ناشناس فرستاده شد!');
        }
      })
      .catch((e: any) => toast.error(e.message ?? 'خطا'));
  };
  const handleInsight = () => {
    router.push({ pathname: '/ai-insight/user' as any, params: { userId: String(profile?.id), userName: profile?.first_name } });
  };
  const handleBlock = () => {
    if (!session || !profile) return;
    const isBlocked = blockStatus?.blocked_by_me ?? false;
    if (isBlocked) {
      confirmSheet.show('رفع مسدودیت', `آیا می‌خواهی ${profile.first_name} را رفع بلاک کنی؟`, [
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
      confirmSheet.show('مسدود کردن', `آیا می‌خواهی ${profile.first_name} را مسدود کنی؟`, [
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

  const stats: { label: string; value: string; accent?: boolean; icon?: ReactNode; onPress?: () => void }[] = [
    {
      label: 'سن',
      value: age == null ? '—' : toFaDigits(age),
    },
    {
      label: 'لایک',
      value: toFaDigits(profile.likes_count ?? 0),
      accent: liked,
      icon: <Heart size={12} color={liked ? Colors.accent : Colors.muted} fill={liked ? Colors.accent : 'none'} strokeWidth={2} />,
    },
  ];
  if (profile.height_cm != null) stats.push({ label: 'قد', value: toFaDigits(profile.height_cm) });

  return (
    <View style={styles.root}>
      <View style={styles.heroWrap}>
        <SafeAreaView edges={['top']}>
          <AppBar
            title=""
            back
            onBack={goBack}
            right={
              <TouchableOpacity style={styles.profileHeaderBtn} onPress={() => setActionsOpen(true)} hitSlop={8}>
                <MoreVertical size={20} color={Colors.ink} strokeWidth={2} />
              </TouchableOpacity>
            }
          />
        </SafeAreaView>

        {/* ── Profile card ────────────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfoSide}>
            <View style={styles.badgeRow}>
              {TIERS.map(tier => {
                const earned = hasBadge(profile, tier.slug);
                return (
                  <Badge
                    key={tier.slug}
                    kind={tier.kind}
                    label=""
                    locked={!earned}
                    onPress={earned ? () => setBadgeTier(tier) : undefined}
                  />
                );
              })}
              {otherBadges.map(b => {
                const kind = badgeKind(b.slug ?? '');
                return kind ? (
                  <Badge key={b.id} kind={kind} label="" onPress={() => setOtherBadgeKind(kind)} />
                ) : null;
              })}
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
                    {s.icon}
                    <Text style={[styles.statValue, s.accent && styles.statValueAccent]}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </Wrap>
                );
              })}
            </View>
          </View>

          <View style={styles.profileIdentitySide}>
            <TouchableOpacity
              style={styles.avatarRing}
              activeOpacity={photoUrl ? 0.85 : 1}
              disabled={!photoUrl}
              onPress={() => setAvatarViewerOpen(true)}
            >
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={[styles.avatarImg, styles.heroPh]}>
                  <User size={28} color={Colors.muted} strokeWidth={1.5} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{profile.first_name}</Text>
              {profile.username && <Text style={styles.usernameTxt}>@{profile.username}</Text>}
            </View>
          </View>
        </View>
      </View>

      {/* ── Content by tier ───────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CompatibilitySummary compatibility={normalizeCompatibility(profile.compatibility, {
          viewerId, candidateId: userId,
          day: profile.compatibility_day, tier: profile.compatibility_tier,
        })} detailed />
        {/* ── BASIC ─────────────────────────────────────────────────── */}
        {!isAtLeastSilver && (
          <>
            {/* Upsell card */}
            <View style={styles.upsellCard}>
              <View style={styles.upsellIcon}>
                <Lock size={20} color={Colors.purple} strokeWidth={2} />
              </View>
              <Text style={styles.upsellTxt}>
                برای دیدن امتیاز سازگاری، سبک زندگی و موارد بیشتر، اشتراکت رو ارتقا بده
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
              <Text style={styles.infoBlockLabel}>قفل در پلن پایه</Text>
              {['تطابق سبک زندگی', 'سبک زندگی', 'تست شخصیت', 'پاسخ آشنایی', 'معرفی صوتی'].map(l => (
                <LockedRow key={l} label={l} />
              ))}
            </View>
          </>
        )}

        {/* ── SILVER ────────────────────────────────────────────────── */}
        {isAtLeastSilver && profile.voice_intro_url && session?.accessToken && (
          <View style={styles.section}>
            <Text style={styles.infoBlockLabel}>معرفی صوتی</Text>
            <VoiceIntroPlayer uri={profile.voice_intro_url} token={session.accessToken} durationSeconds={profile.voice_intro_duration_seconds ?? 1} />
          </View>
        )}

        {isAtLeastSilver && !isGold && (
          <>
            <AboutCard
              bio={profile.bio}
              relationshipGoal={profile.relationship_goal}
              lifestyleTags={profile.lifestyle_tags}
              myTagIds={myTagIds}
              matchCount={profile.lifestyle_tags.filter(t => myTagIds.has(t.id)).length}
              languages={profile.languages}
              religiosityLevel={profile.religiosity_level}
              religioDiff={null}
              dealbreakers={[]}
              firstName={profile.first_name}
            />

            {/* Gold locked */}
            <GoldLockedCard />
          </>
        )}

        {/* ── GOLD ──────────────────────────────────────────────────── */}
        {isGold && (
          <>
            <AboutCard
              bio={profile.bio}
              relationshipGoal={profile.relationship_goal}
              lifestyleTags={profile.lifestyle_tags}
              myTagIds={myTagIds}
              languages={profile.languages}
              religiosityLevel={profile.religiosity_level}
              religioDiff={null}
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
                    {traitMasonryColumns.map((column, index) => (
                      <View key={index} style={styles.traitColumn}>
                        {column.map(trait => (
                          <TraitBar key={trait.key} label={trait.label} value={trait.value} />
                        ))}
                      </View>
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
            {profile.prompt_answers_locked && (
              <Pressable style={styles.promptCard} onPress={() => router.push('/subscription' as never)}>
                <Text style={styles.infoBlockLabel}>آشنایی با من</Text>
                <Text style={styles.promptA}>مشاهده پاسخ‌های آشنایی با من برای مشترکین نقره‌ای و طلایی فعال است.</Text>
              </Pressable>
            )}
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
                      {g.asset_url && !failedGiftAssetIds.has(g.sent_gift_id) ? (
                        <Image
                          source={{ uri: g.asset_url }}
                          style={styles.giftItemImage}
                          contentFit="contain"
                          onError={() => setFailedGiftAssetIds(prev => new Set(prev).add(g.sent_gift_id))}
                        />
                      ) : (
                        <Text style={styles.giftItemEmoji}>{giftEmoji(g)}</Text>
                      )}
                      <Text style={styles.giftItemTitle} numberOfLines={1}>{giftDisplayTitle(g.gift_title)}</Text>
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
      <View style={[styles.actions, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.giftBtn} onPress={() => setGiftOpen(true)}>
          <Gift size={18} color={Colors.goldDeep} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.anonBtn}
          onPress={handleAnon}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="ارسال علاقه ناشناس"
        >
          <VenetianMask size={18} color={Colors.purple} strokeWidth={2.2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={handleMessagePress}
          activeOpacity={0.85}
        >
          <MessageCircle size={15} color={Colors.accent} strokeWidth={2.2} />
          <Text style={styles.chatBtnTxt}>{existingConversation ? 'برو به چت' : 'پیام بفرست'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.likeBtn, reactionSubmitting === 'like' && styles.reactionBtnLoading]}
          onPress={handleLike}
          disabled={!!reactionSubmitting}
          activeOpacity={0.82}
        >
          {reactionSubmitting === 'like'
            ? <ActivityIndicator size="small" color={Colors.accent} />
            : <Heart size={18} color={Colors.accent} fill={liked ? Colors.accent : 'none'} strokeWidth={liked ? 0 : 2} />
          }
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
        coins={coins}
        onClose={() => setActionsOpen(false)}
        onGift={() => setGiftOpen(true)}
        onGoldBadge={() => router.push({ pathname: '/subscription/gold-badge', params: { userId: String(userId), userName: profile.first_name } } as never)}
        onAnon={handleAnon}
        onInsight={handleInsight}
        onBlock={handleBlock}
        onReport={handleReport}
      />
      <AnonConfirmSheet
        visible={anonConfirmOpen}
        firstName={profile.first_name}
        onClose={() => setAnonConfirmOpen(false)}
        onConfirm={confirmAnon}
      />
      <UserBadgeInfoModal
        tier={badgeTier}
        firstName={profile.first_name}
        onClose={() => setBadgeTier(null)}
      />
      <SimpleBadgeInfoModal
        kind={otherBadgeKind}
        description={otherBadgeKind ? OTHER_BADGE_DESC[otherBadgeKind] : ''}
        onClose={() => setOtherBadgeKind(null)}
      />
      <MatchCelebrationModal
        visible={!!matchInfo}
        otherName={matchInfo?.user.first_name ?? ''}
        otherAvatarUrl={matchInfo?.user.profile_photo?.urls?.medium ?? null}
        message={matchInfo?.message}
        onClose={() => setMatchInfo(null)}
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
  heroPh: { backgroundColor: Colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  profileHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 78, height: 78, borderRadius: 39, padding: 3,
    backgroundColor: Colors.bg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  profileCard: {
    backgroundColor: Colors.surface,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    minHeight: 116,
    marginTop: 10,
    paddingTop: 14, paddingBottom: 14, paddingHorizontal: 18,
    borderRadius: 28,
  },
  profileInfoSide: { flex: 1, alignItems: 'flex-start', minWidth: 0 },
  profileIdentitySide: { width: 96, alignItems: 'center', gap: 6 },
  badgeRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: 6, marginBottom: 6 },
  heroNameRow: { alignItems: 'center', gap: 1 },
  heroName: { fontSize: 13.5, fontFamily: Fonts.extraBold, color: Colors.ink, textAlign: 'center' },
  usernameTxt: { fontSize: 10.5, fontFamily: Fonts.regular, color: Colors.inkSoft, textAlign: 'center' },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.bg, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 4.5,
  },
  metaTxt: { fontSize: 11.5, color: Colors.inkSoft, fontFamily: Fonts.semiBold },

  statsRow: { flexDirection: 'row-reverse', gap: 7, marginTop: 10, alignSelf: 'stretch', flexWrap: 'wrap', justifyContent: 'flex-end' },
  statBox: {
    minWidth: 68,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.bg,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.lineSoft,
  },
  statBoxAccent: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent + '30' },
  statValue: { fontSize: 12.5, fontFamily: Fonts.extraBold, color: Colors.ink },
  statValueAccent: { color: Colors.accent },
  statLabel: { fontSize: 10.5, fontFamily: Fonts.regular, color: Colors.muted },

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
  giftItemImage: { width: 28, height: 28 },
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
  traitList: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 10,
  },
  traitColumn: { flex: 1, gap: 9 },
  traitChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: Colors.purpleSoft,
    borderWidth: 1,
    borderColor: Colors.purple + '18',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 30,
  },
  traitLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11.5,
    fontFamily: Fonts.bold,
    color: Colors.purple,
    textAlign: Platform.select({ web: 'right', default: 'left' }),
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  traitValue: {
    minWidth: 26,
    fontSize: 10.5,
    fontFamily: Fonts.extraBold,
    color: Colors.purple,
    textAlign: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
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
    backgroundColor: Colors.surface2, borderRadius: 12, padding: 12,
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
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8, textAlign: "right", justifyContent: "space-between",
    backgroundColor: Colors.purpleSoft, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.purple + '22',
  },
  noCompatTxt: { flex: 1, fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },

  // ── Action Bar ────────────────────────────────────────────────────────────
  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    writingDirection: 'ltr',
    paddingHorizontal: 18, paddingTop: 9,
    backgroundColor: 'rgba(16,19,26,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.lineSoft,
  },
  giftBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.goldSoft, alignItems: 'center', justifyContent: 'center',
  },
  anonBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.purpleSoft, alignItems: 'center', justifyContent: 'center',
  },
  chatBtn: {
    flex: 1, height: 42, borderRadius: 21,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1.5, borderColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
  },
  chatBtnTxt: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.accent },
  likeBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  reactionBtnLoading: { opacity: 0.82 },

  // ── Profile Actions Sheet ─────────────────────────────────────────────────
  sheetContent: { gap: 0, paddingTop: 4, paddingBottom: 24 },
  sheetTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink, textAlign: 'center' },
  sheetSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted, textAlign: 'center', marginTop: 2, marginBottom: 14 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetHeaderText: { flex: 1 },
  sheetHeaderTitle: { fontSize: 16, fontFamily: Fonts.extraBold, color: Colors.ink, textAlign: 'right' },
  sheetHeaderSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted, textAlign: 'right', marginTop: 2 },
  sheetCoinPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill,
    backgroundColor: Colors.goldSoft,
  },
  sheetCoinTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.goldDeep },
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
  sheetRowLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetRowLabel: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.ink },
  sheetRowSub: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  comingSoonBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
    backgroundColor: Colors.hair,
  },
  comingSoonBadgeTxt: { fontSize: 10, fontFamily: Fonts.semiBold, color: Colors.muted },
  sheetCancel: {
    marginTop: 10, paddingVertical: 14,
    backgroundColor: Colors.ph2, borderRadius: 16,
    alignItems: 'center',
  },
  sheetCancelTxt: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.inkSoft },

  // ── Anon confirm sheet ────────────────────────────────────────────────────
  anonIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.purple + '14',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 12,
  },
  anonConfirmBtn: {
    marginTop: 4, paddingVertical: 14,
    backgroundColor: Colors.purple, borderRadius: 16,
    alignItems: 'center',
  },
  anonConfirmTxt: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },

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
