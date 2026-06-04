import { Button } from '@/components/ui/Button';
import { Colors, Fonts } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Heart, Lock, Sparkles, Target, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Custom hook: staggered entrance ──────────────────────────────
function useEnter(delay: number) {
  const y = useSharedValue(32);
  const op = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 120 }));
    op.value = withDelay(delay, withTiming(1, { duration: 480 }));
  }, []);
  return useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: y.value }],
  }));
}

// ── Floating orb ─────────────────────────────────────────────────
type OrbProps = {
  color: string; size: number; delay: number; floatY?: number; duration?: number;
  top?: number; bottom?: number; left?: number; right?: number;
};

function Orb({ color, size, delay, floatY = 16, duration = 4200, top, bottom, left, right }: OrbProps) {
  const ty = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 1400 }));
    ty.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-floatY, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(floatY * 0.55, { duration: duration + 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, top, bottom, left, right },
        animStyle,
      ]}
    />
  );
}

// ── Hero ─────────────────────────────────────────────────────────
function Hero() {
  const logoStyle = useEnter(80);
  const headlineStyle = useEnter(300);
  const subStyle = useEnter(500);

  return (
    <View style={styles.hero}>
      {/* Base */}
      <LinearGradient
        colors={['#080314', '#0F0520', '#090218']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating orbs — canvas-design: warm light blooming in dark space */}
      <Orb color="rgba(217,79,112,0.44)" size={230} top={-50} left={-55} delay={0} floatY={22} duration={4600} />
      <Orb color="rgba(108,74,182,0.30)" size={180} top={70} right={-45} delay={180} floatY={15} duration={3800} />
      <Orb color="rgba(217,79,112,0.18)" size={110} bottom={90} right={85} delay={380} floatY={10} duration={5400} />

      {/* Logo mark */}
      <Animated.View style={[styles.logoRow, logoStyle]}>
        <Heart size={16} color="rgba(255,255,255,0.88)" fill="rgba(255,255,255,0.72)" strokeWidth={1.5} />
        <Text style={styles.logoText}>MY DREAM</Text>
      </Animated.View>

      {/* Headline block */}
      <Animated.View style={[styles.headlineWrap, headlineStyle]}>
        {/* <Text style={styles.headline}>جایی برای{'\n'}رابطه‌ای واقعی</Text> */}
      </Animated.View>

      {/* Sub */}
      {/* <Animated.Text style={[styles.heroSub, subStyle]}>
        هدف رابطه‌ات را اول انتخاب کن
      </Animated.Text> */}

      {/* Fade to bg */}
      <LinearGradient
        colors={['transparent', Colors.bg]}
        style={styles.heroFade}
        pointerEvents="none"
      />
    </View>
  );
}

// ── Feature cards ─────────────────────────────────────────────────
const FEATURES: { icon: LucideIcon; color: string; bg: string; label: string; sub: string }[] = [
  { icon: Target, color: Colors.accent, bg: Colors.accentSoft, label: 'هدف رابطه، اول از همه', sub: 'از ازدواج تا دوستی و همسفر' },
  { icon: Lock, color: Colors.trust, bg: Colors.trustSoft, label: 'فضای امن و محرمانه', sub: 'اطلاعات شما محافظت می‌شه' },
  { icon: Sparkles, color: Colors.purple, bg: Colors.purpleSoft, label: 'AI Match هوشمند', sub: 'پیشنهاد بر اساس ارزش‌هات' },
];

function FeatureCard({ icon: Icon, color, bg, label, sub, delay }: {
  icon: LucideIcon; color: string; bg: string; label: string; sub: string; delay: number;
}) {
  const animStyle = useEnter(delay);
  return (
    <Animated.View style={[styles.card, animStyle]}>
      {/* 44×44 touch-safe icon target */}
      <View style={[styles.cardIcon, { backgroundColor: bg }]}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const ctaStyle = useEnter(620);

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Hero />

        <View style={styles.body}>
          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.label} {...f} delay={220 + i * 120} />
            ))}
          </View>

          <Animated.View style={[styles.cta, ctaStyle]}>
            <Button variant="accent" onPress={() => router.push('/onboarding/phone')}>
              شروع کنیم
            </Button>
            <Button variant="ghost" onPress={() => router.push('/onboarding/login')}>
              قبلاً حساب دارم
            </Button>
            <Text style={styles.legal}>
              با ورود، <Text style={styles.link}>قوانین</Text> و{' '}
              <Text style={styles.link}>حریم خصوصی</Text> را می‌پذیرم
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  // Hero
  hero: {
    height: 290,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  logoText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 3,
  },
  headlineWrap: {
    alignItems: 'center',
  },
  headline: {
    fontSize: 34,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 60,
    letterSpacing: -1.2,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginBottom: 52,
  },
  heroFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 110,
  },

  // Body
  body: { padding: 24, paddingTop: 16, flex: 1 },
  features: { gap: 12, marginBottom: 32 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.hair,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    gap: 4,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.ink,
    textAlign: 'right',
  },
  cardSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.muted,
    textAlign: 'right',
  },

  cta: { gap: 10 },
  legal: {
    fontSize: 10.5,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Fonts.regular,
  },
  link: { color: Colors.accent },
});
