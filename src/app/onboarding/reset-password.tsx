import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Colors, Fonts } from '@/constants/colors';
import { authApi } from '@/lib/api/auth';
import { passwordResetStore } from '@/lib/passwordResetStore';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordsMatch = password === passwordConfirmation;
  const canSubmit = password.length >= 8 && passwordsMatch;

  const handleReset = async () => {
    if (!passwordsMatch) {
      toast.error('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }

    const { password_reset_token } = passwordResetStore.get();

    if (!password_reset_token) {
      toast.error('جلسه بازیابی منقضی شده است؛ دوباره درخواست کد بده');
      router.replace('/onboarding/forgot-password');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.resetPassword({
        password_reset_token,
        password,
        password_confirmation: passwordConfirmation,
      });
      passwordResetStore.clear();
      toast.success(response.message || 'رمز عبور با موفقیت تغییر کرد');
      router.replace('/onboarding/login');
    } catch (error: any) {
      toast.error(error.message ?? 'تغییر رمز عبور انجام نشد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="ثبت رمز عبور جدید" back />
      <KeyboardAvoider>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>یک رمز عبور جدید انتخاب کن</Text>
          <Text style={styles.sub}>
            رمز عبور باید حداقل ۸ کاراکتر باشد و با تکرار آن مطابقت داشته باشد.
          </Text>

          <Field
            label="رمز عبور جدید"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            hint="حداقل ۸ کاراکتر"
          />
          <Field
            label="تکرار رمز عبور جدید"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={
              passwordConfirmation.length > 0 && !passwordsMatch
                ? 'تکرار رمز عبور یکسان نیست'
                : undefined
            }
          />

          <Button
            variant="accent"
            onPress={handleReset}
            disabled={!canSubmit || loading}
          >
            {loading ? 'در حال ثبت...' : 'ثبت رمز عبور جدید'}
          </Button>
        </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 4 },
  headline: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.ink,
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    marginBottom: 14,
  },
});
