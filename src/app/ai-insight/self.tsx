import { AppBar } from '@/components/ui/AppBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { aiInsightApi, type SelfInsight, type SelfInsightUnlocked, type GenerateError } from '@/lib/api/ai-insight';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, Coins, RefreshCw, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${toPersian(d.getFullYear())}/${toPersian(d.getMonth() + 1).padStart(2, '۰')}/${toPersian(d.getDate()).padStart(2, '۰')}`;
}

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default function SelfInsightScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insight, setInsight] = useState<SelfInsight | null>(null);

  const load = async () => {
    if (!session?.accessToken) return;
    try {
      const data = await aiInsightApi.getSelf(session.accessToken);
      setInsight(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session?.accessToken]);

  const handleGenerate = async () => {
    if (!session?.accessToken) return;

    const locked = insight as { locked: true; price: number } | null;
    if (locked?.locked) {
      Alert.alert(
        'آنالیز هوش مصنوعی',
        `${toPersian(locked.price)} سکه از کیف پول شما کسر می‌شه. ادامه می‌دی؟`,
        [
          { text: 'انصراف', style: 'cancel' },
          { text: 'بله، ادامه', onPress: generate },
        ],
      );
    } else {
      generate();
    }
  };

  const generate = async () => {
    if (!session?.accessToken) return;
    setGenerating(true);
    try {
      const data = await aiInsightApi.generateSelf(session.accessToken);
      setInsight(data);
      toast.success('آنالیز با موفقیت انجام شد');
    } catch (err) {
      if (err instanceof ApiError) {
        const d = (err as ApiError & { data?: { data?: GenerateError } }).data?.data;
        if (d?.status === 'insufficient_data') {
          const req = d.required!;
          const cur = d.current!;
          Alert.alert(
            'داده کافی نیست',
            `برای آنالیز نیاز به حداقل ${toPersian(req.active_conversations)} گفتگوی فعال (الان: ${toPersian(cur.active_conversations)}) و ${toPersian(req.total_messages)} پیام (الان: ${toPersian(cur.total_messages)}) داری.`,
          );
          return;
        }
        if (d?.status === 'insufficient_quality') {
          toast.error('کیفیت گفتگوها برای آنالیز کافی نیست');
          return;
        }
        toast.error(err.message ?? 'خطا در پردازش');
      }
    } finally {
      setGenerating(false);
    }
  };

  const isLocked = !insight || (insight as { locked?: boolean }).locked === true;
  const unlocked = isLocked ? null : (insight as SelfInsightUnlocked);

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="آنالیز هوش مصنوعی" back />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <LinearGradient colors={['#EDE7F8', '#FCE8ED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroIcon}>
              <Sparkles size={28} color={Colors.purple} strokeWidth={1.8} />
            </View>
            <Text style={styles.heroTitle}>آنالیز شخصیتی من</Text>
            <Text style={styles.heroSub}>
              هوش مصنوعی بر اساس سبک گفتگوها، رفتار ارتباطی و پاسخ‌های تست، یک تصویر جامع از شخصیت تو می‌سازه.
            </Text>
          </LinearGradient>

          {/* Locked state */}
          {isLocked && (
            <>
              <View style={styles.lockedCard}>
                <Brain size={20} color={Colors.muted} strokeWidth={1.8} />
                <Text style={styles.lockedTitle}>هنوز آنالیز نداری</Text>
                <Text style={styles.lockedSub}>
                  اولین آنالیز خودت رو بگیر و ببین هوش مصنوعی چه تصویری از تو داره.
                </Text>

                <View style={styles.priceRow}>
                  <Coins size={14} color={Colors.goldDeep} strokeWidth={2} />
                  <Text style={styles.priceText}>
                    {toPersian((insight as { price?: number })?.price ?? 300)} سکه
                  </Text>
                </View>

                <View style={styles.cacheMeta}>
                  <Text style={styles.cacheMetaTxt}>
                    آنالیز تا {toPersian((insight as { cache_days?: number })?.cache_days ?? 30)} روز معتبر می‌مونه
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.btn, { opacity: pressed || generating ? 0.75 : 1 }]}
                onPress={handleGenerate}
                disabled={generating}
              >
                <LinearGradient
                  colors={['#6C4AB6', '#D94F70']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGrad}
                >
                  {generating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Sparkles size={16} color="#fff" strokeWidth={2} /><Text style={styles.btnTxt}>دریافت آنالیز</Text></>
                  }
                </LinearGradient>
              </Pressable>
            </>
          )}

          {/* Unlocked state */}
          {unlocked && (
            <>
              {/* Summary */}
              {unlocked.summary && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>خلاصه</Text>
                  <Text style={styles.summaryText}>{unlocked.summary}</Text>
                </View>
              )}

              {/* Full result */}
              {unlocked.result && (
                <View style={styles.resultCard}>
                  <Text style={styles.resultLabel}>تحلیل کامل</Text>
                  <Text style={styles.resultText}>{unlocked.result}</Text>
                </View>
              )}

              {/* Meta */}
              <View style={styles.metaRow}>
                {unlocked.generated_at && (
                  <Text style={styles.metaTxt}>تولید: {formatDate(unlocked.generated_at)}</Text>
                )}
                {unlocked.cache_expires_at && (
                  <Text style={styles.metaTxt}>
                    {toPersian(daysLeft(unlocked.cache_expires_at))} روز تا انقضا
                  </Text>
                )}
              </View>

              {/* Regenerate */}
              {!unlocked.can_regenerate_at && (
                <Pressable
                  style={({ pressed }) => [styles.regenBtn, { opacity: pressed || generating ? 0.7 : 1 }]}
                  onPress={handleGenerate}
                  disabled={generating}
                >
                  {generating
                    ? <ActivityIndicator color={Colors.purple} size="small" />
                    : <><RefreshCw size={14} color={Colors.purple} strokeWidth={2} /><Text style={styles.regenTxt}>آنالیز مجدد</Text></>
                  }
                </Pressable>
              )}

              {unlocked.can_regenerate_at && (
                <Text style={styles.regenNote}>
                  آنالیز مجدد از {formatDate(unlocked.can_regenerate_at)} در دسترسه
                </Text>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.lg, gap: 14 },

  hero: {
    borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: 10,
  },
  heroIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: { fontSize: 17, fontFamily: Fonts.extraBold, color: Colors.ink },
  heroSub: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20,
  },

  lockedCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair,
    padding: Spacing.xxl, alignItems: 'center', gap: 8,
  },
  lockedTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  lockedSub: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.goldSoft, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.pill, marginTop: 4,
  },
  priceText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.goldDeep },
  cacheMeta: { marginTop: 2 },
  cacheMetaTxt: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted },

  btn: { borderRadius: Radius.xl, overflow: 'hidden' },
  btnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  btnTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },

  summaryCard: {
    backgroundColor: Colors.purpleSoft, borderRadius: Radius.xl,
    padding: Spacing.xl, gap: 8,
  },
  summaryLabel: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.purple, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 22 },

  resultCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.xl, gap: 8,
  },
  resultLabel: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 22 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaTxt: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted },

  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.purpleSoft, borderRadius: Radius.xl,
    paddingVertical: 13,
  },
  regenTxt: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.purple },

  regenNote: {
    fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted,
    textAlign: 'center',
  },
});
