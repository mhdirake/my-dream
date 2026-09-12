import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { confirmSheet } from '@/lib/confirmSheet';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type Question = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
};

export default function PersonalityTestQuestionScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B'>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    api.get<{ data: Question[] }>('/api/lookups/personality-questions', session.accessToken)
      .then(res => setQuestions(res.data))
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری سوالات'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const question = questions[currentIdx];
  const total = questions.length;
  const currentAnswer = question ? answers[question.id] : undefined;
  const isLast = currentIdx === total - 1;
  const answeredAll = total > 0 && Object.keys(answers).length === total;

  const exit = () => (router.canGoBack() ? router.back() : router.replace('/profile-setup/personality-test-intro' as any));

  const handleExit = () => {
    if (Object.keys(answers).length === 0) {
      exit();
      return;
    }
    confirmSheet.show(
      'خروج از تست؟',
      'پاسخ‌هایی که تا الان دادی ذخیره نمی‌شه.',
      [
        { text: 'خروج از تست', style: 'destructive', onPress: exit },
        { text: 'ادامه‌ی تست', style: 'cancel' },
      ]
    );
  };

  const handleSelect = (ans: 'A' | 'B') => {
    if (!question) return;
    setAnswers(prev => ({ ...prev, [question.id]: ans }));
  };

  const handleNext = async () => {
    if (isLast && answeredAll) {
      await handleSubmit();
    } else if (!isLast) {
      setCurrentIdx(i => i + 1);
    }
  };

  const handleSubmit = async () => {
    if (!session?.accessToken) return;
    const payload = Object.entries(answers).map(([qId, ans]) => ({
      personality_question_id: Number(qId),
      answer: ans,
    }));
    setSubmitting(true);
    try {
      await api.post('/api/client/profile/personality-test', { answers: payload }, session.accessToken);
      router.replace('/profile-setup/personality-test-result' as any);
    } catch (e: any) {
      toast.error(e.message ?? 'خطا در ارسال تست');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <AppBar title="تست شناخت شخصیت" back onBack={handleExit} backFallback="/me" />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  if (!question) return null;

  const progress = total > 0 ? (currentIdx + 1) / total : 0;
  const canGoNext = !!currentAnswer && (isLast ? answeredAll : true);

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="تست شناخت شخصیت" back onBack={handleExit} backFallback="/me" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.progress}>
          <View style={styles.progressHead}>
            <Text style={styles.progressStep}>سوال {toPersian(currentIdx + 1)} از {toPersian(total)}</Text>
            <Text style={styles.progressPct}>{toPersian(Math.round(progress * 100))}٪</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.question}>{question.question}</Text>

          <Pressable
            style={[styles.option, currentAnswer === 'A' && styles.optionSelected]}
            onPress={() => handleSelect('A')}
          >
            <View style={[styles.optionCircle, currentAnswer === 'A' && styles.optionCircleSelected]}>
              {currentAnswer === 'A' && <View style={styles.optionDot} />}
            </View>
            <Text style={[styles.optionLabel, currentAnswer === 'A' && styles.optionLabelSelected]}>
              {question.option_a}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.option, currentAnswer === 'B' && styles.optionSelected]}
            onPress={() => handleSelect('B')}
          >
            <View style={[styles.optionCircle, currentAnswer === 'B' && styles.optionCircleSelected]}>
              {currentAnswer === 'B' && <View style={styles.optionDot} />}
            </View>
            <Text style={[styles.optionLabel, currentAnswer === 'B' && styles.optionLabelSelected]}>
              {question.option_b}
            </Text>
          </Pressable>

          <Text style={styles.cardHint}>جوابی که اول به ذهنت می‌رسه رو انتخاب کن — درست و غلط نداره</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          variant="accent"
          onPress={handleNext}
          disabled={!canGoNext || submitting}
        >
          {submitting ? 'در حال ارسال…' : isLast ? 'ارسال تست' : 'سؤال بعدی'}
        </Button>
        <Button
          variant="ghost"
          onPress={() => setCurrentIdx(i => i - 1)}
          disabled={currentIdx === 0}
        >
          قبلی
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  progress: { gap: 8 },
  progressHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  progressStep: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.ink },
  progressPct: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.purple },
  progressTrack: {
    height: 6, borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.purple },

  content: {
    padding: Spacing.lg, paddingBottom: 150,
    flexGrow: 1, justifyContent: 'center', gap: 16,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair,
    padding: Spacing.xl, gap: 12,
  },
  question: {
    fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink,
    lineHeight: 29, letterSpacing: -0.2, textAlign: 'right',
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface2, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.lineSoft,
    padding: Spacing.lg,
  },
  cardHint: {
    fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted,
    textAlign: 'center', marginTop: 2, lineHeight: 17,
  },
  optionSelected: { borderColor: Colors.purple, backgroundColor: Colors.purpleSoft },
  optionCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.lineSoft,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  optionCircleSelected: { borderColor: Colors.purple },
  optionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.purple },
  optionLabel: {
    flex: 1, fontSize: 14, fontFamily: Fonts.regular,
    color: Colors.ink, lineHeight: 22,
  },
  optionLabelSelected: { fontFamily: Fonts.semiBold, color: Colors.purple },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
