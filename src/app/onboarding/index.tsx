import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Fonts } from '@/constants/colors';

const { width } = Dimensions.get('window');
const LOGO_SIZE = width * 0.38;
const GLOW_SIZE = LOGO_SIZE * 2.2;

export default function SplashScreen() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.06)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const t = setTimeout(() => router.replace('/onboarding/welcome'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={['#181522', '#221E30', '#2A1B3D']} style={styles.root}>
      <Animated.Image
        source={require('../../../assets/images/logo-glow.png')}
        style={[styles.glow, { opacity: glowOpacity }]}
      />
      <Animated.Image
        source={require('../../../assets/images/logo.png')}
        style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      />
      <Animated.View style={[styles.textWrap, { opacity: textOpacity }]}>
        <Text style={styles.name}>My Dream</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    resizeMode: 'contain',
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 24,
  },
  name: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: -0.5,
  },
});
