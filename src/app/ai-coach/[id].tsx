import { AppBar } from '@/components/ui/AppBar';
import { Colors, Fonts } from '@/constants/colors';
import { Bot } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AiCoachChat() {
  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="دستیار هوش مصنوعی" back backFallback="/me" />

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

  comingSoonTxt: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.inkSoft, marginTop: 4 },
  comingSoonSub: { fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.muted },
});
