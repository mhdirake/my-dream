import { Colors, Fonts, Radius } from '@/constants/colors';
import { profileCache } from '@/lib/cache/profileCache';
import { ClientProfile, profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Heart, Sparkles, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function ScoreRing({ score }: { score: number }) {
  return (
    <View style={styles.scoreWrap}>
      <LinearGradient
        colors={Colors.gradColors}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.scoreRing}
      />
      <View style={styles.scoreInner}>
        <Text style={styles.scoreNum}>{score}</Text>
        <Text style={styles.scorePct}>٪</Text>
      </View>
    </View>
  );
}

function MatchRow({
  label,
  matched,
  detail,
}: {
  label: string;
  matched: boolean;
  detail?: string;
}) {
  return (
    <View style={styles.matchRow}>
      <View style={[styles.matchIcon, matched ? styles.matchIconYes : styles.matchIconNo]}>
        {matched
          ? <Check size={14} color={Colors.ok} strokeWidth={2.5} />
          : <X size={14} color={Colors.muted} strokeWidth={2.5} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.matchLabel}>{label}</Text>
        {detail ? <Text style={styles.matchDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

export default function CompatibilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const profile = profileCache.get(Number(id)) ?? null;
  const [authProfile, setAuthProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    profileApi.getProfile(session.accessToken)
      .then(setAuthProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.emptyTxt}>پروفایل یافت نشد</Text>
        </View>
      </SafeAreaView>
    );
  }

  const score = profile.compatibility_score ?? 0;

  const sharedTags = authProfile
    ? profile.lifestyle_tags.filter(t =>
        authProfile.lifestyle_tags.some(at => at.id === t.id)
      )
    : [];

  const goalMatch =
    authProfile?.relationship_goal != null &&
    profile.relationship_goal != null &&
    authProfile.relationship_goal.id === profile.relationship_goal.id;

  const hasSharedTags = sharedTags.length > 0;

  const scoreLabel =
    score >= 80 ? 'تطابق عالی' :
    score >= 60 ? 'تطابق خوب' :
    score >= 40 ? 'تطابق متوسط' : 'تطابق کم';

  const scoreColor =
    score >= 80 ? Colors.ok :
    score >= 60 ? Colors.trust :
    score >= 40 ? Colors.warn : Colors.muted;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as never)}
        >
          <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تحلیل تطابق</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Score hero */}
          <View style={styles.heroSection}>
            <Text style={styles.profileName}>{profile.first_name}</Text>
            <ScoreRing score={score} />
            <View style={[styles.scoreLabelPill, { backgroundColor: scoreColor + '22' }]}>
              <Sparkles size={12} color={scoreColor} strokeWidth={2} />
              <Text style={[styles.scoreLabelTxt, { color: scoreColor }]}>{scoreLabel}</Text>
            </View>
          </View>

          {/* Breakdown card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>جزئیات تطابق</Text>

            <MatchRow
              label="هدف رابطه"
              matched={goalMatch}
              detail={
                goalMatch
                  ? `هر دو: ${profile.relationship_goal?.title}`
                  : profile.relationship_goal?.title ?? '—'
              }
            />

            <MatchRow
              label="علاقه‌های مشترک"
              matched={hasSharedTags}
              detail={
                hasSharedTags
                  ? `${sharedTags.length} مورد مشترک`
                  : 'علاقه مشترکی پیدا نشد'
              }
            />

            <MatchRow
              label="سبک زندگی"
              matched={profile.lifestyle_tags.length > 0}
              detail={`${profile.lifestyle_tags.length} ویژگی اعلام شده`}
            />
          </View>

          {/* Shared tags */}
          {sharedTags.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Heart size={14} color={Colors.accent} strokeWidth={2} fill={Colors.accent} />
                <Text style={styles.cardTitle}>علاقه‌های مشترک</Text>
              </View>
              <View style={styles.tagRow}>
                {sharedTags.map(t => (
                  <View key={t.id} style={styles.sharedTag}>
                    <Text style={styles.sharedTagTxt}>{t.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* All profile tags */}
          {profile.lifestyle_tags.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>سبک زندگی {profile.first_name}</Text>
              <View style={styles.tagRow}>
                {profile.lifestyle_tags.map(t => {
                  const isShared = sharedTags.some(s => s.id === t.id);
                  return (
                    <View key={t.id} style={[styles.lifeTag, isShared && styles.lifeTagShared]}>
                      <Text style={[styles.lifeTagTxt, isShared && styles.lifeTagTxtShared]}>
                        {t.title}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.regular },

  content: { padding: 16, gap: 12 },

  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hair,
    gap: 12,
  },
  profileName: { fontSize: 17, fontFamily: Fonts.extraBold, color: Colors.ink },

  scoreWrap: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreRing: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
  },
  scoreInner: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
    gap: 1,
  },
  scoreNum: { fontSize: 28, fontFamily: Fonts.extraBold, color: Colors.ink },
  scorePct: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.muted, alignSelf: 'flex-end', paddingBottom: 4 },

  scoreLabelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5,
  },
  scoreLabelTxt: { fontSize: 12, fontFamily: Fonts.bold },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.hair,
    padding: 16,
    gap: 14,
  },
  cardTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.muted },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  matchIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  matchIconYes: { backgroundColor: Colors.okSoft },
  matchIconNo: { backgroundColor: Colors.ph2 },
  matchLabel: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  matchDetail: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  sharedTag: {
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  sharedTagTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.accent },

  lifeTag: {
    backgroundColor: Colors.ph2,
    borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  lifeTagShared: { backgroundColor: Colors.accentSoft },
  lifeTagTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.inkSoft },
  lifeTagTxtShared: { color: Colors.accent },
});
