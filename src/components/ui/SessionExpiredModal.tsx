import { Colors, Fonts, Radius } from '@/constants/colors';
import { Sheet } from '@/components/ui/Sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, LockKeyhole } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  visible: boolean;
  onLogin: () => void;
}

export function SessionExpiredModal({ visible, onLogin }: Props) {
  return (
    <Sheet
      visible={visible}
      onClose={onLogin}
      dismissable={false}
      showHandle={false}
      contentStyle={styles.content}
    >
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

      <Pressable onPress={onLogin} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
        <LogIn size={16} color={Colors.accent} strokeWidth={2.5} />
        <Text style={styles.btnLabel}>ورود مجدد</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 12, paddingTop: 32, paddingBottom: 12 },
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
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  btnLabel: {
    fontSize: 14.5,
    fontFamily: Fonts.bold,
    color: Colors.accent,
    letterSpacing: -0.2,
  },
  pressed: { opacity: 0.85 },
});
