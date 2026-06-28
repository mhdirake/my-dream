import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useModerationCtx } from '@/lib/moderation/ModerationContext';
import { ShieldOff } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BannedScreen() {
  const { moderationStatus } = useModerationCtx();
  const restrictions = moderationStatus?.active_restrictions ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <ShieldOff size={40} color={Colors.danger} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>حساب مسدود شده</Text>
        <Text style={styles.body}>
          به‌دلیل نقض مکرر قوانین جامعه My Dream، دسترسی این حساب به‌طور دائمی متوقف شده.
        </Text>

        {restrictions.length > 0 && (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>گزارش‌های معتبر دریافتی</Text>
            {restrictions.map(r => (
              <View key={r.id} style={styles.reportRow}>
                <Text style={styles.reportLabel}>{r.label}</Text>
                {r.reason && <Text style={styles.reportReason}>{r.reason}</Text>}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.appealBtn}
          activeOpacity={0.85}
          onPress={() => {}}
        >
          <Text style={styles.appealTxt}>اعتراض به بن</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
  content: {
    flex: 1, padding: Spacing.xl,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },

  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.danger + '22',
    borderWidth: 2, borderColor: Colors.danger + '55',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.danger },
  body: {
    fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.surface + 'CC',
    textAlign: 'center', lineHeight: 22,
  },

  reportCard: {
    width: '100%', backgroundColor: '#FFFFFF12',
    borderRadius: Radius.lg, padding: Spacing.md, gap: 8,
    borderWidth: 1, borderColor: '#FFFFFF18',
  },
  reportTitle: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.muted, marginBottom: 4 },
  reportRow: { gap: 2 },
  reportLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.surface },
  reportReason: { fontSize: 11.5, fontFamily: Fonts.regular, color: Colors.muted },

  appealBtn: {
    marginTop: 8, width: '100%',
    borderWidth: 1.5, borderColor: Colors.surface + '66',
    borderRadius: Radius.pill, paddingVertical: 13,
    alignItems: 'center',
  },
  appealTxt: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.surface },
});
