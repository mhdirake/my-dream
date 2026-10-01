import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Colors, Fonts } from '@/constants/colors';
import { authApi } from '@/lib/api/auth';
import { toEnDigits } from '@/lib/toEnDigits';
import { toast } from '@/lib/toast';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { registrationStore } from '@/lib/registrationStore';
import { isTermsError } from '@/lib/termsPolicy';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PhoneScreen() {
  const [phone, setPhone] = useState((registrationStore.get().phone ?? '').replace(/^0/, ''));
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  useFocusEffect(useCallback(() => { setAccepted(registrationStore.get().terms_accepted === true); }, []));
  const openTerms = () => router.push({ pathname: '/terms', params: { returnTo: 'registration' } });

  const handleSend = async () => {
    if (!accepted) { openTerms(); return; }
    setLoading(true);
    const mobile = phone.startsWith('0') ? phone : `0${phone}`;
    registrationStore.set({ phone: mobile });
    try {
      const res = await authApi.sendOtp(mobile);
      router.push({
        pathname: '/onboarding/otp',
        params: { phone: mobile, resend_after: res.data.resend_after },
      });
    } catch (e: any) {
      if (isTermsError(e)) { registrationStore.set({ terms_accepted: false }); setAccepted(false); openTerms(); }
      toast.error(e.message ?? 'خطا در ارسال کد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="ورود / ثبت‌نام" back />
      <KeyboardAvoider>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>شماره موبایلت رو وارد کن</Text>
        <Text style={styles.body}>
          یه کد تأیید برات می‌فرستیم. شماره موبایل کمک می‌کنه فیک نباشیم.
        </Text>

        <View style={styles.phoneRow}>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={t => setPhone(toEnDigits(t))}
            placeholder="⁦912 345 6789⁩"
            placeholderTextColor={Colors.muted}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <View style={styles.countryCode}>
            <Text style={styles.countryText}>98</Text>
            <Text style={styles.plus}>+</Text>
          </View>
        </View>

        {/* <Card tint="trust" style={styles.note}>
          <Text style={styles.noteText}>
           ساخت چند اکانت با یک شماره امکان پذیر می‌شود.
          </Text>
        </Card> */}

        <Pressable style={styles.termsRow} onPress={openTerms} accessibilityRole="link">
          <Checkbox checked={accepted} />
          <Text style={[styles.body, { flex: 1 }]}>
            {accepted ? 'قوانین و حریم خصوصی را خواندم و تأیید کردم؛ مشاهده متن' : 'خواندن و تأیید قوانین و حریم خصوصی'}
          </Text>
        </Pressable>
        <Button
          variant="accent"
          onPress={handleSend}
          disabled={phone.length < 10 || loading || !accepted}
        >
          {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
        </Button>
      </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 14 },
  headline: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink},
  body: { fontSize: 12, color: Colors.muted, lineHeight: 20, fontFamily: Fonts.regular },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: {
    width: 64,
    borderWidth: 1.5,
    borderColor: Colors.lineSoft,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignContent: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,

  },
  countryText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  plus: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
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
    textAlign: "left",
    writingDirection: 'ltr',
  },
  note: { marginVertical: 4, flexDirection: "row", textAlign: "right" },
  noteText: { writingDirection: 'rtl', textAlign: 'right', fontSize: 11.5, color: Colors.trust, fontFamily: Fonts.regular, lineHeight: 18 },
});
