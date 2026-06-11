import { AuthProvider } from '@/lib/auth/AuthContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';

SplashScreen.preventAutoHideAsync();

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Vazirmatn-Regular':   require('../../assets/fonts/Vazirmatn-Regular.ttf'),
    'Vazirmatn-SemiBold':  require('../../assets/fonts/Vazirmatn-SemiBold.ttf'),
    'Vazirmatn-Bold':      require('../../assets/fonts/Vazirmatn-Bold.ttf'),
    'Vazirmatn-ExtraBold': require('../../assets/fonts/Vazirmatn-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="profile-setup" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </AuthProvider>
  );
}