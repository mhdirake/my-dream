import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

export type SegmentedTabItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  items: SegmentedTabItem<T>[];
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
    gap: 8,
    marginBottom: Spacing.lg,
  },
  tab: {
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
