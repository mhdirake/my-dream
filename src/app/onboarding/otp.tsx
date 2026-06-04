import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts } from '@/constants/colors';
import { authApi } from '@/lib/api/auth';
import { registrationStore } from '@/lib/registrationStore';
import { toEnDigits } from '@/lib/toEnDigits';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OTP_LENGTH = 5;

export default function OTPScreen() {
  const { phone, resend_after } = useLocalSearchParams<{ phone: string; resend_after: string }>();
  const inputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(() => Number(resend_after) || 60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const handleChange = (text: string) => {
    const digits = toEnDigits(text).replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    setError('');
  };

  const handleResend = async () => {
    if (!phone) return;
    try {
      await authApi.sendOtp(phone);
      setSeconds(Number(resend_after) || 60);
      setOtp('');
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'خطا در ارسال مجدد کد');
    }
  };

  const handleVerify = async () => {
    if (!phone || otp.length < OTP_LENGTH) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp);
      registrationStore.set({ phone, registration_token: res.data.registration_token });
      router.push('/onboarding/userpass');
    } catch (e: any) {
      setError(e.message ?? 'کد وارد شده اشتباه است');
    } finally {
      setLoading(false);
    }
  };

  const displayPhone = phone
    ? `‪${phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')}‬`
    : '';

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="تأیید کد" back />
      <View style={styles.content}>
        <Text style={styles.headline}>کد ۵ رقمی</Text>
        <Text style={styles.sub}>به شماره {displayPhone} ارسال شد</Text>

        <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const char = otp[i] || '';
            const active = i === otp.length;
            return (
              <View key={i} style={[styles.box, active && styles.boxActive, char && styles.boxFilled]}>
                {active && !char
                  ? <View style={styles.cursor} />
                  : <Text style={styles.digit}>{char}</Text>
                }
              </View>
            );
          })}
        </Pressable>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={handleChange}
          keyboardType="numeric"
          maxLength={OTP_LENGTH}
          autoFocus
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {seconds > 0 ? (
          <Text style={styles.resend}>
            ارسال مجدد در{' '}
            <Text style={styles.timer}>
              {`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}
            </Text>
          </Text>
        ) : (
          <Text style={[styles.resend, styles.resendActive]} onPress={handleResend}>
            ارسال مجدد کد
          </Text>
        )}

        <View style={styles.btnWrap}>
          <Button
            variant="accent"
            onPress={handleVerify}
            disabled={otp.length < OTP_LENGTH || loading}
          >
            {loading ? 'در حال تأیید...' : 'تأیید و ادامه'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, padding: 20 },
  headline: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink, textAlign: 'right' },
  sub: { fontSize: 12, color: Colors.muted, marginTop: 6, fontFamily: Fonts.regular, textAlign: 'right' },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
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
  hiddenInput: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0 },
  resend: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: Colors.muted,
    fontFamily: Fonts.regular,
  },
  timer: { fontFamily: Fonts.bold, color: Colors.ink },
  resendActive: { color: Colors.accent, fontFamily: Fonts.bold },
  error: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    color: Colors.danger,
    fontFamily: Fonts.regular,
  },
  btnWrap: { position: 'absolute', bottom: 32, left: 20, right: 20 },
});
