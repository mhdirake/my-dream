// Splash screen
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Fonts } from '@/constants/colors';

export default function SplashScreen() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/onboarding/welcome'), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={['#181522', '#221E30', '#2A1B3D']} style={styles.root}>
      <LinearGradient
        colors={Colors.gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoRing}
      >
        <View style={styles.logoInner}>
          <Text style={styles.logoText}>MD</Text>
        </View>
      </LinearGradient>

      <Text style={styles.name}>My Dream</Text>
      <Text style={styles.sub}>آشنایی محترمانه</Text>

      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 90,
    height: 90,
    borderRadius: 27,
    backgroundColor: '#221E30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    letterSpacing: -1,
  },

  name: {
    marginTop: 22,
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
    fontFamily: Fonts.regular,
  },

  dots: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.accent,
  },
});
