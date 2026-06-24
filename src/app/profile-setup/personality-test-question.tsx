import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
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
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type Question = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
};

export default function PersonalityTestQuestionScreen() {
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>تست شناخت شخصیت</Text>
          </View>
          <Text style={styles.stepText}>{toPersian(currentIdx + 1)} از {toPersian(total)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.questionNum}>سوال {toPersian(currentIdx + 1)}</Text>
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

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.btnRow}>
          <Button
            variant="ghost"
            onPress={() => setCurrentIdx(i => i - 1)}
            disabled={currentIdx === 0}
            full={false}
            style={styles.btnBack}
          >
            قبلی
          </Button>
          <Button
            variant="accent"
            onPress={handleNext}
            disabled={!canGoNext || submitting}
            full={false}
            style={styles.btnNext}
          >
            {submitting ? 'در حال ارسال…' : isLast ? 'ارسال تست' : 'سؤال بعدی'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: Spacing.lg, paddingTop: 6, paddingBottom: 12,
    backgroundColor: Colors.surface,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  badgeWrap: {
    backgroundColor: Colors.purpleSoft, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.purple },
  stepText: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  progressTrack: { height: 5, borderRadius: Radius.pill, backgroundColor: 'rgba(36,33,42,0.08)' },
  progressFill: { height: 5, borderRadius: Radius.pill, backgroundColor: Colors.purple },
  content: { padding: Spacing.lg, paddingTop: 24 },
  questionNum: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular, marginBottom: 8 },
  question: {
    fontSize: 17, fontFamily: Fonts.bold, color: Colors.ink,
    lineHeight: 28, marginBottom: 24, letterSpacing: -0.2,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.lineSoft,
    padding: Spacing.lg, marginBottom: 12,
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
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnBack: { flex: 1 },
  btnNext: { flex: 2 },
});
