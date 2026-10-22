import { Colors, Fonts } from '@/constants/colors';
import {
  COMPATIBILITY_DISCLAIMER, compatibilityPresentation, type CompatibilitySnapshot,
} from '@/lib/discovery/compatibility';
import { toFaDigits } from '@/lib/localization';
import { StyleSheet, Text, View } from 'react-native';

export function CompatibilitySummary({ compatibility, detailed = false, fallbackReason }: {
  compatibility: CompatibilitySnapshot | null | undefined;
  detailed?: boolean;
  fallbackReason?: string;
}) {
  const view = compatibilityPresentation(compatibility);
  const details = compatibility?.reason_details.filter(detail => detail.trim() !== COMPATIBILITY_DISCLAIMER) ?? [];
  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <Text style={styles.title}>{view.title}</Text>
      {view.score !== null && <Text style={styles.score} accessibilityLabel={`امتیاز سازگاری ${toFaDigits(view.score)} درصد`}>
        {toFaDigits(view.score)}٪
      </Text>}
      <Text style={styles.reason}>{!compatibility && fallbackReason ? fallbackReason : view.reason}</Text>
      {detailed && details.map((detail, index) => <Text key={index} style={styles.reason}>• {detail}</Text>)}
      {(detailed || view.score !== null) && <Text style={styles.disclaimer}>{COMPATIBILITY_DISCLAIMER}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: Colors.purpleSoft, borderRadius: 14, padding: 12, gap: 6, flexShrink: 1 },
  title: { color: Colors.purple, fontFamily: Fonts.bold, fontSize: 13, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
  score: { color: Colors.purple, fontFamily: Fonts.extraBold, fontSize: 25, textAlign: 'right' },
  reason: { color: Colors.ink, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
  disclaimer: { color: Colors.muted, fontFamily: Fonts.regular, fontSize: 11, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
});
