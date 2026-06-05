import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Colors, Fonts } from '@/constants/colors';
import { registrationStore } from '@/lib/registrationStore';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserPassScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordsMatch = password === passwordConfirm;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = username.length >= 3 && emailValid && password.length >= 8 && passwordsMatch;

  const handleNext = async () => {
    setError('');
    if (!passwordsMatch) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }
    setLoading(true);
    try {
      const { registration_token } = registrationStore.get();
      if (!registration_token) {
        setError('جلسه منقضی شده. لطفاً از ابتدا شروع کنید.');
        return;
      }
      registrationStore.set({ username, email, password, password_confirmation: passwordConfirm });
      router.push('/onboarding/referral' as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="انتخاب نام کاربری" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>یک قدم آخر</Text>
        <Text style={styles.sub}>Username و Password بساز</Text>

        <Field
          label="نام کاربری"
          value={username}
          onChangeText={setUsername}
          hint="فقط حروف انگلیسی، عدد و _"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="ایمیل"
          value={email}
          onChangeText={setEmail}
          placeholder="example@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="رمز عبور"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          hint="حداقل ۸ کاراکتر، شامل عدد"
        />
        <Field
          label="تکرار رمز عبور"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card tint="trust">
          <Text style={styles.noteText}>
            شماره موبایلت ذخیره می‌مونه ولی به کسی نشون داده نمی‌شه.
          </Text>
        </Card>

        <Button variant="accent" onPress={handleNext} disabled={!canSubmit || loading}>
          {loading ? 'در حال ثبت‌نام...' : 'ادامه'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 4 },
  headline: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 2 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 14 },
  noteText: { fontSize: 11.5, color: '#2C5C8F', fontFamily: Fonts.regular, lineHeight: 18 },
  error: { fontSize: 12, color: Colors.danger, fontFamily: Fonts.regular },
});
