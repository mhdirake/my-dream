import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const GLOW_SIZE = width * 0.84;

export default function SplashScreen() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/onboarding/welcome'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={['#181522', '#221E30', '#2A1B3D']} style={styles.root}>
      <Image
        source={require('../../../assets/images/logo-glow.png')}
        style={styles.glow}
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
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    opacity: 0.6,
    resizeMode: 'contain',
  },
});
