import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { useModerationCtx } from '@/lib/moderation/ModerationContext';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LEVELS = [1, 2, 3, 7, 10, 15, 20, 30];

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fa-IR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function RestrictionWarningScreen() {
  const { moderationStatus, acknowledgeRestriction } = useModerationCtx();
  const restriction = moderationStatus?.active_restrictions?.[0];

  const handleAck = async () => {
    await acknowledgeRestriction();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={32} color="#E67E22" strokeWidth={2} />
        </View>

        <Text style={styles.title}>هشدار رفتاری</Text>
        <Text style={styles.body}>
          {restriction?.reason
            ? restriction.reason
            : 'رفتار اخیرت گزارش‌های معتبر دریافت کرده. بر اساس قوانین، محدودیت پلکانی اعمال شد.'}
        </Text>

        {restriction && (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>{restriction.label}</Text>
            {restriction.ends_at && (
              <Text style={styles.detailSub}>پایان محدودیت: {formatDate(restriction.ends_at)}</Text>
            )}
          </View>
        )}

        {/* Escalation ladder */}
        <View style={styles.ladderWrap}>
          <Text style={styles.ladderTitle}>سطح محدودیت پلکانی</Text>
          <View style={styles.ladder}>
            {LEVELS.map((days, i) => {
              const level = i + 1;
              const isCurrent = restriction?.level === level;
              const isPast = (restriction?.level ?? 0) > level;
              return (
                <View
                  key={level}
                  style={[
                    styles.ladderBox,
                    isPast && styles.ladderBoxPast,
                    isCurrent && styles.ladderBoxCurrent,
                  ]}
                >
                  <Text style={[styles.ladderTxt, isCurrent && styles.ladderTxtCurrent]}>
                    {days}d
                  </Text>
                </View>
              );
            })}
            <View style={[styles.ladderBox, styles.ladderBoxBan]}>
              <Text style={styles.ladderTxt}>∞</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.ackBtn} onPress={handleAck} activeOpacity={0.85}>
          <Text style={styles.ackTxt}>فهمیدم</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.appealBtn}
          onPress={() => { handleAck(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.appealTxt}>اعتراض به محدودیت</Text>
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
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: '#E67E2255',
    backgroundColor: '#E67E2218',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 20, fontFamily: Fonts.extraBold, color: '#E67E22' },
  body: {
    fontSize: 13.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 22,
  },

  detailCard: {
    width: '100%', backgroundColor: '#FFF3E0',
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: '#E67E2233', alignItems: 'center',
  },
  detailLabel: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  detailSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 4 },

  ladderWrap: { width: '100%', marginTop: 4 },
  ladderTitle: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.muted, marginBottom: 8, textAlign: 'center' },
  ladder: { flexDirection: 'row', gap: 4, justifyContent: 'center', flexWrap: 'wrap' },
  ladderBox: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.lineSoft,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  ladderBoxPast: { backgroundColor: '#E67E2233', borderColor: '#E67E2255' },
  ladderBoxCurrent: { backgroundColor: '#E67E22', borderColor: '#E67E22' },
  ladderBoxBan: { backgroundColor: Colors.dangerSoft, borderColor: Colors.dangerSoft },
  ladderTxt: { fontSize: 10, fontFamily: Fonts.semiBold, color: Colors.muted },
  ladderTxtCurrent: { color: '#fff' },

  ackBtn: {
    width: '100%', backgroundColor: Colors.ink,
    borderRadius: Radius.pill, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  ackTxt: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },

  appealBtn: { paddingVertical: 8 },
  appealTxt: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.muted },
});
