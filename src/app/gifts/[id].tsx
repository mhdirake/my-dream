import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { router, useLocalSearchParams } from 'expo-router';
import { Coins, Package } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toPersian = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  simple:    { label: 'ساده',     color: Colors.trust,  bg: Colors.trustSoft },
  cool:      { label: 'خفن',      color: Colors.purple, bg: Colors.purpleSoft },
  special:   { label: 'ویژه',     color: Colors.accent, bg: Colors.accentSoft },
  legendary: { label: 'افسانه‌ای', color: Colors.gold,   bg: Colors.goldSoft },
};

export default function GiftDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    emoji: string;
    type: string;
    coin_price: string;
    is_limited: string;
    inventory: string;
  }>();

  const meta = TYPE_META[params.type ?? ''] ?? { label: params.type ?? '', color: Colors.muted, bg: Colors.ph2 };
  const coinPrice = Number(params.coin_price ?? 0);
  const inventory = params.inventory ? Number(params.inventory) : null;
  const isLimited = params.is_limited === 'true';

  const handleSend = () => {
    router.push({
      pathname: '/gifts/send' as any,
      params: {
        giftId: params.id,
        giftTitle: params.title,
        giftEmoji: params.emoji,
        coinPrice: params.coin_price,
      },
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppBar title="جزئیات هدیه" back dark />

      <View style={styles.content}>
        {/* Glow + Emoji */}
        <View style={styles.glowWrap}>
          <View style={styles.glow} />
          <Text style={styles.emoji}>{params.emoji ?? '🎁'}</Text>
        </View>

        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.typeTxt, { color: meta.color }]}>{meta.label}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{params.title}</Text>

        {/* Limited */}
        {isLimited && (
          <View style={styles.limitedRow}>
            <Package size={12} color={Colors.accent} strokeWidth={2} />
            <Text style={styles.limitedTxt}>
              محدود{inventory !== null ? ` · ${toPersian(inventory)} عدد باقی‌مانده` : ''}
            </Text>
          </View>
        )}

        {/* Price card */}
        <View style={styles.priceCard}>
          <Coins size={24} color={Colors.gold} strokeWidth={2} />
          <Text style={styles.priceAmt}>{toPersian(coinPrice)} سکه</Text>
        </View>

        <Text style={styles.note}>
          این هدیه از کیف پول سکه شما کسر می‌شود و برای گیرنده قابل مشاهده خواهد بود.
        </Text>
      </View>

      <View style={styles.bottomBar}>
        <Button variant="accent" onPress={handleSend}>
          ارسال هدیه
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0B1A' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 20 },

  glowWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 10 },
  glow: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.gold,
    opacity: 0.15,
    transform: [{ scaleX: 1.4 }],
  },
  emoji: { fontSize: 80, textAlign: 'center' },

  typeBadge: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: Radius.pill, marginBottom: 12,
  },
  typeTxt: { fontSize: 12, fontFamily: Fonts.extraBold },

  title: { fontSize: 24, fontFamily: Fonts.extraBold, color: '#fff', textAlign: 'center', marginBottom: 10 },

  limitedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  limitedTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.accent },

  priceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.gold + '20', borderRadius: Radius.xl,
    paddingHorizontal: 32, paddingVertical: 16,
    borderWidth: 1, borderColor: Colors.gold + '44',
    marginBottom: 20, marginTop: 14,
  },
  priceAmt: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.gold },

  note: {
    fontSize: 12, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.xl,
  },

  bottomBar: {
    padding: Spacing.lg, borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0E0B1A',
  },
});
