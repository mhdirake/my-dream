import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Colors, Fonts } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { loginWithPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithPassword(username.trim(), password);
      router.replace('/(tabs)/' as any);
    } catch (e: any) {
      const status = e?.status;
      if (status === 401 || status === 400) {
        setError('نام کاربری یا رمز عبور اشتباه است');
      } else if (status === 0 || !status) {
        setError('خطا در اتصال. اینترنت را بررسی کنید');
      } else {
        setError('خطایی رخ داد. دوباره تلاش کنید');
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = username.length >= 3 && password.length >= 8;

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="ورود" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>خوش برگشتی</Text>
        <Text style={styles.sub}>با نام کاربری و رمز عبورت وارد شو</Text>

        <Field
          label="نام کاربری"
          value={username}
          onChangeText={v => setUsername(v.replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776)))}
          placeholder=""
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="رمز عبور"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          variant="accent"
          onPress={handleLogin}
          disabled={!canSubmit || loading}
        >
          {loading ? 'در حال ورود...' : 'ورود'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 24, gap: 12 },
  headline: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.ink },
  sub: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted, lineHeight: 22 },
  error: { fontSize: 12, color: Colors.danger, fontFamily: Fonts.regular },
});
