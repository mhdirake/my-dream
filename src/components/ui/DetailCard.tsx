import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export type DetailCardItem = { icon: ReactNode; text: string };

interface DetailCardProps {
  /** Centered icon above the title — pass a bare lucide icon element. */
  icon: ReactNode;
  title: string;
  titleColor?: string;
  /** Single centered line under the title (hero shape). Omit if using `items`. */
  subtitle?: string;
  /** Bullet list under the title (tips shape) — each row is a small icon + line of text. */
  items?: DetailCardItem[];
  /** Diagonal gradient colors. Defaults to the app's standard info-card tint. */
  colors?: readonly [string, string];
  /** Optional content pinned below the subtitle/items (e.g. a CTA button). */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one gradient "info card" shape used across the app for explanatory/tips
 * content and attractive upsells: centered icon, centered title, then either a
 * subtitle line or a bullet list, optionally with a footer (button). Introduced
 * from the "چطور زودتر تأیید بشم؟" / "سیستم تأیید My Dream" cards on
 * `verification/index.tsx` — reuse this instead of hand-rolling the gradient
 * again.
 */
export function DetailCard({
  icon, title, titleColor, subtitle, items, colors, footer, style,
}: DetailCardProps) {
  return (
    <LinearGradient
      colors={colors ?? [Colors.trustSoft, Colors.purpleSoft]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {icon}
      <Text style={[styles.title, titleColor && { color: titleColor }]}>{title}</Text>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {items && (
        <View style={styles.list}>
          {items.map((item, i) => (
            <View key={i} style={styles.row}>
              {item.icon}
              <Text style={styles.rowTxt}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      {footer && <View style={styles.footer}>{footer}</View>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl, padding: Spacing.xxl,
    alignItems: 'center', gap: 10,
  },
  title: { fontSize: 14, fontFamily: Fonts.extraBold, color: Colors.ink, textAlign: 'center' },
  subtitle: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20,
  },
  list: { gap: 10, marginTop: 2, alignSelf: 'stretch', alignItems: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center', maxWidth: '94%',
  },
  rowTxt: {
    fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.inkSoft,
    lineHeight: 20, textAlign: 'right', flexShrink: 1,
  },
  footer: { marginTop: 4, alignSelf: 'stretch', alignItems: 'center' },
});
