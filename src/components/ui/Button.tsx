import { Colors, Fonts, Radius } from '@/constants/colors';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

type Variant = 'accent' | 'primary' | 'outline' | 'ghost' | 'soft' | 'trust' | 'gold' | 'danger';

interface ButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  full?: boolean;
  small?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

const variantStyles: Record<Variant, { bg: string; color: string; border: string }> = {
  accent:  { bg: Colors.accentSoft, color: Colors.accent, border: Colors.accent },
  primary: { bg: Colors.surface3, color: Colors.ink, border: Colors.lineSoft },
  outline: { bg: 'transparent',   color: Colors.ink, border: Colors.lineSoft },
  ghost:   { bg: 'rgba(255,255,255,0.04)', color: Colors.ink, border: Colors.lineSoft },
  soft:    { bg: Colors.accentSoft, color: Colors.accent, border: Colors.accent },
  trust:   { bg: Colors.trustSoft, color: Colors.trust, border: Colors.trust },
  gold:    { bg: Colors.goldSoft, color: Colors.goldDeep, border: Colors.gold },
  danger:  { bg: 'transparent',   color: Colors.danger, border: Colors.danger },
};

export function Button({ children, variant = 'accent', full = true, small, onPress, style, disabled }: ButtonProps) {
  const v = variantStyles[variant];

  const containerStyle = [
    styles.base,
    { backgroundColor: v.bg, borderColor: v.border },
    full && styles.full,
    small && styles.small,
    disabled && styles.disabled,
    style,
  ];

  const label = (
    <Text style={[styles.label, { color: v.color }, small && styles.labelSmall]}>
      {children}
    </Text>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
    >
      {label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    borderWidth: 1.5,
  },
  full: { width: '100%' },
  small: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 14 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    textAlign: 'center',
    flex: 1
  },
  labelSmall: { fontSize: 12.5 },
});
