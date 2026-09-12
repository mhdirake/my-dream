import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getPushPreferences,
  registerAndSyncPushToken,
  setPushPreferences,
} from '@/lib/notifications/push';
import { toast } from '@/lib/toast';
import { Bell, BellOff } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettingsScreen() {
  const { session } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [activeDevices, setActiveDevices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const preferences = await getPushPreferences(session.accessToken);
      setEnabled(preferences.enabled);
      setActiveDevices(preferences.active_devices);
    } catch (error: any) {
      toast.error(error.message ?? 'دریافت تنظیمات اعلان ممکن نشد');
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (next: boolean) => {
    if (!session?.accessToken || saving) return;
    setSaving(true);
    try {
      const preferences = await setPushPreferences(session.accessToken, next);
      setEnabled(preferences.enabled);
      setActiveDevices(preferences.active_devices);
      if (next) {
        await registerAndSyncPushToken(session.accessToken);
        await load();
        toast.success('اعلان‌ها فعال شدند');
      } else {
        toast.success('اعلان‌ها غیرفعال شدند');
      }
    } catch (error: any) {
      toast.error(error.message ?? 'ذخیره تنظیمات اعلان ممکن نشد');
    } finally {
      setSaving(false);
    }
  };

  const Icon = enabled ? Bell : BellOff;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="اعلان‌ها" back backFallback="/settings" />
      <View style={styles.content}>
        <Card style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon size={24} color={enabled ? Colors.accent : Colors.muted} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>اعلان‌های دستگاه</Text>
            <Text style={styles.subtitle}>
              پیام، درخواست گفتگو، مچ، هدیه، پرداخت و هشدارهای امنیتی
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            <Switch
              value={enabled}
              onValueChange={toggle}
              disabled={saving}
              trackColor={{ false: Colors.hair, true: Colors.accentSoft }}
              thumbColor={enabled ? Colors.accent : Colors.muted}
            />
          )}
        </Card>

        <Text style={styles.note}>
          مشاهده پروفایل برای حفظ حریم خصوصی اعلان دستگاه ایجاد نمی‌کند. برای دریافت اعلان باید مجوز سیستم‌عامل نیز فعال باشد.
        </Text>
        {enabled && activeDevices > 0 ? (
          <Text style={styles.device}>این حساب روی {activeDevices.toLocaleString('fa-IR')} دستگاه فعال است.</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  copy: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  subtitle: { fontSize: 11.5, lineHeight: 18, fontFamily: Fonts.regular, color: Colors.inkSoft },
  note: { fontSize: 11.5, lineHeight: 20, fontFamily: Fonts.regular, color: Colors.muted },
  device: { fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.ok },
});
