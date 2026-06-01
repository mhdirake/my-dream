import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Settings, Pencil, Bell, Shield, Star, Coins, Users, ChevronLeft,
  type LucideIcon,
} from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Colors, Fonts } from '@/constants/colors';

const LIFESTYLE_TAGS = ['عاشق قهوه', 'کتاب‌خوان', 'اهل طبیعت', 'فیلم‌باز', 'عاشق گربه'];

type MenuItem = { icon: LucideIcon; iconColor: string; label: string; sub: string };

const MENU_ITEMS: MenuItem[] = [
  { icon: Pencil,   iconColor: Colors.purple,   label: 'ویرایش پروفایل',  sub: 'اطلاعات، عکس، Bio'       },
  { icon: Bell,     iconColor: Colors.trust,    label: 'اعلان‌ها',         sub: 'مدیریت اعلان‌ها'          },
  { icon: Shield,   iconColor: Colors.ok,       label: 'حریم خصوصی',      sub: 'Safe Mode، Trust Gate'    },
  { icon: Star,     iconColor: Colors.goldDeep, label: 'اشتراک و ارتقا',  sub: 'Silver · Gold'            },
  { icon: Coins,    iconColor: Colors.goldDeep, label: 'کیف پول و سکه',   sub: '۴۵۰ سکه موجود'            },
  { icon: Users,    iconColor: Colors.accent,   label: 'معرفی به دوستان', sub: 'پاداش بگیر'               },
  { icon: Settings, iconColor: Colors.inkSoft,  label: 'تنظیمات',         sub: 'حساب، امنیت'              },
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

export default function MeScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>من</Text>
          <TouchableOpacity style={styles.iconBtn}>
            <Settings size={18} color={Colors.ink} strokeWidth={1.9} />
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 38 }}>🌸</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>ندا م.</Text>
                <Badge kind="ai" label="" />
                <Badge kind="community" label="" />
              </View>
              <Text style={styles.sub}>@neda_m · تهران</Text>
              <Text style={styles.goal}>ازدواج</Text>
            </View>
            <CompletionRing value={72} />
          </View>

          <Text style={styles.bio}>عاشق قهوه، سفرهای کوتاه و گفت‌وگوهای عمیق.</Text>

          <View style={styles.tags}>
            {LIFESTYLE_TAGS.map(t => (
              <Chip key={t} small>{t}</Chip>
            ))}
          </View>

          <View style={styles.subBadge}>
            <Text style={styles.subBadgeTxt}>Basic · ۷ کشف امروز</Text>
            <TouchableOpacity>
              <Text style={styles.upgradeLink}>ارتقا</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { n: '۱۲', l: 'لایک دریافتی' },
            { n: '۳',  l: 'مَچ'           },
            { n: '۲',  l: 'گفت‌وگو'       },
          ].map((s, i, arr) => (
            <View key={s.l} style={[styles.statItem, i === arr.length - 1 && styles.statItemLast]}>
              <Text style={styles.statN}>{s.n}</Text>
              <Text style={styles.statL}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
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

        {/* Sign out */}
        <TouchableOpacity style={styles.signOut}>
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
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.ph2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.accent,
  },
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
