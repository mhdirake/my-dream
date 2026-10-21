import { photoStatusLabel } from '@/lib/profilePhoto';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { WebImageCropModal } from '@/components/ui/WebImageCropModal';
import { APP_VERSION_LABEL } from '@/constants/appVersion';
import { Chip } from '@/components/ui/Chip';
import { ProfileScoreModal } from '@/components/ProfileScoreModal';
import { VerificationBadgeModal } from '@/components/VerificationBadgeModal';
import { Colors, Fonts, Spacing } from '@/constants/colors';
import { hasBadge, TIERS, type Tier } from '@/constants/verificationTiers';
import { ApiError } from '@/lib/api/client';
import { onboardingApi } from '@/lib/api/onboarding';
import { paymentsApi } from '@/lib/api/payments';
import type { ClientProfile } from '@/lib/api/profile';
import { profileApi } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import {
  AlertTriangle, Bell, Bot, Brain, Camera, ChevronLeft, Coins, Eye, LayoutGrid,
  Pencil, Settings, Shield, Sparkles, Star, User, Users, type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { confirmSheet } from '@/lib/confirmSheet';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';
const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type MenuItem = { icon: LucideIcon; iconColor: string; label: string; sub: string; route?: string; comingSoon?: boolean };

const MENU_ITEMS: MenuItem[] = [
  { icon: Pencil,      iconColor: Colors.purple,   label: 'ویرایش پروفایل',    sub: 'اطلاعات، عکس، بیو',          route: '/profile-edit' },
  { icon: LayoutGrid,  iconColor: Colors.accent,   label: 'پیش‌نمایش پروفایل', sub: 'درصد تکمیل و موارد ناقص',   route: '/profile-setup/profile-preview' },
  { icon: Brain,       iconColor: Colors.purple,   label: 'تست شخصیت',          sub: 'تست شخصیت · بج طلایی',      route: '/profile-setup/personality-test-intro' },
  { icon: Sparkles,   iconColor: Colors.purple,   label: 'آنالیز هوش مصنوعی', sub: 'تحلیل شخصیتی من',            comingSoon: true },
  { icon: Bot,        iconColor: Colors.accent,   label: 'مربی هوش مصنوعی',  sub: 'گفتگو با مربی هوش مصنوعی',     comingSoon: true },
  { icon: Shield,     iconColor: Colors.trust,    label: 'احراز هویت',         sub: 'تأیید پایه · AI · جامعه',    route: '/verification' },
  { icon: Bell,        iconColor: Colors.trust,    label: 'اعلان‌ها',           sub: 'مدیریت اعلان‌ها',            route: '/notifications' },
  { icon: Shield,      iconColor: Colors.ok,       label: 'حریم خصوصی',        sub: 'حالت امن · کنترل پیام',      route: '/settings/privacy' },
  { icon: Star, iconColor: Colors.goldDeep, label: 'اشتراک‌های من', sub: 'فعال، در صف و تاریخچه', route: '/subscriptions' },
  { icon: Star,        iconColor: Colors.goldDeep, label: 'اشتراک و ارتقا',    sub: 'نقره‌ای · طلایی',            route: '/subscription' },
  { icon: Coins,       iconColor: Colors.goldDeep, label: 'کیف پول و سکه',     sub: 'سکه‌های من',                  route: '/gifts/wallet' },
  { icon: AlertTriangle, iconColor: Colors.danger,  label: 'محدودیت‌ها',         sub: 'وضعیت حساب',                 route: '/settings/restrictions' },
  { icon: Users,       iconColor: Colors.accent,   label: 'معرفی به دوستان',   sub: 'پاداش بگیر',                 route: '/referrals' },
  { icon: Settings,    iconColor: Colors.inkSoft,  label: 'تنظیمات',           sub: 'حساب، امنیت',                route: '/settings' },
];

function CompletionRing({ value }: { value: number }) {
  return (
    <View style={styles.ring}>
      <View style={[styles.ringGrad, { backgroundColor: Colors.accent }]} />
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
  const { bottom } = useSafeAreaInsets();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoError, setPhotoError] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const [badgeTier, setBadgeTier] = useState<Tier | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    profileApi.getProfile(session.accessToken)
      .then(setProfile)
      .catch(e => { if (e instanceof ApiError && e.status === 401) logout(); })
      .finally(() => setLoading(false));
    paymentsApi.getWallet(session.accessToken).then(w => setCoins(w.coin_balance)).catch(() => {});
  }, [logout, session]);

  const uploadPhoto = async (uri: string) => {
    if (!session?.accessToken) return;
    setLocalPhotoUri(uri);
    setPhotoUploading(true);
    try {
      await onboardingApi.uploadPhoto(session.accessToken, uri);
      const updated = await profileApi.getProfile(session.accessToken);
      setProfile(updated);
      setPhotoError(false);
    } catch {
      confirmSheet.show('خطا', 'آپلود عکس موفق نبود. دوباره تلاش کن.');
      setLocalPhotoUri(null);
    } finally {
      setPhotoUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      confirmSheet.show('دسترسی لازمه', 'برای انتخاب عکس باید دسترسی به گالری رو بدی.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      if (Platform.OS === 'web') {
        setCropUri(result.assets[0].uri);
        return;
      }
      uploadPhoto(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      confirmSheet.show('دسترسی لازمه', 'برای گرفتن عکس باید دسترسی به دوربین رو بدی.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      if (Platform.OS === 'web') {
        setCropUri(result.assets[0].uri);
        return;
      }
      uploadPhoto(result.assets[0].uri);
    }
  };

  const handleChangePhoto = () => {
    if (Platform.OS === 'web') {
      pickFromGallery();
    } else if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['لغو', 'انتخاب از گالری', 'گرفتن عکس'], cancelButtonIndex: 0 },
        i => { if (i === 1) pickFromGallery(); else if (i === 2) pickFromCamera(); },
      );
    } else {
      confirmSheet.show('تغییر عکس پروفایل', undefined, [
        { text: 'انتخاب از گالری', onPress: pickFromGallery },
        { text: 'گرفتن عکس', onPress: pickFromCamera },
        { text: 'لغو', style: 'cancel' },
      ]);
    }
  };

  const displayName = [profile?.first_name ?? user?.first_name, profile?.last_name ?? user?.last_name]
    .filter(Boolean).join(' ') || user?.username || '—';

  const photoUrl = absoluteUrl(profile?.profile_photo?.urls.medium ?? profile?.profile_photo?.urls.original);
  const completion = profile?.profile_completion_percent ?? 0;
  const PLAN_FA: Record<string, string> = { basic: 'پایه', silver: 'نقره‌ای', gold: 'طلایی' };
  const rawPlan = (profile?.active_subscription?.plan?.slug ?? 'basic').toLowerCase();
  const planLabel = PLAN_FA[rawPlan] ?? 'پایه';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <WebImageCropModal
        visible={Boolean(cropUri)}
        uri={cropUri}
        onCancel={() => setCropUri(null)}
        onComplete={uri => {
          setCropUri(null);
          uploadPhoto(uri);
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: bottom + 92 }]}>

        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarOuter} activeOpacity={0.85}>
              <View style={styles.avatarWrap}>
                {(localPhotoUri ?? photoUrl) && !photoError ? (
                  <Image
                    source={{ uri: localPhotoUri ?? photoUrl! }}
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
              <View style={styles.cameraBtn}>
                {photoUploading
                  ? <ActivityIndicator size="small" color={Colors.onAccent} />
                  : <Camera size={13} color={Colors.onAccent} strokeWidth={2.5} />
                }
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <TouchableOpacity onPress={() => router.push({pathname:'/profile-setup/photo' as any,params:{mode:'edit'}})} accessibilityRole="button">
              <Text style={{fontFamily:Fonts.regular,fontSize:12,color:profile?.profile_photo_status === 'rejected' ? Colors.danger : Colors.muted,textAlign:'right'}}>{photoStatusLabel(profile?.profile_photo_status)}</Text>
            </TouchableOpacity>
            <View style={styles.nameRow}>
                <Text style={styles.name}>{displayName}</Text>
              </View>
              <View style={styles.badgesRow}>
                {TIERS.map(tier => (
                  <Badge
                    key={tier.slug}
                    kind={tier.kind}
                    label=""
                    locked={!hasBadge(profile, tier.slug)}
                    onPress={() => setBadgeTier(tier)}
                  />
                ))}
                {hasBadge(profile, 'gold') && <Badge kind="gold" label="" />}
              </View>
              <Text style={styles.sub}>
                {/* U+2066/U+2069 LTR isolate: keeps "@<digits>" intact and right-placed in the RTL line */}
                {`⁦@${user?.username ?? '—'}⁩`}
                {profile?.city ? ` · ${profile.city}` : ''}
              </Text>
              {profile?.relationship_goal ? (
                <Text style={styles.goal}>{profile.relationship_goal.title}</Text>
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
              {profile!.lifestyle_tags.map(t => <Chip key={t.id} small>{t.title}</Chip>)}
            </View>
          ) : null}

          <View style={styles.walletRow}>
            <TouchableOpacity
              style={styles.walletHalf}
              activeOpacity={0.7}
              onPress={() => router.push('/gifts/wallet' as never)}
            >
              <Coins size={16} color={Colors.goldDeep} strokeWidth={2} />
              <View>
                <Text style={styles.walletValue}>
                  {coins == null ? '—' : toPersian(coins)}
                </Text>
                <Text style={styles.walletLabel}>سکه</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.walletDivider} />

            <TouchableOpacity
              style={styles.walletHalf}
              activeOpacity={0.7}
              onPress={() => router.push('/subscription' as never)}
            >
              <Star size={16} color={Colors.goldDeep} strokeWidth={2} />
              <View>
                <Text style={styles.walletValue}>{planLabel}</Text>
                <Text style={styles.walletLabel}>
                  {profile?.active_subscription ? 'اشتراک فعال' : 'اشتراک'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statN}>{toPersian(profile?.likes_count ?? 0)}</Text>
            <Text style={styles.statL}>لایک دریافتی</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => setScoreOpen(true)}
          >
            <Text style={styles.statN}>{toPersian(profile?.profile_quality_score ?? 0)}</Text>
            <Text style={styles.statL}>امتیاز پروفایل ⓘ</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => router.push('/viewed-me' as never)}
          >
            <Text style={styles.statN}>{toPersian(profile?.profile_views_count ?? 0)}</Text>
            <Text style={styles.statL}>بازدید پروفایل</Text>
          </TouchableOpacity>
        </View>

        <ProfileScoreModal
          visible={scoreOpen}
          score={profile?.profile_quality_score ?? 0}
          breakdown={profile?.quality_breakdown}
          onClose={() => setScoreOpen(false)}
          onCompleteProfile={() => {
            setScoreOpen(false);
            router.push('/profile-edit' as never);
          }}
        />

        <VerificationBadgeModal
          tier={badgeTier}
          profile={profile}
          onClose={() => setBadgeTier(null)}
        />

        <TouchableOpacity
          style={styles.viewedCard}
          onPress={() => router.push('/viewed-me' as never)}
          activeOpacity={0.8}
        >
          <View style={styles.viewedIcon}>
            <Eye size={18} color={Colors.accent} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.viewedTitle}>کی منو دید؟</Text>
            <Text style={styles.viewedSub}>بینندگان پروفایل رو ببین</Text>
          </View>
          <ChevronLeft size={16} color={Colors.muted} strokeWidth={2} />
        </TouchableOpacity>

        <Card style={styles.menu}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, i < MENU_ITEMS.length - 1 && styles.menuBorder]}
              activeOpacity={item.comingSoon ? 1 : 0.7}
              onPress={() => { if (item.comingSoon) return; if (item.route) router.push(item.route as never); }}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.iconColor + '18' }]}>
                <item.icon size={18} color={item.iconColor} strokeWidth={1.8} />
              </View>
              <View style={styles.menuText}>
                <View style={styles.menuLabelRow}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.comingSoon && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonBadgeTxt}>به زودی</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              {!item.comingSoon && <ChevronLeft size={16} color={Colors.muted} strokeWidth={2} />}
            </TouchableOpacity>
          ))}
        </Card>

        <Text style={styles.version}>{APP_VERSION_LABEL}</Text>

        <TouchableOpacity style={styles.signOut} onPress={logout}>
          <Text style={styles.signOutTxt}>خروج از حساب</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg },

  profileCard: { gap: 12 },
  profileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },

  avatarOuter: { position: 'relative' },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 36,
    overflow: 'hidden', borderWidth: 2, borderColor: Colors.accent,
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
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
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginVertical: 6 },
  name: { fontSize: 17, fontFamily: Fonts.extraBold, color: Colors.ink },
  sub: { fontSize: 11.5, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'right', writingDirection: 'rtl' },
  goal: { fontSize: 12, color: Colors.accent, fontFamily: Fonts.semiBold },
  bio: { fontSize: 13, color: Colors.inkSoft, lineHeight: 20, fontFamily: Fonts.regular },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },

  walletRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.hair, paddingTop: 12,
  },
  walletHalf: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center',
  },
  walletDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.hair, marginVertical: 2 },
  walletValue: { fontSize: 13.5, fontFamily: Fonts.extraBold, color: Colors.ink },
  walletLabel: { fontSize: 10, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 1 },

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
  },
  // Explicit 1px separator element — direction-agnostic, unlike side borders
  // whose `left`/`right`/`start`/`end` resolution differs on web vs native RTL.
  statDivider: { width: 1, backgroundColor: Colors.hair, marginVertical: 10 },
  statN: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  statL: { fontSize: 10.5, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },

  viewedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.hair,
    padding: 14,
    marginBottom: 12,
  },
  viewedIcon: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  viewedTitle: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  viewedSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 1 },

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
  menuLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuLabel: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  menuSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 1 },
  comingSoonBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
    backgroundColor: Colors.hair,
  },
  comingSoonBadgeTxt: { fontSize: 10, fontFamily: Fonts.semiBold, color: Colors.muted },

  version: {
    fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: Spacing.xl,
  },
  signOut: { alignItems: 'center', padding: 16, marginTop: 4 },
  signOutTxt: { fontSize: 13, color: Colors.danger, fontFamily: Fonts.semiBold },
});
