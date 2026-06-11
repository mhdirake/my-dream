// Discover tab — Swipe + Daily Suggestions
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { GiftModal } from '@/components/GiftModal';
import { TemplateMessageModal } from '@/components/TemplateMessageModal';
import { Colors, Fonts } from '@/constants/colors';
import { DiscoverProfile, discoverApi } from '@/lib/api/discover';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileCache } from '@/lib/cache/profileCache';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Gift, Heart, MessageCircle, Search, ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Mode = 'swipe' | 'daily' | 'ai';

const MODES: { id: Mode; label: string }[] = [
  { id: 'swipe', label: 'Swipe' },
  { id: 'daily', label: 'پیشنهاد روزانه' },
  { id: 'ai', label: 'AI Match' },
];

function calcAge(birthDate: string) {
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function ModeSwitch({ active, onPress }: { active: Mode; onPress: (m: Mode) => void }) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.modeScroll} style={styles.modeScrollWrapper}>
      {MODES.map(m => {
        const on = m.id === active;
        return (
          <TouchableOpacity
            key={m.id}
            onPress={() => onPress(m.id)}
            style={[styles.modeBtn, on && styles.modeBtnActive]}
          >
            <Text style={[styles.modeTxt, on && styles.modeTxtActive]}>{m.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function SwipeCard({ profile }: { profile: DiscoverProfile; onInteract: (type: 'like' | 'pass') => void }) {
  const age = calcAge(profile.birth_date);
  const photoUrl = profile.profile_photo?.urls.large;
  return (
    <TouchableOpacity activeOpacity={0.95} onPress={() => router.push(`/user/${profile.id}` as never)} style={styles.swipeCard}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.cardPhoto}>
          <View style={styles.cardAvatarPlaceholder} />
        </View>
      )}

      <View style={styles.cardTopRight}>
        {profile.badges.some(b => b.slug === 'ai_trusted') && <Badge kind="ai" label="AI Trusted" />}
      </View>
      {profile.compatibility_score != null && (
        <View style={styles.cardTopLeft}>
          <View style={styles.compatBadge}>
            <Sparkles size={11} color={Colors.purple} strokeWidth={2} />
            <Text style={styles.compatText}>{profile.compatibility_score}٪</Text>
          </View>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={styles.cardGradient}
        pointerEvents="none"
      />

      <View style={styles.cardBottom}>
        <View style={styles.cardGlass}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{profile.first_name}، {age}</Text>
            {profile.is_verified && <Badge kind="check" label="" />}
          </View>
          <View style={styles.cardMeta}>
            {profile.city && <Text style={styles.cardMetaTxt}>📍 {profile.city}</Text>}
            {profile.relationship_goal && (
              <>
                <Text style={styles.cardDot}>·</Text>
                <Text style={styles.cardGoal}>{profile.relationship_goal.label}</Text>
              </>
            )}
          </View>
          <View style={styles.tagRow}>
            {profile.lifestyle_tags.slice(0, 3).map(t => (
              <View key={t.id} style={styles.tagPill}>
                <Text style={styles.tagTxt}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ActionButtons({
  onLike,
  onPass,
  onGift,
  onChat,
}: {
  onLike: () => void;
  onPass: () => void;
  onGift: () => void;
  onChat: () => void;
}) {
  const heartScale = useRef(new Animated.Value(1)).current;

  const onLikeIn = () =>
    Animated.spring(heartScale, { toValue: 0.88, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onLikeOut = () =>
    Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }).start();

  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity style={styles.actionSide} onPress={onPass} activeOpacity={0.6}>
        <X size={20} color={Colors.danger} strokeWidth={2.5} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionSide} onPress={onGift} activeOpacity={0.6}>
        <Gift size={20} color={Colors.goldDeep} strokeWidth={2} />
      </TouchableOpacity>

      <Pressable onPress={onLike} onPressIn={onLikeIn} onPressOut={onLikeOut}>
        <Animated.View style={[styles.actionLike, { transform: [{ scale: heartScale }] }]}>
          <LinearGradient
            colors={Colors.gradColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 31 }]}
          />
          <Heart size={28} color="#fff" fill="#fff" strokeWidth={1.8} style={{ zIndex: 1 }} />
        </Animated.View>
      </Pressable>

      <TouchableOpacity style={styles.actionSide} onPress={onChat} activeOpacity={0.6}>
        <MessageCircle size={20} color={Colors.trust} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

function SwipeView({ profiles, loading, token, onInteract }: {
  profiles: DiscoverProfile[];
  loading: boolean;
  token: string;
  onInteract: (userId: number, type: 'like' | 'pass') => void;
}) {
  const [index, setIndex] = useState(0);
  const [giftTarget, setGiftTarget] = useState<DiscoverProfile | null>(null);
  const [templateTarget, setTemplateTarget] = useState<DiscoverProfile | null>(null);
  const current = profiles[index];

  if (loading) {
    return (
      <View style={styles.centerEmpty}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }
  if (!current) {
    return (
      <View style={styles.centerEmpty}>
        <Text style={styles.emptyTxt}>کشف جدیدی نیست</Text>
      </View>
    );
  }

  const handleInteract = (type: 'like' | 'pass') => {
    onInteract(current.id, type);
    setIndex(i => i + 1);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.swipeContent} showsVerticalScrollIndicator={false}>
        <SwipeCard profile={current} onInteract={handleInteract} />
        <ActionButtons
          onLike={() => handleInteract('like')}
          onPass={() => handleInteract('pass')}
          onGift={() => setGiftTarget(current)}
          onChat={() => setTemplateTarget(current)}
        />
        <Text style={styles.swipeRemain}>{profiles.length - index - 1} کشف باقی‌مانده</Text>
      </ScrollView>
      {giftTarget && (
        <GiftModal
          visible
          userId={giftTarget.id}
          firstName={giftTarget.first_name}
          token={token}
          onClose={() => setGiftTarget(null)}
        />
      )}
      {templateTarget && (
        <TemplateMessageModal
          visible
          userId={templateTarget.id}
          firstName={templateTarget.first_name}
          token={token}
          onClose={() => setTemplateTarget(null)}
          onSent={() => setTemplateTarget(null)}
        />
      )}
    </>
  );
}

function DailyView({ profiles, loading }: {
  profiles: DiscoverProfile[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.centerEmpty}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.dailyContent} showsVerticalScrollIndicator={false}>
      {profiles.map(p => (
        <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => router.push(`/user/${p.id}` as never)}>
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
                <View style={styles.dailyAvatarPlaceholder} />
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
                <View style={styles.dailyNote}>
                  <Sparkles size={9} color={Colors.purple} strokeWidth={2} />
                  <Text style={styles.dailyNoteTxt}>{p.relationship_goal.label}</Text>
                </View>
              )}
              <View style={styles.tagRow}>
                {p.lifestyle_tags.slice(0, 3).map(t => <Chip key={t.id} small>{t.label}</Chip>)}
              </View>
            </View>
          </View>
        </Card>
        </TouchableOpacity>
      ))}
      {profiles.length === 0 && (
        <View style={styles.centerEmpty}>
          <Text style={styles.emptyTxt}>پیشنهادی موجود نیست</Text>
        </View>
      )}
      <Card soft style={styles.upgradeCard}>
        <Text style={styles.upgradeTxt}>پیشنهادهای بیشتر؟</Text>
        <Text style={styles.upgradeSub}>Silver: ۵ · Gold: ۱۰ پیشنهاد در روز</Text>
      </Card>
    </ScrollView>
  );
}

function AiView() {
  return (
    <View style={styles.aiEmpty}>
      <Sparkles size={48} color={Colors.purple} strokeWidth={1.4} />
      <Text style={styles.aiTitle}>AI Match Assistant</Text>
      <Text style={styles.aiSub}>این قابلیت فقط برای کاربران Gold فعال است</Text>
      <View style={[styles.upgradeCard, { marginTop: 24, width: '100%' }]}>
        <Text style={[styles.upgradeTxt, { color: Colors.gold }]}>Gold</Text>
        <Text style={styles.upgradeSub}>دسترسی به هوش مصنوعی برای Match دقیق‌تر</Text>
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const [mode, setMode] = useState<Mode>('swipe');
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [safeMode, setSafeMode] = useState(false);

  const fetchProfiles = useCallback((safe: boolean) => {
    if (!session) return;
    setLoading(true);
    discoverApi.getProfiles(session.accessToken, 15, safe)
      .then(data => { profileCache.setMany(data); setProfiles(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => { fetchProfiles(safeMode); }, [fetchProfiles]);

  const toggleSafeMode = () => {
    const next = !safeMode;
    setSafeMode(next);
    fetchProfiles(next);
  };

  const handleInteract = async (userId: number, type: 'like' | 'pass') => {
    if (!session) return;
    discoverApi.interact(session.accessToken, userId, type).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>کشف</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, safeMode && styles.iconBtnSafe]}
            onPress={toggleSafeMode}
          >
            <ShieldCheck
              size={17}
              color={safeMode ? Colors.ok : Colors.ink}
              strokeWidth={2}
            />
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

      <ModeSwitch active={mode} onPress={setMode} />

      {mode === 'swipe' && <SwipeView profiles={profiles} loading={loading} token={session?.accessToken ?? ''} onInteract={handleInteract} />}
      {mode === 'daily' && <DailyView profiles={profiles} loading={loading} />}
      {mode === 'ai' && <AiView />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnSafe: { backgroundColor: Colors.okSoft },
  safeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: Colors.okSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  safeBannerTxt: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ok },
  notifDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent, borderWidth: 1.5, borderColor: '#fff',
  },

  modeScrollWrapper: { flexGrow: 0 },
  modeScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 7 },
  modeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(36,33,42,0.04)',
  },
  modeBtnActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  modeTxt: { fontFamily: Fonts.semiBold, fontSize: 12.5, color: Colors.muted },
  modeTxtActive: { color: '#fff', fontFamily: Fonts.extraBold },

  // Swipe card
  swipeContent: { padding: 16, paddingBottom: 100 },
  swipeCard: {
    height: 440,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.purpleSoft,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardPhoto: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  cardAvatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.ph,
  },
  cardTopRight: { position: 'absolute', top: 14, right: 14 },
  cardTopLeft: { position: 'absolute', top: 14, left: 14 },
  compatBadge: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  compatText: { fontFamily: Fonts.extraBold, fontSize: 12, color: Colors.purple },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220 },
  cardBottom: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  cardGlass: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
  },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ink, letterSpacing: -0.5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  cardMetaTxt: { fontSize: 12.5, color: Colors.inkSoft, fontFamily: Fonts.regular },
  cardDot: { color: Colors.muted },
  cardGoal: { fontSize: 12.5, color: Colors.accent, fontFamily: Fonts.bold },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagPill: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  tagTxt: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.inkSoft },

  // ── Action buttons ──────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 20,
  },
  actionSide: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  actionLike: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  // ───────────────────────────────────────────────────────────────────────────
  swipeRemain: {
    textAlign: 'center', marginTop: 14,
    fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.semiBold,
  },

  // Daily
  dailyContent: { padding: 16, gap: 12, paddingBottom: 100 },
  dailyCard: { padding: 12 },
  dailyRow: { flexDirection: 'row', gap: 12 },
  dailyAvatar: {
    width: 78, height: 98, borderRadius: 16,
    backgroundColor: Colors.ph2, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  dailyAvatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.ph,
  },
  dailyCompat: {
    position: 'absolute', bottom: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  dailyCompatTxt: { fontFamily: Fonts.extraBold, fontSize: 10, color: Colors.purple },
  dailyInfo: { flex: 1 },
  dailyName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink },
  dailyCity: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 1 },
  dailyNote: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start',
  },
  dailyNoteTxt: { fontSize: 10.5, color: Colors.purple, fontFamily: Fonts.bold },
  upgradeCard: { padding: 14, alignItems: 'center', gap: 6 },
  upgradeTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  upgradeSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center' },

  // AI
  aiEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  aiTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink, marginTop: 12 },
  aiSub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 6 },
  centerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.regular },
});
