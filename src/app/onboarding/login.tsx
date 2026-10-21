import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Colors, Fonts } from '@/constants/colors';
import { onboardingApi } from '@/lib/api/onboarding';
import { useAuth } from '@/lib/auth/AuthContext';
import { loginMobileNumber, normalizeIranMobileInput } from '@/lib/iranMobile';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { loginWithPassword } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const mobile = loginMobileNumber(phone);
  const canSubmit = mobile !== null && password.length >= 8;

  const handleLogin = async () => {
    if (!canSubmit || !mobile || loading) return;
    setLoading(true);
    try {
      const session = await loginWithPassword(mobile, password);
      try {
        const status = await onboardingApi.getStatus(session.accessToken);
        if (!status.can_enter_app) {
          if (status.next_required_step === 'profile_photo') {
            router.replace('/profile-setup/photo' as any);
          } else {
            router.replace('/profile-setup/basic-info' as any);
          }
          return;
        }
      } catch {
        // اگه onboarding API خطا داد برو تب‌ها
      }
      router.replace('/(tabs)/' as any);
    } catch (e: any) {
      const status = e?.status;
      if (status === 401 || status === 400) {
        toast.error('نام کاربری یا رمز عبور اشتباه است');
      } else if (status === 0 || !status) {
        toast.error('خطا در اتصال. اینترنت را بررسی کنید');
      } else {
        toast.error('خطایی رخ داد. دوباره تلاش کنید');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="ورود" back />
      <KeyboardAvoider>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>خوش برگشتی</Text>
        <Text style={styles.sub}>با شماره موبایل و رمز عبورت وارد شو</Text>

        <View style={styles.phoneRow}>
          <TextInput
            style={styles.phoneInput}
            accessibilityLabel="شماره موبایل"
            value={phone}
            onChangeText={v => setPhone(normalizeIranMobileInput(v))}
            placeholder="912 345 6789"
            placeholderTextColor={Colors.muted}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="telephoneNumber"
          />
          <View style={styles.countryCode}>
            <Text style={styles.countryText}>98</Text>
            <Text style={styles.countryText}>+</Text>
          </View>
        </View>
        <Field
          label="رمز عبور"
          required
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={styles.forgotPasswordLink}
          onPress={() => router.push('/onboarding/forgot-password')}
          accessibilityRole="button"
          accessibilityLabel="بازیابی رمز عبور"
        >
          <View style={styles.forgotPasswordIcon}>
            <KeyRound size={14} color={Colors.accent} strokeWidth={2.2} />
          </View>
          <Text style={styles.forgotPassword}>رمز عبورت را فراموش کردی؟</Text>
        </Pressable>

        <Button
          variant="accent"
          onPress={handleLogin}
          disabled={!canSubmit || loading}
        >
          {loading ? 'در حال ورود...' : 'ورود'}
        </Button>
      </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 24, gap: 12 },
  headline: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.ink },
  sub: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted, lineHeight: 22 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: {
    width: 64,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  countryText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  phoneInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.ink,
    backgroundColor: Colors.surface,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(217,79,112,0.16)',
  },
  forgotPasswordIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  forgotPassword: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    textAlign: 'right',
  },
});
