import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

type DimensionScore = {
  label: string;
  positive_label: string;
  negative_label: string;
  positive_score: number;
  negative_score: number;
  leaning: 'positive' | 'negative';
  leaning_label: string;
};

type PTResult = {
  result_key: string;
  result_title: string;
  scores: {
    dimensions: Record<string, DimensionScore>;
    a: number;
    b: number;
    total: number;
  };
  assistant_analysis: {
    summary: string;
    disclaimer: string;
    display_label?: string;
  } | null;
};

const DIM_COLORS: Record<string, string> = {
  social_style: Colors.accent,
  decision_style: Colors.trust,
  relationship_style: Colors.purple,
  conflict_style: Colors.ok,
  lifestyle_flexibility: Colors.gold,
};

export default function PersonalityTestResultScreen() {
  const { session } = useAuth();
  const [result, setResult] = useState<PTResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    api
      .get<{ data: { latest_test: PTResult | null } }>(
        '/api/client/profile/personality-test',
        session.accessToken,
      )
      .then(res => {
        if (res.data.latest_test) setResult(res.data.latest_test);
      })
      .catch(e => toast.error(e.message ?? 'خطا در بارگذاری نتیجه'))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  const dims = result?.scores?.dimensions
    ? Object.entries(result.scores.dimensions)
    : [];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>نتیجه تست شخصیت</Text>
          <Text style={styles.heroTitle}>{result?.result_title ?? '—'}</Text>
          {!!result?.assistant_analysis?.summary && (
            <Text style={styles.heroSub}>{result.assistant_analysis.summary}</Text>
          )}
        </View>

        {dims.length > 0 && (
          <Card soft style={styles.dimsCard}>
            <Text style={styles.dimsTitle}>ابعاد شخصیتی</Text>
            {dims.map(([key, dim]) => {
              const total = dim.positive_score + dim.negative_score;
              const pct = total > 0 ? Math.round((dim.positive_score / total) * 100) : 50;
              const color = DIM_COLORS[key] ?? Colors.purple;
              return (
                <View key={key} style={styles.dim}>
                  <View style={styles.dimHeader}>
                    <Text style={styles.dimLabel}>{dim.label}</Text>
                    <Text style={[styles.dimLeaning, { color }]}>{dim.leaning_label}</Text>
                  </View>
                  <View style={styles.dimTrack}>
                    <View
                      style={[styles.dimFill, { width: `${pct}%` as any, backgroundColor: color }]}
                    />
                  </View>
                  <View style={styles.dimPoles}>
                    <Text style={styles.dimPole}>{dim.positive_label}</Text>
                    <Text style={styles.dimPole}>{dim.negative_label}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        <Card soft style={styles.visCard}>
          <View style={styles.visRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.visTitle}>نمایش در پروفایل</Text>
              <Text style={styles.visSub}>دیگران می‌توانند نتیجه را ببینند</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, visible && styles.toggleOn]}
              onPress={() => setVisible(v => !v)}
            >
              {visible
                ? <Eye size={14} color="#fff" strokeWidth={2} />
                : <EyeOff size={14} color={Colors.muted} strokeWidth={2} />
              }
              <Text style={[styles.toggleText, visible && styles.toggleTextOn]}>
                {visible ? 'نمایش' : 'مخفی'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {!!result?.assistant_analysis?.disclaimer && (
          <Card tint="trust" style={styles.noteCard}>
            <Text style={styles.noteText}>{result.assistant_analysis.disclaimer}</Text>
          </Card>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          variant="accent"
          onPress={() => router.replace('/profile-setup/profile-preview' as any)}
        >
          مشاهده پروفایل
        </Button>
        <Button
          variant="ghost"
          onPress={() => router.replace('/(tabs)/' as any)}
        >
          ورود به اپ
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.lg },
  heroLabel: {
    fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted,
    letterSpacing: 1, marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24, fontFamily: Fonts.extraBold, color: Colors.ink,
    textAlign: 'center', marginBottom: 12, letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 22,
  },
  dimsCard: { marginBottom: 12 },
  dimsTitle: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 16 },
  dim: { marginBottom: 16 },
  dimHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  dimLabel: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  dimLeaning: { fontSize: 11, fontFamily: Fonts.bold },
  dimTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(36,33,42,0.08)', marginBottom: 4 },
  dimFill: { height: 8, borderRadius: 4 },
  dimPoles: { flexDirection: 'row', justifyContent: 'space-between' },
  dimPole: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.regular },
  visCard: { marginBottom: 12 },
  visRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  visTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 2 },
  visSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.regular },
  toggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.lineSoft, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  toggleOn: { backgroundColor: Colors.purple },
  toggleText: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.muted },
  toggleTextOn: { color: '#fff' },
  noteCard: { marginBottom: 12 },
  noteText: { fontSize: 11.5, color: '#2C5C8F', fontFamily: Fonts.regular, lineHeight: 18 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
