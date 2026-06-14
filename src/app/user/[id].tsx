import { GiftModal } from '@/components/GiftModal';
import { TemplateMessageModal } from '@/components/TemplateMessageModal';
import { Badge } from '@/components/ui/Badge';
import { Colors, Fonts } from '@/constants/colors';
import { discoverApi } from '@/lib/api/discover';
import { profileApi, type ClientProfile, type UserProfile } from '@/lib/api/profile';
import { profileCache } from '@/lib/cache/profileCache';
import { useAuth } from '@/lib/auth/AuthContext';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Brain,
  Eye,
  Flag,
  Gift,
  Heart,
  Lock,
  MessageCircle,
  MoreVertical,
  Share2,
  Sparkles,
  Star,
  UserX,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const RELIGIOSITY: Record<number, string> = {
  1: 'غیرمذهبی',
  2: 'کم‌مذهب',
  3: 'متوسط',
  4: 'مذهبی',
  5: 'بسیار مذهبی',
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

// ── ProfileActionsSheet ───────────────────────────────────────────────────────

function ProfileActionsSheet({
  visible, firstName, onClose, onGift, onAnon, onInsight, onBlock, onReport, onShare,
}: {
  visible: boolean;
  firstName: string;
  onClose: () => void;
  onGift: () => void;
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
    { icon: <Eye size={18} color={Colors.purple} strokeWidth={2} />, label: 'علاقه ناشناس', onPress: onAnon },
    { icon: <Sparkles size={18} color={Colors.purple} strokeWidth={2} />, label: `AI Insight ${firstName}`, sub: '۵۰ سکه', onPress: onInsight },
    { icon: <UserX size={18} color={Colors.danger} strokeWidth={2} />, label: 'بلاک کاربر', danger: true, onPress: onBlock },
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

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = Number(id);

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

  const [giftOpen, setGiftOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    try {
      const [data, me] = await Promise.all([
        profileApi.getUserProfile(session.accessToken, userId),
        profileApi.getProfile(session.accessToken),
      ]);
      setProfile(prev => ({
        ...data,
        compatibility_score: prev?.compatibility_score ?? data.compatibility_score,
      }));
      setMyProfile(me);
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
          <TouchableOpacity onPress={goBack} style={{ marginTop: 12 }}>
            <Text style={[styles.emptyTxt, { color: Colors.accent }]}>بازگشت</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const age = calcAge(profile.birth_date);
  const photoUrl = profile.profile_photo?.urls.large;
  const plan = (myProfile?.active_subscription?.plan ?? 'basic').toLowerCase() as 'basic' | 'silver' | 'gold';
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
  const promptAnswers = (profile.prompt_answers ?? []).filter(a => a.answer?.trim());

  const handleLike = () => {
    if (!session) return;
    discoverApi.interact(session.accessToken, profile.id, 'like').catch(() => {});
    goBack();
  };
  const handlePass = () => {
    if (!session) return;
    discoverApi.interact(session.accessToken, profile.id, 'pass').catch(() => {});
    goBack();
  };
  const handleAnon = () => {
    // TODO: anonymous interest (coin spend)
  };
  const handleInsight = () => {
    // TODO: AI Insight (coin spend)
  };
  const handleBlock = () => {
    // TODO: block user
  };
  const handleReport = () => {
    // TODO: report sheet (CH-12 / PV-8 report)
  };
  const handleShare = () => {
    // TODO: share profile
  };

  return (
    <View style={styles.root}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.heroPh]} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.42)', 'transparent', 'transparent', 'rgba(0,0,0,0.72)']}
          locations={[0, 0.18, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <SafeAreaView style={styles.heroTop} edges={['top']}>
          <TouchableOpacity style={styles.backBtnLight} onPress={goBack}>
            <ArrowLeft size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn} onPress={() => setActionsOpen(true)}>
            <MoreVertical size={20} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Glass name overlay */}
        <View style={styles.heroGlass}>
          {profile.badges.length > 0 && (
            <View style={styles.badgeRow}>
              {profile.badges.map(b => (
                <Badge key={b.id} kind={badgeKind(b.slug)} label="" />
              ))}
            </View>
          )}
          <Text style={styles.heroName}>{profile.first_name}، {age}</Text>
          <View style={styles.metaRow}>
            {(profile.city || profile.province) && (
              <Text style={styles.metaTxt}>
                📍 {profile.city ?? profile.province}
              </Text>
            )}
            {profile.job && (
              <Text style={styles.metaTxt}>· 💼 {profile.job}</Text>
            )}
          </View>
          {profile.compatibility_score != null && (
            <TouchableOpacity
              style={styles.compatPill}
              onPress={() => router.push(`/user/compatibility?id=${profile.id}` as never)}
              activeOpacity={0.75}
            >
              <Sparkles size={11} color={Colors.purple} strokeWidth={2} />
              <Text style={styles.compatTxt}>{profile.compatibility_score}٪ تطابق</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Red Flag Banner ───────────────────────────────────────────────── */}
      {redFlags.length > 0 && (
        <View style={styles.redFlagBanner}>
          <AlertTriangle size={14} color={Colors.danger} strokeWidth={2} />
          <Text style={styles.redFlagTxt}>
            این پروفایل با {redFlags.length > 1 ? 'چند' : 'یک'} dealbreaker تو همخوانی داره
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

            {/* Bio */}
            {profile.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}

            {/* Relationship goal */}
            {profile.relationship_goal && (
              <View style={styles.goalPill}>
                <Text style={styles.goalTxt}>{profile.relationship_goal.title}</Text>
              </View>
            )}

            {/* Locked rows */}
            <View style={styles.lockedList}>
              <Text style={styles.sectionTitle}>قفل در Basic</Text>
              {['Lifestyle Match', 'سبک زندگی', 'تست شخصیت', 'پاسخ آشنایی', 'Voice Intro'].map(l => (
                <LockedRow key={l} label={l} />
              ))}
            </View>
          </>
        )}

        {/* ── SILVER ────────────────────────────────────────────────── */}
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

            {/* Bio */}
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            {/* Relationship goal */}
            {profile.relationship_goal && (
              <View style={styles.goalPill}>
                <Text style={styles.goalTxt}>{profile.relationship_goal.title}</Text>
              </View>
            )}

            {/* Lifestyle tags */}
            {profile.lifestyle_tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  سبک زندگی
                  {lifestyleMatchPct != null && (
                    <Text style={{ color: Colors.ok }}> · {profile.lifestyle_tags.filter(t => myTagIds.has(t.id)).length} تگ مشترک</Text>
                  )}
                </Text>
                <View style={styles.tagRow}>
                  {profile.lifestyle_tags.map(t => (
                    <View key={t.id} style={[styles.tag, myTagIds.has(t.id) && styles.tagMatch]}>
                      <Text style={[styles.tagTxt, myTagIds.has(t.id) && styles.tagTxtMatch]}>
                        {myTagIds.has(t.id) ? '✓ ' : ''}{t.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Languages */}
            {profile.languages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>زبان‌ها</Text>
                <Text style={styles.plainTxt}>
                  {profile.languages.map(l => l.title).join(' · ')}
                </Text>
              </View>
            )}

            {/* Religiosity */}
            {profile.religiosity_level != null && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>میزان مذهبی</Text>
                <Text style={styles.plainTxt}>
                  {RELIGIOSITY[profile.religiosity_level]}
                  {religioDiff && (
                    <Text style={{ color: Colors.muted }}> · {religioDiff}</Text>
                  )}
                </Text>
              </View>
            )}

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

            {/* Bio */}
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            {/* Prompt answers */}
            {promptAnswers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>آشنایی با من</Text>
                <View style={styles.promptList}>
                  {promptAnswers.slice(0, 5).map(a => (
                    <View key={a.id} style={styles.promptCard}>
                      <BookOpen size={13} color={Colors.purple} strokeWidth={2} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        {a.prompt?.text && (
                          <Text style={styles.promptQ}>{a.prompt.text}</Text>
                        )}
                        <Text style={styles.promptA}>{a.answer}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Personality test */}
            {profile.latest_personality_test && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>تست شخصیت</Text>
                <View style={styles.personalityChip}>
                  <Brain size={13} color={Colors.purple} strokeWidth={2} />
                  <Text style={styles.personalityTxt}>{profile.latest_personality_test.result_title}</Text>
                </View>
              </View>
            )}

            {/* Relationship goal */}
            {profile.relationship_goal && (
              <View style={styles.goalPill}>
                <Text style={styles.goalTxt}>{profile.relationship_goal.title}</Text>
              </View>
            )}

            {/* Lifestyle tags (all visible, with match highlight) */}
            {profile.lifestyle_tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>سبک زندگی</Text>
                <View style={styles.tagRow}>
                  {profile.lifestyle_tags.map(t => (
                    <View key={t.id} style={[styles.tag, myTagIds.has(t.id) && styles.tagMatch]}>
                      <Text style={[styles.tagTxt, myTagIds.has(t.id) && styles.tagTxtMatch]}>
                        {myTagIds.has(t.id) ? '✓ ' : ''}{t.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Languages */}
            {profile.languages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>زبان‌ها</Text>
                <Text style={styles.plainTxt}>
                  {profile.languages.map(l => l.title).join(' · ')}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Action Bar ───────────────────────────────────────────────────── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.passBtn} onPress={handlePass}>
          <X size={22} color={Colors.danger} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.giftBtn} onPress={() => setGiftOpen(true)}>
          <Gift size={20} color={Colors.goldDeep} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatGradBtn}
          onPress={() => setTemplateOpen(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Colors.gradColors}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.chatGradInner}
          >
            <MessageCircle size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.chatGradTxt}>پیام بفرست</Text>
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
        onClose={() => setActionsOpen(false)}
        onGift={() => setGiftOpen(true)}
        onAnon={handleAnon}
        onInsight={handleInsight}
        onBlock={handleBlock}
        onReport={handleReport}
        onShare={handleShare}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.regular },
  loadingHeader: { paddingTop: 12, paddingHorizontal: 12 },
  backBtnDark: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.ph2,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: { height: 400, position: 'relative' },
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
  heroGlass: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  heroName: { fontSize: 24, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  metaTxt: { fontSize: 12, color: Colors.inkSoft, fontFamily: Fonts.regular },
  compatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
    backgroundColor: Colors.purpleSoft, alignSelf: 'flex-start',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.purple + '33',
  },
  compatTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.purple },

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
  scrollContent: { padding: 16, gap: 16 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 11.5, fontFamily: Fonts.bold, color: Colors.muted, letterSpacing: 0.3 },
  bio: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 24 },
  plainTxt: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 20 },

  goalPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSoft, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.accent + '22',
  },
  goalTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.accent },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tagMatch: { backgroundColor: Colors.okSoft },
  tagTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.purple },
  tagTxtMatch: { color: Colors.ok },

  promptList: { gap: 10 },
  promptCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.lineSoft,
  },
  promptQ: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.purple, marginBottom: 4 },
  promptA: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 20 },

  personalityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  personalityTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.purple },

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
    paddingHorizontal: 16, paddingBottom: 34, paddingTop: 12,
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
});
