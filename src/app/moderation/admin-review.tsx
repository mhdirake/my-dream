import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { router } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminReviewScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Clock size={36} color={Colors.purple} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>در صف بررسی</Text>
        <Text style={styles.body}>
          پروفایل یا رفتار اخیرت برای بررسی دستی توسط تیم My Dream در صف قرار گرفته.{'\n\n'}
          معمولاً ۲ تا ۲۴ ساعت طول می‌کشه. در این مدت برخی قابلیت‌ها موقتاً محدود شدن.
        </Text>

        <View style={styles.timeCard}>
          <Text style={styles.timeLabel}>زمان بررسی معمول</Text>
          <Text style={styles.timeValue}>۲ تا ۲۴ ساعت</Text>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)' as never);
          }}
        >
          <Text style={styles.backTxt}>بازگشت به اپ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: {
    flex: 1, padding: Spacing.xl,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },

  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.purple + '18',
    borderWidth: 2, borderColor: Colors.purple + '44',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontSize: 20, fontFamily: Fonts.extraBold, color: Colors.purple },
  body: {
    fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 22,
  },

  timeCard: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.hair,
    alignItems: 'center', gap: 4,
  },
  timeLabel: { fontSize: 11.5, fontFamily: Fonts.semiBold, color: Colors.muted },
  timeValue: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.ink },

  backBtn: {
    marginTop: 8, width: '100%',
    backgroundColor: Colors.purple,
    borderRadius: Radius.pill, paddingVertical: 14,
    alignItems: 'center',
  },
  backTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
});
