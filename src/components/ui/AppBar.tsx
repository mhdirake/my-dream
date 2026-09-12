import { Colors, Fonts } from '@/constants/colors';
import { Href, router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AppBarProps {
  title: string;
  sub?: string;
  back?: boolean;
  /** Where to go when the stack has nothing to pop (deep-link / hard reload). */
  backFallback?: Href;
  /** Full override of the back-press behaviour. */
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
}

export function AppBar({ title, sub, back, backFallback = '/', onBack, right, dark }: AppBarProps) {
  const color = dark ? '#fff' : Colors.ink;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(backFallback);
  };

  return (
    <View style={[styles.bar, dark && styles.barDark]}>

      {back && (
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
          <ChevronRight size={20} color={color} strokeWidth={2.2} />
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
    flexDirection: 'row',
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
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  title: { fontSize: 17, letterSpacing: -0.3, fontFamily: Fonts.extraBold },
  sub: { fontSize: 11.5, marginTop: 1, fontFamily: Fonts.regular },
  right: { flexShrink: 0 },
});
