import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Colors, Fonts } from '@/constants/colors';
import { authApi } from '@/lib/api/auth';
import { passwordResetStore } from '@/lib/passwordResetStore';
import { toEnDigits } from '@/lib/toEnDigits';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (value: string) => {
    setPhone(toEnDigits(value).replace(/\D/g, '').slice(0, 10));
  };

  const handleSend = async () => {
    const mobile = phone.startsWith('0') ? phone : `0${phone}`;
    setLoading(true);

    try {
      const response = await authApi.sendPasswordResetOtp(mobile);
      passwordResetStore.clear();
      passwordResetStore.set({ phone: mobile });
      router.push({
        pathname: '/onboarding/forgot-password-otp',
        params: {
          phone: mobile,
          resend_after: response.data.resend_after,
        },
      });
    } catch (error: any) {
      toast.error(error.message ?? 'ارسال کد بازیابی انجام نشد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="بازیابی رمز عبور" back />
      <KeyboardAvoider>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>شماره موبایل حساب را وارد کن</Text>
          <Text style={styles.body}>
            برای تأیید هویت، یک کد یک‌بارمصرف به شماره ثبت‌شده ارسال می‌شود.
          </Text>

          <View style={styles.phoneRow}>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="912 345 6789"
              placeholderTextColor={Colors.muted}
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
              textContentType="telephoneNumber"
            />
            <View style={styles.countryCode}>
              <Text style={styles.countryText}>98</Text>
              <Text style={styles.countryText}>+</Text>
            </View>
          </View>

          <Button
            variant="accent"
            onPress={handleSend}
            disabled={phone.length < 10 || loading}
          >
            {loading ? 'در حال ارسال...' : 'ارسال کد بازیابی'}
          </Button>
        </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 14 },
  headline: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink },
  body: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 20,
    fontFamily: Fonts.regular,
  },
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
});
