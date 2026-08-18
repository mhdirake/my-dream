import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { KeyboardStickyBar } from '@/components/ui/KeyboardStickyBar';
import { Colors, Fonts } from '@/constants/colors';
import { authApi } from '@/lib/api/auth';
import { toFaDigits } from '@/lib/localization';
import { passwordResetStore } from '@/lib/passwordResetStore';
import { toEnDigits } from '@/lib/toEnDigits';
import { toast } from '@/lib/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const OTP_LENGTH = 5;
const DEFAULT_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordOtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone, resend_after } = useLocalSearchParams<{
    phone: string;
    resend_after: string;
  }>();
  const inputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(
    () => Number(resend_after) || DEFAULT_COOLDOWN_SECONDS,
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }

    const timer = setInterval(() => setSeconds(value => value - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleChange = (text: string) => {
    setOtp(toEnDigits(text).replace(/\D/g, '').slice(0, OTP_LENGTH));
  };

  const handleResend = async () => {
    if (!phone || seconds > 0 || resending) {
      return;
    }

    setResending(true);

    try {
      const response = await authApi.sendPasswordResetOtp(phone);
      setSeconds(response.data.resend_after || DEFAULT_COOLDOWN_SECONDS);
      setOtp('');
      inputRef.current?.focus();
    } catch (error: any) {
      toast.error(error.message ?? 'ارسال مجدد کد انجام نشد');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (!phone || otp.length !== OTP_LENGTH) {
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.verifyPasswordResetOtp(phone, otp);
      passwordResetStore.set({
        phone,
        password_reset_token: response.data.password_reset_token,
      });
      router.push('/onboarding/reset-password');
    } catch (error: any) {
      toast.error(error.message ?? 'کد واردشده صحیح نیست');
    } finally {
      setLoading(false);
    }
  };

  const displayPhone = phone
    ? `‪${phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')}‬`
    : '';

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="تأیید کد بازیابی" back />
      <View style={styles.content}>
        <Text style={styles.headline}>کد {toFaDigits(OTP_LENGTH)} رقمی</Text>
        <Text style={styles.sub}>کد ارسال‌شده به {displayPhone} را وارد کن</Text>

        <View style={styles.boxesWrap}>
          <View style={styles.boxes} pointerEvents="none">
            {Array.from({ length: OTP_LENGTH }).map((_, index) => {
              const character = otp[index] || '';
              const active = index === otp.length;

              return (
                <View
                  key={index}
                  style={[
                    styles.box,
                    active && styles.boxActive,
                    character && styles.boxFilled,
                  ]}
                >
                  {active && !character ? (
                    <View style={styles.cursor} />
                  ) : (
                    <Text style={styles.digit}>{toFaDigits(character)}</Text>
                  )}
                </View>
              );
            })}
          </View>
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleChange}
            keyboardType="numeric"
            maxLength={OTP_LENGTH}
            autoFocus
            textContentType="oneTimeCode"
          />
        </View>

        <KeyboardStickyBar style={styles.buttonWrap} bottomOffset={insets.bottom + 32}>
        {seconds > 0 ? (
          <Text style={styles.resend}>
            ارسال مجدد در{' '}
            <Text style={styles.timer}>
              {toFaDigits(
                `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
                  seconds % 60,
                ).padStart(2, '0')}`,
              )}
            </Text>
          </Text>
        ) : (
          <Text style={styles.resendActive} onPress={handleResend}>
            {resending ? 'در حال ارسال...' : 'ارسال مجدد کد'}
          </Text>
        )}

          <Button
            variant="accent"
            onPress={handleVerify}
            disabled={otp.length !== OTP_LENGTH || loading}
          >
            {loading ? 'در حال تأیید...' : 'تأیید و ادامه'}
          </Button>
        </KeyboardStickyBar>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, padding: 20 },
  headline: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink },
  sub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 6,
    fontFamily: Fonts.regular,
  },
  boxesWrap: { marginTop: 32 },
  boxes: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
  },
  box: {
    width: 48,
    height: 58,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  boxActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  boxFilled: { borderColor: Colors.ink },
  digit: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.ink },
  cursor: { width: 1.5, height: 24, backgroundColor: Colors.ink, opacity: 0.6 },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  resend: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 12,
    color: Colors.muted,
    fontFamily: Fonts.regular,
  },
  timer: { fontFamily: Fonts.bold, color: Colors.ink },
  resendActive: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 12,
    color: Colors.accent,
    fontFamily: Fonts.bold,
  },
  buttonWrap: { position: 'absolute', bottom: 32, left: 20, right: 20 },
});
