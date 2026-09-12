import { Colors, Fonts, Radius } from '@/constants/colors';
import { router } from 'expo-router';
import { Coins } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

const toPersian = (n: number | string) =>
  String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/** Coin balance pill — tap goes to the buy-coins screen. Meant for an AppBar `right` slot. */
export function CoinBadge({ count }: { count: number | null | undefined }) {
  return (
    <TouchableOpacity
      style={styles.badge}
      onPress={() => router.push('/gifts/buy-coins' as never)}
      activeOpacity={0.75}
      hitSlop={6}
    >
      <Coins size={13} color={Colors.goldDeep} strokeWidth={2.2} />
      <Text style={styles.txt}>{count == null ? '—' : toPersian(count)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  txt: { fontSize: 12.5, fontFamily: Fonts.bold, color: Colors.goldDeep },
});
