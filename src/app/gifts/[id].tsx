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
          <View style={[styles.glow, { backgroundColor: meta.color }]} />
          <View style={[styles.emojiDisc, { backgroundColor: meta.bg, borderColor: meta.color + '33' }]}>
            <Text style={styles.emoji}>{params.emoji ?? '🎁'}</Text>
          </View>
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
          <View style={styles.priceIcon}>
            <Coins size={20} color={Colors.gold} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.priceLabel}>قیمت هدیه</Text>
            <Text style={styles.priceAmt}>{toPersian(coinPrice)} سکه</Text>
          </View>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },

  glowWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  glow: {
    position: 'absolute',
    width: 168, height: 168, borderRadius: 84,
    opacity: 0.16,
  },
  emojiDisc: {
    width: 128, height: 128, borderRadius: 64,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 62, textAlign: 'center' },

  typeBadge: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: Radius.pill, marginBottom: 12,
  },
  typeTxt: { fontSize: 12, fontFamily: Fonts.extraBold },

  title: { fontSize: 24, fontFamily: Fonts.extraBold, color: '#fff', textAlign: 'center', marginBottom: 10 },

  limitedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  limitedTxt: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.accent },

  priceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.goldSoft, borderRadius: Radius.xl,
    paddingHorizontal: 22, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.gold,
    marginBottom: 20, marginTop: 14, alignSelf: 'stretch',
  },
  priceIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  priceLabel: { fontSize: 11, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.45)', marginBottom: 2 },
  priceAmt: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.gold },

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
