import { AuthProvider } from '@/lib/auth/AuthContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nManager } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ui/ToastConfig';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="profile-setup" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </AuthProvider>
        <Toast config={toastConfig} visibilityTime={3000} topOffset={56} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
