import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';
import { Eye, EyeOff, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

function DimensionRow({ dim, color }: { dim: DimensionScore; color: string }) {
  const total = dim.positive_score + dim.negative_score;
  const pct = total > 0 ? Math.round((dim.positive_score / total) * 100) : 50;
  const strength = Math.max(pct, 100 - pct);

  const fillStyle =
    pct >= 50
      ? { left: '50%' as const, width: `${pct - 50}%` as `${number}%`, borderTopRightRadius: 5, borderBottomRightRadius: 5 }
      : { left: `${pct}%` as `${number}%`, width: `${50 - pct}%` as `${number}%`, borderTopLeftRadius: 5, borderBottomLeftRadius: 5 };

  return (
    <View style={styles.dim}>
      <View style={styles.dimHeader}>
        <Text style={styles.dimLabel}>{dim.label}</Text>
        <View style={[styles.dimPill, { backgroundColor: color + '22' }]}>
          <Text style={[styles.dimPillTxt, { color }]}>{dim.leaning_label} · {toPersian(strength)}٪</Text>
        </View>
      </View>

      <View style={styles.divTrack}>
        <View style={styles.divCenter} />
        <View style={[styles.divFill, fillStyle, { backgroundColor: color }]} />
      </View>

      <View style={styles.divPoles}>
        <Text style={[styles.divPole, pct >= 50 && { color, fontFamily: Fonts.semiBold }]}>{dim.positive_label}</Text>
        <Text style={[styles.divPole, pct < 50 && { color, fontFamily: Fonts.semiBold }]}>{dim.negative_label}</Text>
      </View>
    </View>
  );
}

export default function PersonalityTestResultScreen() {
  const insets = useSafeAreaInsets();
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
        <AppBar title="نتیجه تست شخصیت" back backFallback="/me" />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  const dims = result?.scores?.dimensions ? Object.entries(result.scores.dimensions) : [];

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="نتیجه تست شخصیت" back backFallback="/me" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.heroBadge, { backgroundColor: Colors.accent }]}>
            <Sparkles size={24} color="#fff" strokeWidth={2} />
          </View>
          <Text style={styles.heroTitle}>{result?.result_title ?? '—'}</Text>
          {!!result?.assistant_analysis?.summary && (
            <Text style={styles.heroSub}>{result.assistant_analysis.summary}</Text>
          )}
        </View>

        {dims.length > 0 && (
          <Card soft style={styles.card}>
            <Text style={styles.cardTitle}>ابعاد شخصیتی</Text>
            {dims.map(([key, dim]) => (
              <DimensionRow key={key} dim={dim} color={DIM_COLORS[key] ?? Colors.purple} />
            ))}
          </Card>
        )}

        <Card soft style={styles.card}>
          <View style={styles.visRow}>
            <View style={styles.visInfo}>
              <Text style={styles.visTitle}>نمایش در پروفایل</Text>
              <Text style={styles.visSub}>دیگران می‌توانند نتیجه را ببینند</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, visible && styles.toggleOn]}
              onPress={() => setVisible(v => !v)}
              activeOpacity={0.8}
            >
              {visible
                ? <Eye size={14} color="#fff" strokeWidth={2} />
                : <EyeOff size={14} color={Colors.muted} strokeWidth={2} />}
              <Text style={[styles.toggleText, visible && styles.toggleTextOn]}>
                {visible ? 'نمایش' : 'مخفی'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {!!result?.assistant_analysis?.disclaimer && (
          <Card tint="trust" style={styles.card}>
            <Text style={styles.noteText}>{result.assistant_analysis.disclaimer}</Text>
          </Card>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button variant="accent" onPress={() => router.replace('/profile-setup/profile-preview' as any)}>
          مشاهده پروفایل
        </Button>
        <Button variant="ghost" onPress={() => router.replace('/(tabs)/me' as any)}>
          بازگشت به پروفایل
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingBottom: 120, gap: 12 },

  hero: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 10 },
  heroBadge: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.purple, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  heroTitle: {
    fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.ink,
    textAlign: 'center', letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 22,
  },

  card: { gap: 4 },
  cardTitle: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 12 },

  dim: { marginBottom: 18 },
  dimHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  dimLabel: { fontSize: 12.5, fontFamily: Fonts.semiBold, color: Colors.ink },
  dimPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  dimPillTxt: { fontSize: 10.5, fontFamily: Fonts.bold },

  divTrack: {
    height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    position: 'relative', marginBottom: 6,
  },
  divCenter: {
    position: 'absolute', left: '50%', top: 0, bottom: 0,
    width: 2, marginLeft: -1, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  divFill: { position: 'absolute', top: 0, bottom: 0 },
  divPoles: { flexDirection: 'row', justifyContent: 'space-between' },
  divPole: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.regular },

  visRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  visInfo: { flex: 1 },
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

  noteText: { fontSize: 11.5, color: Colors.trust, fontFamily: Fonts.regular, lineHeight: 18 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
