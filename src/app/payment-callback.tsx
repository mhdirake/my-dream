import { Colors, Fonts } from '@/constants/colors';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// در وب: اگه این صفحه داخل popup پرداخت باز شده باشه، این فراخوانی نتیجه رو به
// پنجره‌ی اصلی (openAuthSessionAsync) می‌رسونه و popup رو می‌بنده. در native بی‌اثره.
WebBrowser.maybeCompleteAuthSession();

export default function PaymentCallbackScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  useEffect(() => {
    // native: اگه deep link به‌جای بسته‌شدن session این صفحه رو باز کرد، سریع برگرد.
    // web: اگه popup نبود (پرداخت در همون تب باز شده و opener ای وجود نداره که
    // maybeCompleteAuthSession بهش خبر بده)، بعد از نمایش نتیجه خودمون برمی‌گردیم داخل اپ.
    const delay = Platform.OS === 'web' ? 2500 : 400;
    const t = setTimeout(() => router.replace('/(tabs)' as never), delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.root}>
      {isCompleted ? (
        <>
          <CheckCircle2 size={44} color={Colors.ok} strokeWidth={1.8} />
          <Text style={styles.title}>پرداخت با موفقیت انجام شد</Text>
        </>
      ) : isFailed ? (
        <>
          <XCircle size={44} color={Colors.danger} strokeWidth={1.8} />
          <Text style={styles.title}>پرداخت ناموفق بود</Text>
        </>
      ) : (
        <ActivityIndicator color={Colors.accent} />
      )}
      <Text style={styles.sub}>در حال بازگشت به اپلیکیشن…</Text>
      <TouchableOpacity onPress={() => router.replace('/(tabs)' as never)} activeOpacity={0.8}>
        <Text style={styles.link}>بازگشت به اپلیکیشن</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 14, backgroundColor: Colors.bg, padding: 24,
  },
  title: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.ink, textAlign: 'center' },
  sub: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted },
  link: { fontSize: 13.5, fontFamily: Fonts.semiBold, color: Colors.accent, marginTop: 8 },
});
