import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { profileSetupStore } from '@/lib/profileSetupStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CheckCircle, Clock, Eye } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const REQUIRED_ITEMS = [
  { label: 'نام، تاریخ تولد، جنسیت', status: 'done' as const },
  { label: 'استان و شهر', status: 'done' as const },
  { label: 'عکس پروفایل', status: 'review' as const },
];

export default function AccountReadyScreen() {
  const handleOptional = () => {
    profileSetupStore.clear();
    router.push('/profile-setup/bio' as any);
  };

  const handleSkip = () => {
    profileSetupStore.clear();
    router.replace('/(tabs)/' as any);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.ringWrap}>
          <ProgressRing value={45} />
        </View>

        <Text style={styles.title}>حساب شما ساخته شد 🎉</Text>
        <Text style={styles.body}>
          اطلاعات ضروری کامل شد. می‌تونی همین حالا وارد اپ بشی — بقیه‌ی پروفایل کاملاً
          اختیاریه و هر وقت خواستی تکمیلش کن.
        </Text>

        <Card soft style={styles.checkCard}>
          <Text style={styles.checkTitle}>اطلاعات ضروری</Text>
          {REQUIRED_ITEMS.map(item => (
            <View key={item.label} style={styles.checkRow}>
              <View
                style={[
                  styles.checkIcon,
                  item.status === 'done' ? styles.iconDone : styles.iconReview,
                ]}
              >
                {item.status === 'done' ? (
                  <CheckCircle size={13} color="#fff" strokeWidth={2.5} />
                ) : (
                  <Eye size={13} color={Colors.goldDeep} strokeWidth={2.5} />
                )}
              </View>
              <Text style={styles.checkLabel}>{item.label}</Text>
              {item.status === 'review' && (
                <View style={styles.reviewBadge}>
                  <Clock size={10} color={Colors.goldDeep} strokeWidth={2} />
                  <Text style={styles.reviewText}>در حال بررسی</Text>
                </View>
              )}
            </View>
          ))}
        </Card>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            بررسی عکس در پس‌زمینه انجام می‌شه و ممکنه چند دقیقه طول بکشه. لازم نیست منتظر بمونی.
          </Text>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Button variant="accent" onPress={handleOptional}>
          تکمیل پروفایل (پیشنهاد می‌شه)
        </Button>
        <View style={{ height: 8 }} />
        <Button variant="ghost" onPress={handleSkip}>
          بعداً — ورود به اپ
        </Button>
      </View>
    </SafeAreaView>
  );
}

function ProgressRing({ value }: { value: number }) {
  const toPersian = (n: number) =>
    String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  return (
    <LinearGradient
      colors={['#FCE8ED', '#EDE7F8']}
      style={styles.ring}
    >
      <View style={styles.ringInner}>
        <Text style={styles.ringValue}>{toPersian(value)}٪</Text>
        <Text style={styles.ringLabel}>تکمیل پروفایل</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, padding: Spacing.xl },
  ringWrap: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  ring: {
    width: 124, height: 124, borderRadius: 62,
    alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  ringValue: { fontSize: 27, fontFamily: Fonts.extraBold, color: Colors.accent },
  ringLabel: { fontSize: 9.5, color: Colors.muted, fontFamily: Fonts.regular },
  title: {
    fontSize: 23, fontFamily: Fonts.extraBold, color: Colors.ink,
    letterSpacing: -0.4, textAlign: 'center', marginBottom: 10,
  },
  body: {
    fontSize: 13, color: Colors.inkSoft, fontFamily: Fonts.regular,
    lineHeight: 22, textAlign: 'center', marginBottom: 20,
  },
  checkCard: { marginBottom: 12 },
  checkTitle: {
    fontSize: 11, fontFamily: Fonts.extraBold, color: Colors.muted,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7,
  },
  checkIcon: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  iconDone: { backgroundColor: Colors.ok },
  iconReview: { backgroundColor: Colors.goldSoft },
  checkLabel: { fontSize: 13, color: Colors.ink, fontFamily: Fonts.regular, flex: 1 },
  reviewBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.goldSoft, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: Radius.pill,
  },
  reviewText: { fontSize: 10, color: Colors.goldDeep, fontFamily: Fonts.semiBold },
  noteBox: {
    backgroundColor: Colors.trustSoft, borderRadius: Radius.md,
    padding: 12,
  },
  noteText: { fontSize: 11.5, color: Colors.trust, fontFamily: Fonts.regular, lineHeight: 18 },
  bottomBar: {
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineSoft,
    backgroundColor: Colors.surface,
  },
});
