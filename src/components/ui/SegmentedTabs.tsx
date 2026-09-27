import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export type SegmentedTabItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
  icon?: (active: boolean) => ReactNode;
};

type Props<T extends string> = {
  items: readonly SegmentedTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
};

const toPersianDigits = (value: number) =>
  String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[+digit]);

export function SegmentedTabs<T extends string>({ items, value, onChange, style, scrollable = false }: Props<T>) {
  const tabs = items.map(item => {
    const active = item.key === value;
    return (
      <Pressable
        key={item.key}
        style={[styles.tab, active && styles.tabActive]}
        onPress={() => onChange(item.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label}
      >
        {item.icon?.(active)}
        <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
        {item.count != null && item.count > 0 && (
          <View style={[styles.count, active && styles.countActive]}>
            <Text style={[styles.countText, active && styles.countTextActive]}>
              {toPersianDigits(item.count)}
            </Text>
          </View>
        )}
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.scroll, style]}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.row, style]}>
      {tabs}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: Spacing.lg,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  tab: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hair,
  },
  tabActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.muted,
  },
  labelActive: {
    color: Colors.accent,
  },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countActive: {
    backgroundColor: Colors.accent,
  },
  countText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.accent,
  },
  countTextActive: {
    color: Colors.onAccent,
  },
});
