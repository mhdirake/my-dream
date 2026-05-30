import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts } from '@/constants/colors';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Illustration placeholder */}
        <View style={styles.illustration}>
          <Text style={styles.illustrationText}>🌸</Text>
          <Text style={styles.illustrationHint}>[ illustration: people, talking, trust ]</Text>
        </View>

        <Text style={styles.headline}>فضای امن برای{'\n'}آشنایی واقعی</Text>
        <Text style={styles.body}>
          از ازدواج تا دوستی و همسفر — هدفت رو خودت انتخاب کن.
        </Text>

        <View style={styles.actions}>
          <Button variant="accent" onPress={() => router.push('/onboarding/phone')}>
            شروع کنیم
          </Button>
          <Button variant="ghost" onPress={() => router.push('/onboarding/phone')}>
            قبلاً حساب دارم
          </Button>
          <Text style={styles.legal}>
            با ورود، <Text style={styles.link}>قوانین</Text> و <Text style={styles.link}>حریم خصوصی</Text> را می‌پذیرم
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 24, flexGrow: 1 },
  illustration: {
    height: 220,
    backgroundColor: Colors.ph2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.hair,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  illustrationText: { fontSize: 48 },
  illustrationHint: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  headline: {
    marginTop: 24,
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    color: Colors.ink,
    lineHeight: 34,
    textAlign: 'right',
  },
  body: {
    fontSize: 13,
    color: Colors.inkSoft,
    marginTop: 10,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    textAlign: 'right',
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 32,
    gap: 10,
  },
  legal: {
    fontSize: 10.5,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Fonts.regular,
  },
  link: { color: Colors.accent },
});
