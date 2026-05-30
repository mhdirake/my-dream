import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Colors, Fonts } from '@/constants/colors';

const REWARDS = [
  { n: '۳ نفر', r: '۱ ماه Silver' },
  { n: '۵ نفر', r: '۱۰۰۰ سکه' },
  { n: '۱۰ نفر', r: '۱ ماه Gold' },
];

export default function ReferralScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <AppBar
        title="کد معرف"
        back
        right={
          <Text onPress={() => router.replace('/(tabs)/' as any)} style={styles.skip}>
            رد کن
          </Text>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Illustration placeholder */}
        <View style={styles.illustration}>
          <Text style={{ fontSize: 48 }}>🤝</Text>
          <Text style={styles.illustrationHint}>[ illustration: invite friends ]</Text>
        </View>

        <Text style={styles.headline}>کسی معرفیت کرده؟</Text>
        <Text style={styles.body}>
          Username معرف رو وارد کن. هر دوتون از پاداش بهره می‌برید.
        </Text>

        <Field
          label="Username معرف"
          placeholder="@username"
          hint="فقط هنگام ثبت‌نام قابل اضافه شدن است"
        />

        <Card soft>
          <Text style={styles.rewardTitle}>پاداش‌های معرف</Text>
          {REWARDS.map((r, i) => (
            <View
              key={r.n}
              style={[styles.rewardRow, i < REWARDS.length - 1 && styles.rewardBorder]}
            >
              <Text style={styles.rewardN}>{r.n} با اشتراک فعال</Text>
              <Text style={styles.rewardR}>{r.r}</Text>
            </View>
          ))}
        </Card>

        <View style={{ height: 16 }} />
        <Button variant="accent" onPress={() => router.replace('/(tabs)/' as any)}>
          ثبت معرف و ادامه
        </Button>
        <View style={{ height: 8 }} />
        <Button variant="ghost" onPress={() => router.replace('/(tabs)/' as any)}>
          ندارم، رد کن
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 14 },
  illustration: {
    height: 130,
    backgroundColor: Colors.ph2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.hair,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  illustrationHint: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.regular },
  headline: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.ink, textAlign: 'right' },
  body: { fontSize: 12, color: Colors.muted, lineHeight: 20, fontFamily: Fonts.regular, textAlign: 'right', marginTop: -4 },
  skip: { fontSize: 12, color: Colors.accent, fontFamily: Fonts.semiBold },
  rewardTitle: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 8 },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rewardBorder: { borderBottomWidth: 1, borderBottomColor: Colors.lineSoft, borderStyle: 'dashed' },
  rewardN: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  rewardR: { fontSize: 11, color: Colors.accent, fontFamily: Fonts.bold },
});
