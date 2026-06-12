import { Colors, Fonts, Radius } from '@/constants/colors';
import { ClientProfile, profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ChevronLeft,
  Flag,
  Globe,
  MapPin,
  Pencil,
  Sliders,
  Sparkles,
  Target,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  iconColor: string;
  label: string;
  value: string;
  onPress: () => void;
};

function buildSections(profile: ClientProfile): Section[] {
  const push = (path: string, params: Record<string, string>) =>
    router.push({ pathname: path as any, params });

  const bioPreview = profile.bio
    ? profile.bio.length > 50 ? profile.bio.slice(0, 50) + '…' : profile.bio
    : '—';

  const infoPreview = [
    profile.height_cm ? `قد ${profile.height_cm}` : '',
    profile.job ?? '',
    profile.education ?? '',
  ].filter(Boolean).join(' · ') || '—';

  const locationPreview = [profile.city, profile.province].filter(Boolean).join('، ') || '—';

  return [
    {
      icon: Pencil,
      iconColor: Colors.accent,
      label: 'درباره من (Bio)',
      value: bioPreview,
      onPress: () => push('/profile-setup/bio', {
        mode: 'edit',
        currentBio: profile.bio ?? '',
      }),
    },
    {
      icon: Target,
      iconColor: Colors.ok,
      label: 'هدف رابطه',
      value: profile.relationship_goal?.title ?? '—',
      onPress: () => push('/profile-setup/rel-goal', {
        mode: 'edit',
        currentGoalId: profile.relationship_goal ? String(profile.relationship_goal.id) : '',
      }),
    },
    {
      icon: Sparkles,
      iconColor: Colors.purple,
      label: 'سبک زندگی',
      value: profile.lifestyle_tags.length > 0 ? `${profile.lifestyle_tags.length} تگ انتخاب شده` : '—',
      onPress: () => push('/profile-setup/lifestyle', {
        mode: 'edit',
        currentTagIds: JSON.stringify(profile.lifestyle_tags.map(t => t.id)),
      }),
    },
    {
      icon: Globe,
      iconColor: Colors.trust,
      label: 'زبان‌ها',
      value: profile.languages.length > 0 ? profile.languages.map(l => l.title).join('، ') : '—',
      onPress: () => push('/profile-setup/languages', {
        mode: 'edit',
        currentLangIds: JSON.stringify(profile.languages.map(l => l.id)),
        currentPrimary: String(profile.languages.find(l => l.pivot?.is_primary)?.id ?? ''),
      }),
    },
    {
      icon: Flag,
      iconColor: Colors.danger,
      label: 'Deal Breakers',
      value: profile.dealbreakers.filter(d => d.body).length > 0
        ? `${profile.dealbreakers.filter(d => d.body).length} مورد`
        : '—',
      onPress: () => push('/profile-setup/red-flags', {
        mode: 'edit',
        currentFlags: JSON.stringify(profile.dealbreakers.map(d => d.body).filter(Boolean)),
      }),
    },
    {
      icon: Sliders,
      iconColor: Colors.inkSoft,
      label: 'قد / شغل / تحصیلات',
      value: infoPreview,
      onPress: () => push('/profile-setup/optional-info', {
        mode: 'edit',
        currentHeight: profile.height_cm ? String(profile.height_cm) : '',
        currentJob: profile.job ?? '',
        currentEducation: profile.education ?? '',
      }),
    },
    {
      icon: MapPin,
      iconColor: Colors.warn,
      label: 'موقعیت مکانی',
      value: locationPreview,
      onPress: () => router.push('/profile-setup/location' as any),
    },
  ];
}

export default function ProfileEditHub() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    profileApi.getProfile(session.accessToken)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [session]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/(tabs)/me' as never);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <ArrowLeft size={20} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ویرایش پروفایل</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : error || !profile ? (
        <View style={styles.center}>
          <Text style={styles.emptyTxt}>خطا در بارگذاری</Text>
          <TouchableOpacity onPress={goBack} style={{ marginTop: 12 }}>
            <Text style={[styles.emptyTxt, { color: Colors.accent }]}>بازگشت</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {buildSections(profile).map((s, i, arr) => (
              <TouchableOpacity
                key={s.label}
                style={[styles.row, i < arr.length - 1 && styles.rowBorder]}
                onPress={s.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: s.iconColor + '18' }]}>
                  <s.icon size={17} color={s.iconColor} strokeWidth={1.9} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{s.label}</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>{s.value}</Text>
                </View>
                <ChevronLeft size={16} color={Colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 60 }} />
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTxt: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.regular },

  content: { padding: 16 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.hair,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.hair,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.ink },
  rowValue: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
});
