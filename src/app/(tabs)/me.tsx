import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Colors, Fonts } from '@/constants/colors';
import { ApiError } from '@/lib/api/client';
import type { ClientProfile } from '@/lib/api/profile';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, ChevronLeft, Coins, Pencil, Settings,
  Shield, Star, User, Users, type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

type MenuItem = { icon: LucideIcon; iconColor: string; label: string; sub: string };

const MENU_ITEMS: MenuItem[] = [
  { icon: Pencil,   iconColor: Colors.purple,   label: 'ویرایش پروفایل',  sub: 'اطلاعات، عکس، Bio'    },
  { icon: Bell,     iconColor: Colors.trust,    label: 'اعلان‌ها',         sub: 'مدیریت اعلان‌ها'       },
  { icon: Shield,   iconColor: Colors.ok,       label: 'حریم خصوصی',      sub: 'Safe Mode، Trust Gate' },
  { icon: Star,     iconColor: Colors.goldDeep, label: 'اشتراک و ارتقا',  sub: 'Silver · Gold'         },
  { icon: Coins,    iconColor: Colors.goldDeep, label: 'کیف پول و سکه',   sub: 'سکه‌های من'             },
  { icon: Users,    iconColor: Colors.accent,   label: 'معرفی به دوستان', sub: 'پاداش بگیر'            },
  { icon: Settings, iconColor: Colors.inkSoft,  label: 'تنظیمات',         sub: 'حساب، امنیت'           },
];

function CompletionRing({ value }: { value: number }) {
  return (
    <View style={styles.ring}>
      <LinearGradient
        colors={Colors.gradColors}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.ringGrad}
      />
      <View style={styles.ringInner}>
        <Text style={styles.ringValue}>{value}٪</Text>
        <Text style={styles.ringLabel}>پروفایل</Text>
      </View>
    </View>
  );
}

function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export default function MeScreen() {
  const { user, session, logout } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    profileApi.getProfile(session.accessToken)
      .then(setProfile)
      .catch(e => { if (e instanceof ApiError && e.status === 401) logout(); })
      .finally(() => setLoading(false));
  }, [session]);

  const displayName = [profile?.first_name ?? user?.first_name, profile?.last_name ?? user?.last_name]
    .filter(Boolean).join(' ') || user?.username || '—';

  const photoUrl = absoluteUrl(profile?.profile_photo?.urls.medium);
  const completion = profile?.profile_completion_percent ?? 0;
  const planLabel = profile?.active_subscription?.plan ?? 'Basic';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>من</Text>
          <TouchableOpacity style={styles.iconBtn}>
            <Settings size={18} color={Colors.ink} strokeWidth={1.9} />
          </TouchableOpacity>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarWrap}>
              {photoUrl && !photoError ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <User size={32} color={Colors.accent} strokeWidth={1.5} />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{displayName}</Text>
                <Badge kind="ai" label="" />
                <Badge kind="community" label="" />
              </View>
              <Text style={styles.sub}>
                @{user?.username ?? '—'}
                {profile?.city ? ` · ${profile.city}` : ''}
              </Text>
              {profile?.relationship_goal ? (
                <Text style={styles.goal}>{profile.relationship_goal.label}</Text>
              ) : null}
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <CompletionRing value={completion} />
            )}
          </View>

          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {(profile?.lifestyle_tags?.length ?? 0) > 0 ? (
            <View style={styles.tags}>
              {profile!.lifestyle_tags.map(t => <Chip key={t.id} small>{t.label}</Chip>)}
            </View>
          ) : null}

          <View style={styles.subBadge}>
            <Text style={styles.subBadgeTxt}>{planLabel}</Text>
            {!profile?.active_subscription ? (
              <TouchableOpacity>
                <Text style={styles.upgradeLink}>ارتقا</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        <View style={styles.statsRow}>
          {[
            { n: '۰', l: 'لایک دریافتی' },
            { n: '۰', l: 'مَچ'           },
            { n: '۰', l: 'گفت‌وگو'       },
          ].map((s, i, arr) => (
            <View key={s.l} style={[styles.statItem, i === arr.length - 1 && styles.statItemLast]}>
              <Text style={styles.statN}>{s.n}</Text>
              <Text style={styles.statL}>{s.l}</Text>
            </View>
          ))}
        </View>

        <Card style={styles.menu}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, i < MENU_ITEMS.length - 1 && styles.menuBorder]}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.iconColor + '18' }]}>
                <item.icon size={18} color={item.iconColor} strokeWidth={1.8} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <ChevronLeft size={16} color={Colors.muted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity style={styles.signOut} onPress={logout}>
          <Text style={styles.signOutTxt}>خروج از حساب</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16 },

  header: {
    height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },

  profileCard: { gap: 12 },
  profileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },

  avatarWrap: {
    width: 72, height: 72, borderRadius: 36,
    overflow: 'hidden', borderWidth: 2, borderColor: Colors.accent,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%', height: '100%',
    backgroundColor: Colors.ph2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 28, fontFamily: Fonts.extraBold, color: Colors.accent },

  profileInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 17, fontFamily: Fonts.extraBold, color: Colors.ink },
  sub: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular },
  goal: { fontSize: 12, color: Colors.accent, fontFamily: Fonts.semiBold },
  bio: { fontSize: 13, color: Colors.inkSoft, lineHeight: 20, fontFamily: Fonts.regular },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },

  subBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.hair,
  },
  subBadgeTxt: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular },
  upgradeLink: { fontSize: 12, color: Colors.accent, fontFamily: Fonts.bold },

  ring: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  ringGrad: { position: 'absolute', width: 62, height: 62, borderRadius: 31 },
  ringInner: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  ringValue: { fontSize: 13, fontFamily: Fonts.extraBold, color: Colors.accent },
  ringLabel: { fontSize: 7.5, fontFamily: Fonts.regular, color: Colors.muted, marginTop: -1 },

  statsRow: {
    flexDirection: 'row', marginTop: 12, marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.hair,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: Colors.hair,
  },
  statItemLast: { borderRightWidth: 0 },
  statN: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  statL: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },

  menu: { padding: 0, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 14,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.hair },
  menuIcon: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  menuSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 1 },

  signOut: { alignItems: 'center', padding: 16, marginTop: 12 },
  signOutTxt: { fontSize: 13, color: Colors.danger, fontFamily: Fonts.semiBold },
});
