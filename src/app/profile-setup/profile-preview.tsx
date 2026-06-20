import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { onboardingApi, type OnboardingStatus } from '@/lib/api/onboarding';
import { profileApi, type ClientProfile } from '@/lib/api/profile';
import { toast } from '@/lib/toast';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AlertCircle, ChevronLeft, Edit3, User } from 'lucide-react-native';
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

const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

function absoluteUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${BASE}${path}`;
}

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

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
  const { session } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.all([
      onboardingApi.getStatus(session.accessToken),
      profileApi.getProfile(session.accessToken),
    ])
      .then(([s, p]) => { setStatus(s); setProfile(p); })
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

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
  const badges = profile?.badges ?? [];
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
      <AppBar title="پیش‌نمایش پروفایل" back right={EditButton} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Completion card */}
        <Card soft style={styles.completionCard}>
          <View style={styles.completionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.completionLabel}>تکمیل پروفایل</Text>
              <Text style={styles.completionPct}>{toPersian(pct)}٪</Text>
            </View>
            <View style={[styles.pctCircle, { borderColor: barColor }]}>
              <Text style={[styles.pctCircleText, { color: barColor }]}>{toPersian(pct)}</Text>
            </View>
          </View>
          <View style={styles.progTrack}>
            <View style={[styles.progFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
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

          {/* Badges */}
          {badges.length > 0 && (
            <View style={styles.badgeRow}>
              {badges.slice(0, 3).map((b, i) => (
                <View key={i} style={styles.badge}>
                  <Text style={styles.badgeText}>{b.label ?? b.title ?? ''}</Text>
                </View>
              ))}
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
                <Text style={styles.missingItemText}>{item.label}</Text>
                <Text style={styles.missingWeight}>+{toPersian(item.weight)}٪</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button variant="accent" onPress={() => router.replace('/(tabs)/' as any)}>
          ورود به اپ
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
  content: { padding: Spacing.xl },
  completionCard: { marginBottom: Spacing.lg },
  completionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  completionLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 4 },
  completionPct: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ink },
  pctCircle: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  pctCircleText: { fontSize: 14, fontFamily: Fonts.extraBold },
  progTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(36,33,42,0.08)' },
  progFill: { height: 8, borderRadius: 4 },
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
  badge: {
    backgroundColor: Colors.accentSoft, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 10.5, fontFamily: Fonts.semiBold, color: Colors.accent },
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
