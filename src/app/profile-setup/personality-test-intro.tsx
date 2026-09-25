import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import { Brain, CircleCheckBig, Sparkles, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type LatestTest = { result_title?: string | null; completed_at?: string | null } | null;

export default function PersonalityTestIntroScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [checking, setChecking] = useState(true);
  const [latestTest, setLatestTest] = useState<LatestTest>(null);

  useEffect(() => {
    if (!session?.accessToken) { setChecking(false); return; }
    api
      .get<{ data: { latest_test: LatestTest } }>('/api/client/profile/personality-test', session.accessToken)
      .then(res => setLatestTest(res.data.latest_test ?? null))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [session?.accessToken]);

  const hasResult = !!latestTest?.completed_at;

  if (checking) {
    return (
      <SafeAreaView style={styles.root}>
        <AppBar title="تست شخصیت" back backFallback="/me" contentGap />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  if (hasResult) {
    return (
      <SafeAreaView style={styles.root}>
        <AppBar title="تست شخصیت" back backFallback="/me" contentGap />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.illustration}>
            <View style={[styles.illustrationGrad, { backgroundColor: Colors.accent }]}>
              <CircleCheckBig size={44} color="#fff" strokeWidth={1.5} />
            </View>
          </View>

          <Text style={styles.title}>قبلاً این تست رو دادی</Text>
          <Text style={styles.desc}>
            {latestTest?.result_title
              ? `نتیجه‌ت: ${latestTest.result_title}`
              : 'می‌تونی نتیجه‌ت رو ببینی یا دوباره تست بدی.'}
          </Text>

          <Card soft style={styles.benefitsCard}>
            <Text style={styles.resultHint}>
              با دادن دوباره‌ی تست، نتیجه‌ی جدید جایگزین نتیجه‌ی قبلی می‌شه.
            </Text>
          </Card>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button variant="accent" onPress={() => router.push('/profile-setup/personality-test-result' as any)}>
            مشاهده نتیجه
          </Button>
          <Button variant="ghost" onPress={() => router.push('/profile-setup/personality-test-question' as any)}>
            دوباره امتحان کن
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="تست شخصیت" back backFallback="/me" contentGap />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.illustration}>
          <View style={[styles.illustrationGrad, { backgroundColor: Colors.accent }]}>
            <Brain size={48} color="#fff" strokeWidth={1.5} />
          </View>
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
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button variant="accent" onPress={() => router.push('/profile-setup/personality-test-question' as any)}>
          شروع تست
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: 116,
  },
  illustration: {
    width: 100, height: 100, borderRadius: 50, overflow: 'hidden',
    marginBottom: Spacing.xl, alignSelf: 'center',
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
  resultHint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted, lineHeight: 18 },
  noteCard: { width: '100%' },
  noteText: { fontSize: 11.5, color: Colors.trust, fontFamily: Fonts.regular, lineHeight: 18 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
