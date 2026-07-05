import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { Modal, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  myAvatarUrl?: string | null;
  otherAvatarUrl?: string | null;
  otherName: string;
  message?: string | null;
  onStartChat: () => void;
  onClose: () => void;
};

export function MatchCelebrationModal({
  visible, myAvatarUrl, otherAvatarUrl, otherName, message, onStartChat, onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={Colors.gradColors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Sparkles size={22} color="#fff" strokeWidth={2} />
          </LinearGradient>

          <Text style={styles.title}>شما به هم علاقه دارید!</Text>
          <Text style={styles.sub}>{message || `تو و ${otherName} هر دو به هم علاقه نشون دادین.`}</Text>

          <View style={styles.avatarsRow}>
            <Avatar size={64} name="من" photoUrl={myAvatarUrl} />
            <View style={styles.heartWrap}>
              <Text style={styles.heart}>💕</Text>
            </View>
            <Avatar size={64} name={otherName} photoUrl={otherAvatarUrl} />
          </View>

          <Button variant="accent" onPress={onStartChat}>
            شروع گفتگو
          </Button>
          <Button variant="ghost" onPress={onClose}>
            بعداً
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontFamily: Fonts.extraBold, color: Colors.ink },
  sub: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20, marginBottom: 6,
  },
  avatarsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8,
  },
  heartWrap: { alignItems: 'center', justifyContent: 'center' },
  heart: { fontSize: 22 },
});
