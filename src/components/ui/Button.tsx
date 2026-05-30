import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors, Fonts } from '@/constants/colors';

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

const variantStyles: Record<Variant, { bg: string; color: string; border?: string }> = {
  accent:  { bg: Colors.accent,   color: '#fff' },
  primary: { bg: Colors.ink,      color: '#fff' },
  outline: { bg: 'transparent',   color: Colors.ink, border: Colors.lineSoft },
  ghost:   { bg: 'rgba(36,33,42,0.04)', color: Colors.ink },
  soft:    { bg: Colors.accentSoft, color: Colors.accent },
  trust:   { bg: Colors.trust,    color: '#fff' },
  gold:    { bg: Colors.gold,     color: '#3A2C0A' },
  danger:  { bg: 'transparent',   color: Colors.danger, border: Colors.danger },
};

export function Button({ children, variant = 'accent', full = true, small, onPress, style, disabled }: ButtonProps) {
  const v = variantStyles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border || 'transparent', borderWidth: v.border ? 1 : 0 },
        full && styles.full,
        small && styles.small,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color: v.color }, small && styles.labelSmall]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  full: { width: '100%' },
  small: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  labelSmall: { fontSize: 12.5 },
});
