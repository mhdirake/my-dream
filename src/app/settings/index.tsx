import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import {
  AlertTriangle, ChevronLeft, Lock, LogOut,
  MessageCircle, Shield, Trash2, type LucideIcon,
} from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SettingItem = {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  sub?: string;
  route?: string;
  onPress?: () => void;
  danger?: boolean;
};

export default function SettingsScreen() {
  const { logout } = useAuth();

  const handleDeleteAccount = () => {
    Alert.alert(
      'حذف حساب',
      'این عمل غیرقابل بازگشت است. تمام اطلاعات، مکالمات و سکه‌هایت حذف خواهند شد.',
      [
        { text: 'لغو', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => Alert.alert('به زودی', 'این قابلیت به زودی اضافه می‌شود.') },
      ],
    );
  };

  const SECTIONS: { title: string; items: SettingItem[] }[] = [
    {
      title: 'حریم خصوصی',
      items: [
        {
          icon: Shield, iconColor: Colors.ok,
          label: 'حریم خصوصی و حالت امن',
          sub: 'Safe Mode، کنترل پیام',
          route: '/settings/privacy',
        },
        {
          icon: MessageCircle, iconColor: Colors.trust,
          label: 'کنترل دریافت پیام',
          sub: 'چه کسی می‌تونه پیام بده',
          route: '/settings/trust-gate',
        },
        {
          icon: AlertTriangle, iconColor: Colors.danger,
          label: 'محدودیت‌ها',
          sub: 'وضعیت حساب و سابقه',
          route: '/settings/restrictions',
        },
      ],
    },
    {
      title: 'حساب',
      items: [
        {
          icon: Lock, iconColor: Colors.purple,
          label: 'تغییر رمز عبور',
          sub: 'از طریق Keycloak',
          onPress: () => Alert.alert('به زودی', 'این قابلیت به زودی اضافه می‌شود.'),
        },
        {
          icon: LogOut, iconColor: Colors.danger,
          label: 'خروج از حساب',
          danger: true,
          onPress: logout,
        },
        {
          icon: Trash2, iconColor: Colors.danger,
          label: 'حذف حساب',
          sub: 'غیرقابل بازگشت',
          danger: true,
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="تنظیمات" back />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card style={styles.card}>
              {section.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}
                    onPress={item.onPress ?? (() => item.route && router.push(item.route as never))}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: item.iconColor + '18' }]}>
                      <Icon size={18} color={item.iconColor} strokeWidth={1.8} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowLabel, item.danger && { color: item.iconColor }]}>
                        {item.label}
                      </Text>
                      {item.sub && <Text style={styles.rowSub}>{item.sub}</Text>}
                    </View>
                    {item.route && (
                      <ChevronLeft size={16} color={Colors.muted} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </Card>
          </View>
        ))}

        <Text style={styles.version}>نسخه ۱.۰.۰</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: 6 },

  sectionTitle: {
    fontSize: 11, fontFamily: Fonts.extraBold, color: Colors.muted,
    marginTop: Spacing.lg, marginBottom: 6,
  },

  card: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.hair },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  rowSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 1 },

  version: {
    fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: Spacing.xl,
  },
});
