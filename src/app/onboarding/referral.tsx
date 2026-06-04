import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Colors, Fonts } from '@/constants/colors';
import { authApi } from '@/lib/api/auth';
import { registrationStore } from '@/lib/registrationStore';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const REWARDS = [
  { n: '۳ نفر', r: '۱ ماه Silver' },
  { n: '۵ نفر', r: '۱۰۰۰ سکه' },
  { n: '۱۰ نفر', r: '۱ ماه Gold' },
];

export default function ReferralScreen() {
  const { saveRegistrationSession } = useAuth();
  const [referrer, setReferrer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doRegister = async (referrer_username?: string) => {
    setError('');
    setLoading(true);
    try {
      const { registration_token, username, email, password, password_confirmation } =
        registrationStore.get();
      // TODO: uncomment before release
      // if (!registration_token || !username || !password || !password_confirmation) {
      //   setError('اطلاعات ناقص است. لطفاً از ابتدا شروع کنید.');
      //   return;
      // }
      const res = await authApi.register({
        registration_token: registration_token!,
        username: username!,
        email: email || undefined,
        password: password!,
        password_confirmation: password_confirmation!,
        referrer_username: referrer_username || undefined,
      });
      await saveRegistrationSession(
        res.access_token,
        res.refresh_token,
        res.expires_in,
      );
      router.replace('/(tabs)/' as any);
    } catch (e: any) {
      setError(e.message ?? 'خطا در ثبت‌نام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar
        title="کد معرف"
        back
        right={
          <Text
            onPress={() => doRegister()}
            style={[styles.skip, loading && styles.skipDisabled]}
          >
            رد کن
          </Text>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.illustration}>
          <Text style={{ fontSize: 48 }}>🤝</Text>
        </View>

        <Text style={styles.headline}>کسی معرفیت کرده؟</Text>
        <Text style={styles.body}>
          Username معرف رو وارد کن. هر دوتون از پاداش بهره می‌برید.
        </Text>

        <Field
          label="Username معرف"
          value={referrer}
          onChangeText={setReferrer}
          placeholder="@username"
          hint="فقط هنگام ثبت‌نام قابل اضافه شدن است"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card soft>
          <Text style={styles.rewardTitle}>پاداش‌های معرف</Text>
          {REWARDS.map((r, i) => (
            <View
              key={r.n}
              style={[styles.rewardRow, i < REWARDS.length - 1 && styles.rewardBorder]}
            >
              <Text style={styles.rewardN}>{r.n} با اشتراک فعال</Text>
              <Text style={styles.rewardR}>{r.r}</Text>
            </View>
          ))}
        </Card>

        <View style={{ height: 16 }} />
        <Button
          variant="accent"
          onPress={() => doRegister(referrer.replace('@', '') || undefined)}
          disabled={loading}
        >
          {loading ? 'در حال ثبت‌نام...' : 'ثبت معرف و ادامه'}
        </Button>
        <View style={{ height: 8 }} />
        <Button variant="ghost" onPress={() => doRegister()} disabled={loading}>
          ندارم، رد کن
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 14 },
  illustration: {
    height: 130,
    backgroundColor: Colors.ph2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.ink, textAlign: 'right' },
  body: { fontSize: 12, color: Colors.muted, lineHeight: 20, fontFamily: Fonts.regular, textAlign: 'right', marginTop: -4 },
  skip: { fontSize: 12, color: Colors.accent, fontFamily: Fonts.semiBold },
  skipDisabled: { opacity: 0.4 },
  error: { fontSize: 12, color: Colors.danger, textAlign: 'right', fontFamily: Fonts.regular },
  rewardTitle: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 8 },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rewardBorder: { borderBottomWidth: 1, borderBottomColor: Colors.lineSoft, borderStyle: 'dashed' },
  rewardN: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  rewardR: { fontSize: 11, color: Colors.accent, fontFamily: Fonts.bold },
});
