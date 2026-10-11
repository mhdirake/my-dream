import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { mountWebViewport } from '@/lib/webViewport';

const WebKeyboardContext = createContext(false);

export function useAppKeyboardVisible() {
  const webVisible = useContext(WebKeyboardContext);
  const nativeVisible = useKeyboardState(state => state.isVisible);
  return Platform.OS === 'web' ? webVisible : nativeVisible;
}

/** Native modals own a separate window; web portals share root CSS metrics. */
export function KeyboardSurface({ children, modal = false }: { children: ReactNode; modal?: boolean }) {
  if (Platform.OS === 'web') {
    return <View style={[styles.flex, modal && styles.webModal]}>{children}</View>;
  }
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="height" automaticOffset>
      {children}
    </KeyboardAvoidingView>
  );
}

/** One avoidance owner per window: never nest one in a form/chat screen. */
export function KeyboardViewport({ children }: { children: ReactNode }) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    return mountWebViewport(window, document, setKeyboardVisible);
  }, []);
  return (
    <WebKeyboardContext.Provider value={keyboardVisible}>
      <KeyboardSurface>{children}</KeyboardSurface>
    </WebKeyboardContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  webModal: Platform.OS === 'web' ? {
    flex: undefined,
    height: 'var(--app-viewport-height)' as any,
    marginTop: 'var(--app-viewport-offset-top)' as any,
  } : {},
});
