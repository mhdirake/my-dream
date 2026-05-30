import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Colors, Fonts } from '@/constants/colors';

export default function UserPassScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="انتخاب نام کاربری" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>یک قدم آخر</Text>
        <Text style={styles.sub}>Username و Password بساز</Text>

        <Field label="نام کاربری" value="@neda_m" hint="فقط حروف انگلیسی، عدد و _" suffix="✓" />
        <Field label="ایمیل (اختیاری)" placeholder="example@email.com" keyboardType="email-address" />
        <Field label="رمز عبور" value="••••••••" secureTextEntry hint="حداقل ۸ کاراکتر، شامل عدد" />
        <Field label="تکرار رمز عبور" value="••••••••" secureTextEntry />

        <Card tint="trust">
          <Text style={styles.noteText}>
            ⓘ شماره موبایلت ذخیره می‌مونه ولی به کسی نشون داده نمی‌شه
          </Text>
        </Card>

        <View style={{ height: 16 }} />
        <Button variant="accent" onPress={() => router.replace('/onboarding/referral')}>
          ادامه
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 4 },
  headline: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.ink, textAlign: 'right', marginBottom: 2 },
  sub: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.regular, textAlign: 'right', marginBottom: 14 },
  noteText: { fontSize: 11.5, color: '#2C5C8F', fontFamily: Fonts.regular, lineHeight: 18 },
});
