import { Sheet } from '@/components/ui/Sheet';
import { BADGE_META, type BadgeKind } from '@/components/ui/Badge';
import { Colors, Fonts } from '@/constants/colors';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  kind: BadgeKind | null;
  description: string;
  onClose: () => void;
};

/**
 * Read-only explainer for a non-tier badge (gold / complete-profile / personality
 * test) shown on someone else's profile — no requirements checklist, just what
 * the badge means. The three verification tiers use `UserBadgeInfoModal` instead.
 */
export function SimpleBadgeInfoModal({ kind, description, onClose }: Props) {
  const meta = kind ? BADGE_META[kind] : null;

  return (
    <Sheet visible={!!kind} onClose={onClose} title={meta?.label}>
      {meta ? (
        <View style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
            <meta.icon size={26} color={meta.fg} strokeWidth={2} />
          </View>
          <Text style={styles.desc}>{description}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 14, paddingVertical: 6 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft, textAlign: 'center', lineHeight: 21 },
});
