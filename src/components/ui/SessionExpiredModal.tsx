import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, LockKeyhole } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  onLogin: () => void;
}

export function SessionExpiredModal({ visible, onLogin }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <LinearGradient
            colors={Colors.gradSoftColors}
            style={styles.iconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <LockKeyhole size={28} color={Colors.accent} strokeWidth={2} />
          </LinearGradient>

          <Text style={styles.title}>باید دوباره وارد بشی</Text>
          <Text style={styles.body}>
            مدت ورودت تموم شده.{'\n'}برای ادامه یه‌بار دیگه وارد حسابت شو.
          </Text>

          <Pressable onPress={onLogin} style={({ pressed }) => [pressed && styles.pressed]}>
            <LinearGradient
              colors={Colors.gradColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <LogIn size={16} color="#fff" strokeWidth={2.5} />
              <Text style={styles.btnLabel}>ورود مجدد</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(24,21,34,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#24212A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontFamily: Fonts.extraBold,
    color: Colors.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: Radius.pill,
  },
  btnLabel: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: -0.2,
  },
  pressed: { opacity: 0.85 },
});