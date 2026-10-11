import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAppWidth } from '@/components/ui/AppFrame';

export default function SplashScreen() {
  const glowSize = useAppWidth() * 0.84;
  useEffect(() => {
    const t = setTimeout(() => router.replace('/onboarding/welcome'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={[Colors.bg, Colors.surface, Colors.surface2]} style={styles.root}>
      <Image
        source={require('../../../assets/images/logo-glow.png')}
        style={[styles.glow, { width: glowSize, height: glowSize }]}
      />
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
    opacity: 0.6,
    resizeMode: 'contain',
  },
});
