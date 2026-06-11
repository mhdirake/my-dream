import { Colors, Fonts } from '@/constants/colors';
import { BackendGift, discoverApi } from '@/lib/api/discover';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  userId: number;
  firstName: string;
  token: string;
  onClose: () => void;
};

const SLUG_EMOJI: Record<string, string> = {
  'dream-rose': '🌹',
  'coffee-invite': '☕',
  'cool-moon': '🌙',
  'golden-heart': '💛',
  'legendary-star': '⭐',
};

export function GiftModal({ visible, userId, firstName, token, onClose }: Props) {
  const [gifts, setGifts] = useState<BackendGift[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!visible || !token) return;
    discoverApi.listGifts(token).then(setGifts).catch(() => {});
  }, [visible, token]);

  const handleSend = async () => {
    if (selected == null) return;
    setSending(true);
    try {
      await discoverApi.sendGift(token, userId, selected);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSelected(null);
        onClose();
      }, 1200);
    } catch {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelected(null);
    setSent(false);
    onClose();
  };

  const displayGifts = gifts.length > 0 ? gifts : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentEmoji}>🎁</Text>
            <Text style={styles.sentTxt}>هدیه ارسال شد!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>ارسال هدیه به {firstName}</Text>
            <Text style={styles.sub}>هر هدیه از موجودی سکه شما کسر می‌شود</Text>

            {displayGifts.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.accent} />
              </View>
            ) : (
              <View style={styles.grid}>
                {displayGifts.map(g => {
                  const emoji = SLUG_EMOJI[g.slug] ?? '🎁';
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.giftCard, selected === g.id && styles.giftCardSelected]}
                      onPress={() => setSelected(g.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.giftEmoji}>{emoji}</Text>
                      <Text style={styles.giftLabel}>{g.title}</Text>
                      <View style={styles.coinRow}>
                        <Text style={styles.coinIcon}>🪙</Text>
                        <Text style={styles.coinTxt}>{g.coin_price}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={[styles.sendBtn, (selected == null || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={selected == null || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendTxt}>ارسال هدیه</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.lineSoft, marginBottom: 20,
  },
  title: { fontSize: 17, fontFamily: Fonts.extraBold, color: Colors.ink, marginBottom: 4 },
  sub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.muted, marginBottom: 24 },

  loadingBox: { height: 100, justifyContent: 'center', marginBottom: 24 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24, justifyContent: 'center' },
  giftCard: {
    width: 80, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 18, backgroundColor: Colors.surface,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  giftCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  giftEmoji: { fontSize: 28, marginBottom: 6 },
  giftLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.ink, marginBottom: 5 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  coinIcon: { fontSize: 10 },
  coinTxt: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.goldDeep },

  sendBtn: {
    width: '100%', height: 50, borderRadius: 25,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  sendBtnDisabled: { backgroundColor: Colors.ph, shadowOpacity: 0 },
  sendTxt: { fontSize: 15, fontFamily: Fonts.extraBold, color: '#fff' },

  sentBox: { alignItems: 'center', paddingVertical: 24 },
  sentEmoji: { fontSize: 48, marginBottom: 12 },
  sentTxt: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.ok },
});
