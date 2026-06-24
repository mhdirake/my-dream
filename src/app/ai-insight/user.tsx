import { AppBar } from '@/components/ui/AppBar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { aiInsightApi, type UserInsight, type UserInsightUnlocked, type GenerateError } from '@/lib/api/ai-insight';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/lib/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Clock, Coins, EyeOff, Lock, Sparkles } from 'lucide-react-native';
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

export default function UserInsightScreen() {
  const { session } = useAuth();
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName: string }>();
  const uid = Number(userId);

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [insight, setInsight] = useState<UserInsight | null>(null);

  useEffect(() => {
    if (!session?.accessToken || !uid) return;
    aiInsightApi.getUser(session.accessToken, uid)
      .then(setInsight)
      .catch(() => toast.error('خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, [session?.accessToken, uid]);

  const handlePurchase = () => {
    const locked = insight as { locked: true; price?: number } | null;
    Alert.alert(
      'خرید دسترسی',
      `${toPersian(locked?.price ?? 700)} سکه از کیف پول کسر می‌شه. می‌خوای ادامه بدی؟`,
      [
        { text: 'انصراف', style: 'cancel' },
        { text: 'بله، خرید', onPress: doPurchase },
      ],
    );
  };

  const doPurchase = async () => {
    if (!session?.accessToken || !uid) return;
    setPurchasing(true);
    try {
      const data = await aiInsightApi.purchaseUser(session.accessToken, uid);
      setInsight(data);
      toast.success('دسترسی با موفقیت خریداری شد');
    } catch (err) {
      if (err instanceof ApiError) {
        const d = (err as ApiError & { data?: { data?: GenerateError } }).data?.data;
        if (d?.status === 'insufficient_data') {
          toast.error('این کاربر داده کافی برای آنالیز نداره');
          return;
        }
        toast.error(err.message ?? 'خطا در خرید');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const isLocked = !insight || (insight as { locked?: boolean }).locked === true;
  const lockedData = isLocked ? (insight as { locked: true; target_hidden?: boolean; price?: number; access_hours?: number; can_purchase?: boolean; has_active_cached_insight?: boolean } | null) : null;
  const unlocked = isLocked ? null : (insight as UserInsightUnlocked);

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title={`آنالیز ${userName ?? ''}`} back />

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
            <Text style={styles.heroTitle}>آنالیز هوش مصنوعی</Text>
            <Text style={styles.heroSub}>
              تحلیل شخصیتی {userName} بر اساس سبک گفتگو و رفتار ارتباطی
            </Text>
          </LinearGradient>

          {/* Target hidden */}
          {isLocked && lockedData?.target_hidden && (
            <View style={styles.hiddenCard}>
              <EyeOff size={24} color={Colors.muted} strokeWidth={1.8} />
              <Text style={styles.hiddenTitle}>{userName} آنالیزش رو مخفی کرده</Text>
              <Text style={styles.hiddenSub}>این کاربر تحلیل هوش مصنوعی خود را از دید عموم پنهان کرده است.</Text>
            </View>
          )}

          {/* Locked, can purchase */}
          {isLocked && !lockedData?.target_hidden && lockedData?.can_purchase && (
            <>
              <View style={styles.lockedCard}>
                <Lock size={20} color={Colors.muted} strokeWidth={1.8} />
                <Text style={styles.lockedTitle}>آنالیز قفل است</Text>
                <Text style={styles.lockedSub}>
                  با خرید دسترسی، {toPersian(lockedData.access_hours ?? 24)} ساعت می‌تونی تحلیل کامل {userName} رو ببینی.
                </Text>
                <View style={styles.priceRow}>
                  <Coins size={14} color={Colors.goldDeep} strokeWidth={2} />
                  <Text style={styles.priceText}>{toPersian(lockedData.price ?? 700)} سکه</Text>
                </View>
                {lockedData.has_active_cached_insight !== false && (
                  <View style={styles.availableTag}>
                    <Text style={styles.availableTagTxt}>آنالیز آماده</Text>
                  </View>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [styles.btn, { opacity: pressed || purchasing ? 0.75 : 1 }]}
                onPress={handlePurchase}
                disabled={purchasing}
              >
                <LinearGradient
                  colors={['#6C4AB6', '#D94F70']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGrad}
                >
                  {purchasing
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Sparkles size={16} color="#fff" strokeWidth={2} /><Text style={styles.btnTxt}>خرید دسترسی</Text></>
                  }
                </LinearGradient>
              </Pressable>
            </>
          )}

          {/* Locked, cannot purchase (no cached insight or other reason) */}
          {isLocked && !lockedData?.target_hidden && !lockedData?.can_purchase && lockedData !== null && (
            <View style={styles.hiddenCard}>
              <Lock size={24} color={Colors.muted} strokeWidth={1.8} />
              <Text style={styles.hiddenTitle}>آنالیز در دسترس نیست</Text>
              <Text style={styles.hiddenSub}>این کاربر هنوز آنالیزی آماده ندارد.</Text>
            </View>
          )}

          {/* Unlocked */}
          {unlocked && (
            <>
              {unlocked.access_expires_at && (
                <View style={styles.accessRow}>
                  <Clock size={13} color={Colors.ok} strokeWidth={2} />
                  <Text style={styles.accessTxt}>دسترسی تا {formatDate(unlocked.access_expires_at)}</Text>
                </View>
              )}

              {unlocked.summary && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>خلاصه</Text>
                  <Text style={styles.summaryText}>{unlocked.summary}</Text>
                </View>
              )}

              {unlocked.result && (
                <View style={styles.resultCard}>
                  <Text style={styles.resultLabel}>تحلیل کامل</Text>
                  <Text style={styles.resultText}>{unlocked.result}</Text>
                </View>
              )}

              {unlocked.generated_at && (
                <Text style={styles.metaTxt}>تاریخ تولید: {formatDate(unlocked.generated_at)}</Text>
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

  hiddenCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.xxl,
    alignItems: 'center', gap: 8,
  },
  hiddenTitle: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.ink },
  hiddenSub: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20,
  },

  lockedCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.xxl,
    alignItems: 'center', gap: 8,
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
  availableTag: {
    backgroundColor: Colors.okSoft, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  availableTagTxt: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.ok },

  btn: { borderRadius: Radius.xl, overflow: 'hidden' },
  btnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  btnTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },

  accessRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.okSoft, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.pill, alignSelf: 'center',
  },
  accessTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.ok },

  summaryCard: {
    backgroundColor: Colors.purpleSoft, borderRadius: Radius.xl, padding: Spacing.xl, gap: 8,
  },
  summaryLabel: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.purple, letterSpacing: 0.5 },
  summaryText: { fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.ink, lineHeight: 22 },

  resultCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hair, padding: Spacing.xl, gap: 8,
  },
  resultLabel: { fontSize: 10.5, fontFamily: Fonts.extraBold, color: Colors.muted, letterSpacing: 0.5 },
  resultText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft, lineHeight: 22 },

  metaTxt: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.muted, textAlign: 'center' },
});
