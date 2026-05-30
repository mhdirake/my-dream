import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, Fonts } from '@/constants/colors';

type Tone = 'trust' | 'purple' | 'ok' | 'gold' | 'accent' | 'danger';

interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  tone?: Tone;
  small?: boolean;
  onPress?: () => void;
}

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  trust:  { bg: Colors.trustSoft,  fg: Colors.trust  },
  purple: { bg: Colors.purpleSoft, fg: Colors.purple  },
  ok:     { bg: Colors.okSoft,     fg: Colors.ok      },
  gold:   { bg: Colors.goldSoft,   fg: Colors.goldDeep },
  accent: { bg: Colors.accentSoft, fg: Colors.accent  },
  danger: { bg: Colors.dangerSoft, fg: Colors.danger  },
};

export function Chip({ children, active, tone, small, onPress }: ChipProps) {
  const resolved = tone ? toneMap[tone] : null;
  const bg = active ? Colors.ink : resolved ? resolved.bg : 'rgba(36,33,42,0.04)';
  const fg = active ? '#fff'     : resolved ? resolved.fg : Colors.inkSoft;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg }, small && styles.small]}
    >
      <Text style={[styles.label, { color: fg }, small && styles.labelSmall]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  small: { paddingHorizontal: 10, paddingVertical: 4 },
  label: { fontFamily: Fonts.semiBold, fontSize: 12.5 },
  labelSmall: { fontSize: 11 },
});
