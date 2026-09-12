import { Checkbox } from '@/components/ui/Checkbox';
import { Sheet } from '@/components/ui/Sheet';
import { Colors, Fonts, Radius } from '@/constants/colors';
import type { Tier } from '@/constants/verificationTiers';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  tier: Tier | null;
  /** First name of the profile being viewed, used to personalize the explainer. */
  firstName: string;
  onClose: () => void;
};

/**
 * Read-only explainer for a badge on someone else's profile — opened only for
 * badges they've already earned (locked/unearned badges aren't tappable, since
 * there's nothing actionable to show about another person's progress).
 */
export function UserBadgeInfoModal({ tier, firstName, onClose }: Props) {
  return (
    <Sheet visible={!!tier} onClose={onClose} title={tier?.title}>
      {tier ? (
        <>
          <View style={styles.hero}>
            <View style={[styles.iconWrap, { backgroundColor: tier.softColor }]}>{tier.icon}</View>
            <View style={[styles.statusChip, { backgroundColor: tier.softColor }]}>
              <Text style={[styles.statusTxt, { color: tier.color }]}>
                {firstName} این بج رو داره
              </Text>
            </View>
            <Text style={styles.explainer}>
              این بج وقتی داده می‌شه که این موارد کامل باشه:
            </Text>
          </View>

          <View style={styles.reqs}>
            {tier.requirements.map((req, i) => (
              <View key={i} style={styles.reqRow}>
                <Checkbox checked color={tier.color} size={18} />
                <Text style={styles.reqTxt}>{req}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 4 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill,
  },
  statusTxt: { fontSize: 12, fontFamily: Fonts.bold },
  explainer: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20,
  },

  reqs: { gap: 12 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqTxt: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: Colors.ink, textAlign: 'right', lineHeight: 20 },
});
