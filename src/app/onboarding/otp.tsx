import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts } from '@/constants/colors';

const OTP_LENGTH = 5;

export default function OTPScreen() {
  const [otp, setOtp] = useState('');

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="تأیید کد" back />
      <View style={styles.content}>
        <Text style={styles.headline}>کد ۵ رقمی</Text>
        <Text style={styles.sub}>به شماره ۰۹۱۲ ۳۴۵ ۶۷۸۹ ارسال شد</Text>

        {/* OTP boxes */}
        <View style={styles.boxes}>
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
        </View>

        {/* Hidden real input */}
        <TextInput
          style={styles.hiddenInput}
          value={otp}
          onChangeText={handleChange}
          keyboardType="numeric"
          maxLength={OTP_LENGTH}
          autoFocus
        />

        <Text style={styles.resend}>
          ارسال مجدد در <Text style={styles.timer}>۰۰:۴۸</Text>
        </Text>

        <View style={styles.btnWrap}>
          <Button
            variant="accent"
            onPress={() => router.replace('/onboarding/userpass')}
            disabled={otp.length < OTP_LENGTH}
          >
            تأیید و ادامه
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
  cursor: {
    width: 1.5,
    height: 24,
    backgroundColor: Colors.ink,
    opacity: 0.6,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resend: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: Colors.muted,
    fontFamily: Fonts.regular,
  },
  timer: { fontFamily: Fonts.bold, color: Colors.ink },
  btnWrap: { position: 'absolute', bottom: 32, left: 20, right: 20 },
});
