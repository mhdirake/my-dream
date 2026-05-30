// Splash screen
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, Fonts } from '@/constants/colors';

export default function SplashScreen() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/onboarding/welcome'), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>MD</Text>
      </View>
      <Text style={styles.name}>My Dream</Text>
      <Text style={styles.sub}>آشنایی محترمانه</Text>
      <Text style={styles.loading}>loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 38,
    fontFamily: Fonts.extraBold,
    color: Colors.accent,
  },
  name: {
    marginTop: 20,
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 6,
    fontFamily: Fonts.regular,
  },
  loading: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: Colors.muted,
    fontFamily: Fonts.regular,
  },
});
