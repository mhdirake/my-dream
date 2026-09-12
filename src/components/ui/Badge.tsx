import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Shield, Sparkles, Check, Star, Brain, Flag, type LucideIcon } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/colors';

export type BadgeKind = 'check' | 'ai' | 'community' | 'gold' | 'complete' | 'personality' | 'warn';

export const BADGE_META: Record<BadgeKind, { label: string; icon: LucideIcon; bg: string; fg: string }> = {
  check:       { label: 'تأیید پایه',   icon: Shield,   bg: Colors.trustSoft,  fg: Colors.trust   },
  ai:          { label: 'AI Trusted',   icon: Sparkles, bg: Colors.okSoft,     fg: Colors.ok      },
  community:   { label: 'Community',    icon: Check,    bg: Colors.purpleSoft, fg: Colors.purple  },
  gold:        { label: 'Gold',         icon: Star,     bg: Colors.goldSoft,   fg: Colors.goldDeep},
  complete:    { label: 'پروفایل کامل', icon: Check,    bg: Colors.okSoft,     fg: Colors.ok      },
  personality: { label: 'تست شخصیت',   icon: Brain,    bg: Colors.purpleSoft, fg: Colors.purple  },
  warn:        { label: 'هشدار',        icon: Flag,     bg: Colors.dangerSoft, fg: Colors.danger  },
};

interface BadgeProps {
  kind?: BadgeKind;
  label?: string;
  /** Show the badge in its dim, not-yet-earned style (grey pill, muted icon) instead of its kind color. */
  locked?: boolean;
  /** Makes the badge tappable — e.g. to open an explainer of what's needed to earn it. */
  onPress?: () => void;
}

export function Badge({ kind = 'check', label, locked, onPress }: BadgeProps) {
  const m = BADGE_META[kind];
  const text = label === '' ? null : (label != null ? label : m.label);
  const bg = locked ? Colors.hair : m.bg;
  const fg = locked ? Colors.muted : m.fg;

  const content = (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: fg + '33' }]}>
      <m.icon size={10} color={fg} strokeWidth={2.2} />
      {text && <Text style={[styles.label, { color: fg }]}>{text}</Text>}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {content}
    </Pressable>
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
  label: { fontFamily: Fonts.extraBold, fontSize: 10.5, letterSpacing: -0.2 },
});
