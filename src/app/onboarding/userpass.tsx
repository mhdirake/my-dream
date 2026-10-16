import { isTermsError } from '@/lib/termsPolicy';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Colors, Fonts } from '@/constants/colors';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { registrationStore } from '@/lib/registrationStore';
import { registrationErrors } from '@/lib/registrationValidation';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserPassScreen() {
  const { saveRegistrationSession } = useAuth();
  const [username, setUsername] = useState(registrationStore.get().username ?? '');
  const [email, setEmail] = useState(registrationStore.get().email ?? '');
  const [password, setPassword] = useState(registrationStore.get().password ?? '');
  const [passwordConfirm, setPasswordConfirm] = useState(registrationStore.get().password_confirmation ?? '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const validationErrors = registrationErrors({ username, email, password, password_confirmation: passwordConfirm });
  const canSubmit = !Object.values(validationErrors).some(Boolean);
  const updateField = (key: string, set: (value: string) => void) => (value: string) => {
    set(value);
    setServerErrors(previous => ({ ...previous, [key]: '' }));
  };
  const fieldError = (key: string, value: string) => serverErrors[key] || ((submitted || value.length > 0) ? validationErrors[key] : undefined);

  const handleNext = async () => {
    if (loading) return;
    setSubmitted(true);
    if (!canSubmit) {
      toast.error(Object.values(validationErrors).find(Boolean)!);
      return;
    }
    const { registration_token } = registrationStore.get();
    registrationStore.set({ username, email, password, password_confirmation: passwordConfirm });
    if (!registration_token) {
      toast.error('جلسه منقضی شده. لطفاً از ابتدا شروع کنید.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        registration_token,
        username: username.trim(),
        email: email.trim() || undefined,
        password,
        password_confirmation: passwordConfirm,
      });
      registrationStore.clear();
      const { access_token, refresh_token, expires_in } = res.data.auth;
      await saveRegistrationSession(access_token, refresh_token, expires_in, res.data.auth.session_expires_at);
      router.replace('/profile-setup/basic-info' as any);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 422) {
        const errors = (e.data as { errors?: Record<string, string[]> } | undefined)?.errors;
        if (errors) setServerErrors(Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages[0] ?? 'مقدار واردشده معتبر نیست'])));
      }
      if (isTermsError(e)) router.push({ pathname: '/terms', params: { returnTo: 'registration' } });
      toast.error(e.message ?? 'خطا در ثبت‌نام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="انتخاب نام کاربری" back />
      <KeyboardAvoider>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>یک قدم آخر</Text>
        <Text style={styles.sub}>نام کاربری و رمز عبور بساز</Text>

        <Field
          label="نام کاربری"
          required
          value={username}
          onChangeText={updateField('username', setUsername)}
          hint="۳ تا ۳۰ کاراکتر؛ حروف انگلیسی، عدد، _ یا نقطه"
          error={fieldError('username', username)}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="ایمیل (اختیاری)"
          value={email}
          onChangeText={updateField('email', setEmail)}
          error={fieldError('email', email)}
          placeholder="example@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="رمز عبور"
          required
          value={password}
          onChangeText={updateField('password', setPassword)}
          secureTextEntry
          hint="حداقل ۸ کاراکتر"
          error={fieldError('password', password)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="تکرار رمز عبور"
          required
          value={passwordConfirm}
          onChangeText={updateField('password_confirmation', setPasswordConfirm)}
          error={fieldError('password_confirmation', passwordConfirm)}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <Card tint="trust">
          <Text style={styles.noteText}>
            شماره موبایلت ذخیره می‌مونه ولی به کسی نشون داده نمی‌شه.
          </Text>
        </Card>

        <Button variant="accent" onPress={handleNext} disabled={loading}>
          {loading ? 'در حال ثبت‌نام...' : 'ادامه'}
        </Button>
      </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 4 },
  headline: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 2 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 14 },
  noteText: { fontSize: 11.5, color: Colors.trust, fontFamily: Fonts.regular, lineHeight: 18 },
});
