import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

export type SegmentedTabItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  items: readonly SegmentedTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
};

const toPersianDigits = (value: number) =>
  String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[+digit]);

export function SegmentedTabs<T extends string>({ items, value, onChange, style }: Props<T>) {
  return (
    <View style={[styles.row, style]}>
      {items.map(item => {
        const active = item.key === value;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(item.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            {item.count != null && item.count > 0 && (
              <View style={[styles.count, active && styles.countActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>
                  {toPersianDigits(item.count)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.ph2,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: Radius.sm - 2,
  },
  tabActive: {
    backgroundColor: Colors.surface,
  },
  label: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
    color: Colors.muted,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.ink,
  },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countActive: {
    backgroundColor: Colors.accentSoft,
  },
  countText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.muted,
  },
  countTextActive: {
    color: Colors.accent,
  },
});
