import { GiftModal } from '@/components/GiftModal';
import { TemplateMessageModal } from '@/components/TemplateMessageModal';
import { Colors, Fonts } from '@/constants/colors';
import { discoverApi } from '@/lib/api/discover';
import { profileApi } from '@/lib/api/profile';
import { profileCache } from '@/lib/cache/profileCache';
import { useAuth } from '@/lib/auth/AuthContext';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Gift,
  Heart,
  MapPin,
  MessageCircle,
  Sparkles,
  X,
} from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

function calcAge(birth: string) {
  return Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function ProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [profile] = useState(profileCache.get(Number(id)) ?? null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [authDealbreakers, setAuthDealbreakers] = useState<string[]>([]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  useEffect(() => {
    if (!session) return;
    discoverApi.recordProfileView(session.accessToken, Number(id)).catch(() => {});
    profileApi.getProfile(session.accessToken)
      .then(p => setAuthDealbreakers((p.dealbreakers ?? []).map(d => d.body)))
      .catch(() => {});
  }, [id, session]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.root}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <ArrowLeft size={22} color={Colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.empty}>
          <Text style={styles.emptyTxt}>پروفایل یافت نشد</Text>
          <TouchableOpacity onPress={goBack} style={{ marginTop: 12 }}>
            <Text style={[styles.emptyTxt, { color: Colors.accent }]}>بازگشت به اکتشاف</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const age = calcAge(profile.birth_date);
  const photoUrl = profile.profile_photo?.urls.large;

  const redFlags = authDealbreakers.filter(d =>
    profile.lifestyle_tags.some(t =>
      t.title.toLowerCase().includes(d.toLowerCase()) ||
      d.toLowerCase().includes(t.title.toLowerCase())
    )
  );

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
  const handleChat = () => setTemplateOpen(true);

  return (
    <View style={styles.root}>
      {/* Hero Photo */}
      <View style={styles.hero}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.heroPh]} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
          locations={[0, 0.25, 0.6, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <SafeAreaView style={styles.heroTop} edges={['top']}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <ArrowLeft size={22} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.heroBottom}>
          <View style={styles.nameRow}>
            <Text style={styles.heroName}>{profile.first_name}، {age}</Text>
            {profile.is_verified && (
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedTxt}>✓ تأییدشده</Text>
              </View>
            )}
          </View>
          {(profile.city || profile.province) && (
            <View style={styles.locRow}>
              <MapPin size={13} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              <Text style={styles.locTxt}>{profile.city ?? profile.province}</Text>
            </View>
          )}
          {profile.compatibility_score != null && (
            <TouchableOpacity
              style={styles.compatRow}
              onPress={() => router.push(`/user/compatibility?id=${profile.id}` as never)}
              activeOpacity={0.75}
            >
              <Sparkles size={12} color={Colors.purple} strokeWidth={2} />
              <Text style={styles.compatTxt}>{profile.compatibility_score}٪ تطابق</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Red flag warning */}
      {redFlags.length > 0 && (
        <View style={styles.redFlagBanner}>
          <AlertTriangle size={15} color={Colors.danger} strokeWidth={2} />
          <Text style={styles.redFlagTxt}>
            این پروفایل با یک یا چند dealbreaker تو همخوانی داره
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {profile.relationship_goal && (
          <View style={styles.goalPill}>
            <Text style={styles.goalTxt}>{profile.relationship_goal.title}</Text>
          </View>
        )}

        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        ) : null}

        {profile.lifestyle_tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>سبک زندگی</Text>
            <View style={styles.tagRow}>
              {profile.lifestyle_tags.map(t => (
                <View key={t.id} style={styles.tag}>
                  <Text style={styles.tagTxt}>{t.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(profile.height_cm != null) && (
          <View style={styles.infoRow}>
            {profile.height_cm != null && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillTxt}>📏 {profile.height_cm} سانتی‌متر</Text>
              </View>
            )}
          </View>
        )}

        {profile.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>نشان‌ها</Text>
            <View style={styles.tagRow}>
              {profile.badges.map(b => (
                <View key={b.id} style={styles.badgePill}>
                  <Text style={styles.badgeTxt}>
                    {b.slug === 'ai_trusted' ? '🤖 AI Trusted' : b.slug === 'community_verified' ? '👥 Community' : b.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.passBtn} onPress={handlePass}>
          <X size={24} color={Colors.danger} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.giftBtn} onPress={() => setGiftOpen(true)}>
          <Gift size={22} color={Colors.goldDeep} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
          <Heart size={30} color="#fff" fill="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
          <MessageCircle size={22} color={Colors.trust} strokeWidth={2} />
        </TouchableOpacity>
      </View>

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
        onSent={() => {
          setTemplateOpen(false);
          goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  hero: { height: 420, position: 'relative' },
  heroPh: { backgroundColor: Colors.purpleSoft },
  heroTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: {
    margin: 12,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBottom: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroName: { fontSize: 26, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: -0.5 },
  verifiedPill: {
    backgroundColor: Colors.trust, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  verifiedTxt: { fontSize: 11, fontFamily: Fonts.bold, color: '#fff' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locTxt: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.regular },
  compatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  compatTxt: { fontSize: 12, fontFamily: Fonts.bold, color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  goalPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSoft,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6,
  },
  goalTxt: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.accent },

  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.muted },
  bio: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 24 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.purpleSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  tagTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.purple },

  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoPill: {
    backgroundColor: Colors.ph2, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  infoPillTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.inkSoft },

  badgePill: {
    backgroundColor: Colors.trustSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  badgeTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.trust },

  redFlagBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: Colors.dangerSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  redFlagTxt: { flex: 1, fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.danger, lineHeight: 18 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.regular },

  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 16, paddingBottom: 34, paddingTop: 12,
    backgroundColor: Colors.bg,
    borderTopWidth: 1, borderTopColor: Colors.lineSoft,
  },
  passBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.dangerSoft, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.danger, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  giftBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.goldSoft, alignItems: 'center', justifyContent: 'center',
  },
  likeBtn: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  chatBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.trustSoft, alignItems: 'center', justifyContent: 'center',
  },
});
