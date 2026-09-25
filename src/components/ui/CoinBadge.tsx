import { Colors, Fonts, Radius } from '@/constants/colors';
import { router } from 'expo-router';
import { Coins, Wallet } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const toPersian = (n: number | string) =>
  String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/** Shared header balance and wallet action, matching the Gifts header. */
export function CoinBadge({ count }: { count: number | null | undefined }) {
  return (
    <View style={styles.row}>
      <View style={styles.balance}>
        <Coins size={14} color={Colors.goldDeep} strokeWidth={2} />
        <Text style={styles.balanceText}>{count == null ? '…' : toPersian(count)}</Text>
      </View>
      <TouchableOpacity
        style={styles.walletButton}
        onPress={() => router.push('/gifts/wallet' as never)}
        activeOpacity={0.75}
      >
        <Wallet size={14} color={Colors.goldDeep} strokeWidth={2} />
        <Text style={styles.walletText}>کیف پول</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.goldDeep },
  walletButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  walletText: { fontSize: 11.5, fontFamily: Fonts.bold, color: Colors.goldDeep },
});
