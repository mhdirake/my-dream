import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '@/constants/colors';

const CAPTURE_KEY = 'my-dream-global-privacy';

export function PrivacyGuard({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setIsActive(state === 'active');
    });

    if (Platform.OS !== 'web') {
      ScreenCapture.preventScreenCaptureAsync(CAPTURE_KEY).catch(() => undefined);
      if (Platform.OS === 'ios') {
        ScreenCapture.enableAppSwitcherProtectionAsync(1).catch(() => undefined);
      }
    }

    return () => {
      subscription.remove();
      if (Platform.OS !== 'web') {
        ScreenCapture.allowScreenCaptureAsync(CAPTURE_KEY).catch(() => undefined);
        if (Platform.OS === 'ios') {
          ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
        }
      }
    };
  }, []);

  return (
    <View style={styles.root}>
      {children}
      {!isActive ? (
        <View
          style={styles.cover}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.brand}>My Dream</Text>
          <Text style={styles.message}>محتوا برای حفظ حریم خصوصی پنهان شده است</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#080611',
  },
  brand: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.accent },
  message: { fontSize: 12, fontFamily: Fonts.regular, color: '#D9D4E8' },
});
