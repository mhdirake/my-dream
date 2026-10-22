import { AppBar } from '@/components/ui/AppBar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Colors, Fonts, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { onboardingApi, type OnboardingStatus } from '@/lib/api/onboarding';
import { profileApi, type ClientProfile } from '@/lib/api/profile';
import { toast } from '@/lib/toast';
import { profileCompletionLabel } from '@/lib/localization';
import { Image } from 'expo-image';
import { watchProfileResume } from '@/lib/profileRefresh';
import { useFocusEffect, router } from 'expo-router';
import { AlertCircle, ChevronLeft, Edit3, User } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

function absoluteUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${BASE}${path}`;
}

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/** Matches a verification/badge slug by its prefix (e.g. 'basic', 'ai', 'community', 'gold'). */
const hasBadge = (p: ClientProfile | null, prefix: string) =>
  !!p?.badges?.some(b => (b.slug ?? '').includes(prefix));

function CompletionRing({ pct, color }: { pct: number; color: string }) {
  const size = 58;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.lineSoft} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - v / 100)}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.ringPct, { color }]}>{toPersian(Math.round(v))}٪</Text>
    </View>
  );
}

function calcAge(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

export default function ProfilePreviewScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!session?.accessToken) return;
    let active = true;
    let version = 0;
    const refresh = () => {
      const request = ++version;
      Promise.all([
        onboardingApi.getStatus(session.accessToken),
        profileApi.getProfile(session.accessToken),
      ])
        .then(([s, p]) => { if (active && request === version) { setStatus(s); setProfile(p); } })
        .catch(e => { if (active && request === version) toast.error(e.message ?? 'خطا در بارگذاری'); })
        .finally(() => { if (active && request === version) setLoading(false); });
    };
    refresh();
    const unsubscribe = watchProfileResume(refresh);
    return () => { active = false; unsubscribe(); };
  }, [session]));

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const user = status?.user;
  const pct = status?.completion_percent ?? 0;
  const missing = status?.missing_completion_items ?? [];
  const photoUrl = absoluteUrl(profile?.profile_photo?.urls?.medium);
  const tags = profile?.lifestyle_tags ?? [];
  const goal = profile?.relationship_goal;
  const age = calcAge(user?.birth_date);
  const barColor = pct >= 80 ? Colors.ok : pct >= 50 ? Colors.gold : Colors.accent;

  const EditButton = (
    <TouchableOpacity
      style={styles.editBtn}
      onPress={() => router.push('/profile-edit' as any)}
    >
      <Edit3 size={14} color={Colors.accent} strokeWidth={2} />
      <Text style={styles.editTxt}>ویرایش</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="پیش‌نمایش پروفایل" back backFallback="/me" right={EditButton} contentGap />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Completion card */}
        <Card soft style={styles.completionCard}>
          <View style={styles.completionRow}>
            <CompletionRing pct={pct} color={barColor} />
            <View style={styles.completionInfo}>
              <Text style={styles.completionLabel}>تکمیل پروفایل</Text>
              <Text style={styles.completionSub}>
                {missing.length > 0
                  ? `${toPersian(missing.length)} مورد برای تکمیل مونده`
                  : 'پروفایلت کامله'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Photo + name + age + city */}
        <View style={styles.profileHead}>
          <View style={styles.photoWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.photoFallback}>
                <User size={32} color={Colors.muted} strokeWidth={1.5} />
              </View>
            )}
          </View>
          <Text style={styles.name}>
            {user?.first_name ?? '—'}
            {age ? `، ${toPersian(age)} ساله` : ''}
          </Text>
          {!!user?.city && <Text style={styles.city}>📍 {user.city}</Text>}

          {/* Verification badges */}
          {(hasBadge(profile, 'basic') || hasBadge(profile, 'ai') || hasBadge(profile, 'community') || hasBadge(profile, 'gold')) && (
            <View style={styles.badgeRow}>
              {hasBadge(profile, 'basic') && <Badge kind="check" />}
              {hasBadge(profile, 'ai') && <Badge kind="ai" />}
              {hasBadge(profile, 'community') && <Badge kind="community" />}
              {hasBadge(profile, 'gold') && <Badge kind="gold" />}
            </View>
          )}
        </View>

        {/* Bio */}
        {!!profile?.bio && (
          <Card soft style={styles.section}>
            <Text style={styles.sectionLabel}>درباره من</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </Card>
        )}

        {/* Relationship goal */}
        {!!goal && (
          <View style={styles.goalSection}>
            <Text style={styles.sectionLabel}>هدف از آشنایی</Text>
            <Chip tone="accent" small>{goal.title}</Chip>
          </View>
        )}

        {/* Lifestyle tags */}
        {tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>سبک زندگی</Text>
            <View style={styles.tagsRow}>
              {tags.map(t => (
                <Chip key={t.id} small>{t.title}</Chip>
              ))}
            </View>
          </View>
        )}

        {/* Missing items */}
        {missing.length > 0 && (
          <Card soft style={styles.section}>
            <View style={styles.missingHeader}>
              <AlertCircle size={14} color={Colors.gold} strokeWidth={2} />
              <Text style={styles.missingTitle}>چه چیزهایی ناقص است؟</Text>
            </View>
            {missing.map((item, i) => (
              <View key={i} style={styles.missingItem}>
                <ChevronLeft size={13} color={Colors.muted} strokeWidth={2} />
                <Text style={styles.missingItemText}>
                  {profileCompletionLabel(item.key, item.label)}
                </Text>
                <Text style={styles.missingWeight}>+{toPersian(item.weight)}٪</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button variant="accent" onPress={() => router.replace('/(tabs)/me' as any)}>
          رفتن به پروفایل
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editTxt: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.accent },
  content: { padding: Spacing.lg },
  completionCard: { marginBottom: Spacing.lg },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  completionInfo: { flex: 1 },
  completionLabel: { fontSize: 13.5, color: Colors.ink, fontFamily: Fonts.bold, marginBottom: 3 },
  completionSub: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular },
  ringPct: { fontSize: 13, fontFamily: Fonts.extraBold },
  profileHead: { alignItems: 'center', marginBottom: Spacing.xl },
  photoWrap: {
    width: 90, height: 90, borderRadius: 45, overflow: 'hidden',
    backgroundColor: Colors.ph, marginBottom: 12,
  },
  photoFallback: {
    width: '100%', height: '100%',
    backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 20, fontFamily: Fonts.extraBold, color: Colors.ink, marginBottom: 4 },
  city: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  section: { marginBottom: Spacing.lg },
  goalSection: { marginBottom: Spacing.lg },
  sectionLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 8 },
  bioText: { fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  missingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  missingTitle: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.ink },
  missingItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.hair,
  },
  missingItemText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft },
  missingWeight: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.gold },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
