import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Brain, Sparkles, Star } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PersonalityTestIntroScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.illustration}>
          <LinearGradient colors={Colors.gradColors} style={styles.illustrationGrad}>
            <Brain size={48} color="#fff" strokeWidth={1.5} />
          </LinearGradient>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>اختیاری · بج طلایی</Text>
        </View>
        <Text style={styles.title}>تست شناخت شخصیت</Text>
        <Text style={styles.desc}>
          ۲۰ سوال ساده، هر سوال دو گزینه — فقط ۵ دقیقه.{'\n'}
          نتیجه کمک می‌کنه پیشنهادهای بهتری دریافت کنی.
        </Text>

        <Card soft style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>چه چیزی به دست می‌آوری؟</Text>
          <View style={styles.benefit}>
            <Brain size={15} color={Colors.purple} strokeWidth={2} />
            <Text style={styles.benefitText}>بج طلایی «تست شخصیت کامل‌شده»</Text>
          </View>
          <View style={styles.benefit}>
            <Star size={15} color={Colors.gold} strokeWidth={2} />
            <Text style={styles.benefitText}>بهبود امتیاز تطابق در پیشنهادها</Text>
          </View>
          <View style={styles.benefit}>
            <Sparkles size={15} color={Colors.accent} strokeWidth={2} />
            <Text style={styles.benefitText}>تحلیل هوشمند درباره سبک ارتباطی‌ات</Text>
          </View>
        </Card>

        <Card tint="trust" style={styles.noteCard}>
          <Text style={styles.noteText}>
            این تست تشخیص روانشناسی نیست — فقط برای شناخت سبک ارتباطی و پیشنهادهای بهتر استفاده می‌شود.
          </Text>
        </Card>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button variant="accent" onPress={() => router.push('/profile-setup/personality-test-question' as any)}>
          شروع تست
        </Button>
        <Button variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/' as any))}>
          بعداً
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, alignItems: 'center' },
  illustration: {
    width: 100, height: 100, borderRadius: 50, overflow: 'hidden',
    marginTop: Spacing.xxl, marginBottom: Spacing.xl, alignSelf: 'center',
    shadowColor: Colors.purple, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  illustrationGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  badge: {
    backgroundColor: Colors.purpleSoft, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.pill, marginBottom: 12, alignSelf: 'center',
  },
  badgeText: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.purple },
  title: {
    fontSize: 20, fontFamily: Fonts.extraBold, color: Colors.ink,
    textAlign: 'center', marginBottom: 4,
  },
  desc: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl, width: '100%',
  },
  benefitsCard: { width: '100%', marginBottom: 12 },
  benefitsTitle: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.ink, flex: 1 },
  noteCard: { width: '100%' },
  noteText: { fontSize: 11.5, color: '#2C5C8F', fontFamily: Fonts.regular, lineHeight: 18 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
