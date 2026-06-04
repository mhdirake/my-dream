import { Colors, Fonts } from '@/constants/colors';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AppBarProps {
  title: string;
  sub?: string;
  back?: boolean;
  right?: React.ReactNode;
  dark?: boolean;
}

export function AppBar({ title, sub, back, right, dark }: AppBarProps) {
  const color = dark ? '#fff' : Colors.ink;
  return (
    <View style={[styles.bar, dark && styles.barDark]}>
      {back && (
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={20} color={color} strokeWidth={2.2} />
        </Pressable>
      )}
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color, fontFamily: Fonts.extraBold }]} numberOfLines={1}>
          {title}
        </Text>
        {sub && (
          <Text style={[styles.sub, { color: dark ? 'rgba(255,255,255,.6)' : Colors.muted }]}>
            {sub}
          </Text>
        )}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 54,
    flexDirection:  'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: 'transparent',
    zIndex: 4,
  },
  barDark: { backgroundColor: 'transparent' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  title: { fontSize: 17, letterSpacing: -0.3, textAlign: 'right' },
  sub: { fontSize: 11.5, marginTop: 1, fontFamily: Fonts.regular, textAlign: 'right' },
  right: { flexShrink: 0 },
});
