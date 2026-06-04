import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts } from '@/constants/colors';
import { authApi } from '@/lib/api/auth';
import { toEnDigits } from '@/lib/toEnDigits';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    setLoading(true);
    const mobile = phone.startsWith('0') ? phone : `0${phone}`;
    try {
      const res = await authApi.sendOtp(mobile);
      router.push({ pathname: '/onboarding/otp', params: { phone: mobile, resend_after: res.resend_after } });
    } catch (e: any) {
      setError(e.message ?? 'خطا در ارسال کد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="ورود / ثبت‌نام" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>شماره موبایلت رو وارد کن</Text>
        <Text style={styles.body}>
          یه کد تأیید برات می‌فرستیم. شماره موبایل کمک می‌کنه فیک نباشیم.
        </Text>

        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryText}>+98</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={t => setPhone(toEnDigits(t))}
            placeholder="912 345 6789"
            placeholderTextColor={Colors.muted}
            keyboardType="phone-pad"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card tint="trust" style={styles.note}>
          <Text style={styles.noteText}>
            ⓘ ساخت چند اکانت با یک شماره ممکن نیست. شماره verify می‌شود.
          </Text>
        </Card>

        <Button
          variant="accent"
          onPress={handleSend}
          disabled={phone.length < 10 || loading}
        >
          {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 14 },
  headline: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink, textAlign: 'right' },
  body: { fontSize: 12, color: Colors.muted, lineHeight: 20, fontFamily: Fonts.regular, textAlign: 'right' },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: {
    width: 64,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: 10,
    paddingVertical: 12,
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
  },
  note: { marginVertical: 4, flexDirection: "row", textAlign: "right"},
  noteText: { writingDirection: 'rtl', textAlign: 'right', fontSize: 11.5, color: '#2C5C8F', fontFamily: Fonts.regular, lineHeight: 18 },
  error: { fontSize: 12, color: Colors.danger, textAlign: 'right', fontFamily: Fonts.regular },
});
