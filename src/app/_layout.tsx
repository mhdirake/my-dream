import { AuthProvider } from '@/lib/auth/AuthContext';
import { CentrifugoProvider } from '@/lib/chat/CentrifugoContext';
import { ModerationProvider } from '@/lib/moderation/ModerationContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nManager, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ui/ToastConfig';
import { PrivacyGuard } from '@/components/privacy/PrivacyGuard';
import { KeyboardViewport } from '@/components/ui/KeyboardViewport';

SplashScreen.preventAutoHideAsync();

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const WEB_INITIAL_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

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
      <PrivacyGuard>
        <SafeAreaProvider initialMetrics={Platform.OS === 'web' ? WEB_INITIAL_SAFE_AREA_METRICS : undefined}>
          <StatusBar style="dark" />
          <AuthProvider>
            <ModerationProvider>
              <CentrifugoProvider>
                <KeyboardViewport>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                    <Stack.Screen name="profile-setup" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="moderation/banned" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="moderation/restriction-warning" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="moderation/admin-review" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="ai-coach" />
                    <Stack.Screen name="search" options={{ animation: 'fade_from_bottom' }} />
                  </Stack>
                </KeyboardViewport>
              </CentrifugoProvider>
            </ModerationProvider>
          </AuthProvider>
          <Toast config={toastConfig} visibilityTime={3000} topOffset={56} />
        </SafeAreaProvider>
      </PrivacyGuard>
    </GestureHandlerRootView>
  );
}
