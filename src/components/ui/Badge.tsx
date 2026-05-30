import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '@/constants/colors';

type BadgeKind = 'check' | 'ai' | 'community' | 'gold' | 'complete' | 'personality' | 'warn';

const META: Record<BadgeKind, { label: string; glyph: string; bg: string; fg: string }> = {
  check:       { label: 'تأیید پایه',   glyph: '🛡',  bg: Colors.trustSoft,  fg: Colors.trust  },
  ai:          { label: 'AI Trusted',   glyph: '✦',   bg: Colors.okSoft,     fg: Colors.ok     },
  community:   { label: 'Community',    glyph: '✓',   bg: Colors.purpleSoft, fg: Colors.purple  },
  gold:        { label: 'Gold',         glyph: '★',   bg: Colors.goldSoft,   fg: Colors.goldDeep},
  complete:    { label: 'پروفایل کامل', glyph: '✓',   bg: Colors.okSoft,     fg: Colors.ok     },
  personality: { label: 'تست شخصیت',   glyph: '✦',   bg: Colors.purpleSoft, fg: Colors.purple  },
  warn:        { label: 'هشدار',        glyph: '⚑',   bg: Colors.dangerSoft, fg: Colors.danger  },
};

interface BadgeProps {
  kind?: BadgeKind;
  label?: string;
  compact?: boolean;
}

export function Badge({ kind = 'check', label, compact }: BadgeProps) {
  const m = META[kind];
  const text = label === '' ? null : (label != null ? label : m.label);
  return (
    <View style={[styles.pill, { backgroundColor: m.bg, borderColor: m.fg + '33' }]}>
      <Text style={[styles.glyph, { color: m.fg }]}>{m.glyph}</Text>
      {text && <Text style={[styles.label, { color: m.fg }]}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  glyph: { fontSize: 10, lineHeight: 14 },
  label: { fontFamily: Fonts.extraBold, fontSize: 10.5, letterSpacing: -0.2 },
});
