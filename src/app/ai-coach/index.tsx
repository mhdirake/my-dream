import { Colors, Fonts, Spacing } from '@/constants/colors';
import { router } from 'expo-router';
import { Bot, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AiCoachIndex() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronRight size={22} color={Colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Bot size={18} color={Colors.accent} strokeWidth={2} />
          <Text style={styles.headerTxt}>مربی هوش مصنوعی</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.center}>
        <Bot size={48} color={Colors.lineSoft} strokeWidth={1.5} />
        <Text style={styles.comingSoonTxt}>به زودی</Text>
        <Text style={styles.comingSoonSub}>این قابلیت هنوز فعال نشده است</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.hair,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTxt: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.ink },

  comingSoonTxt: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.inkSoft, marginTop: 4 },
  comingSoonSub: { fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.muted },
});
