import { BlurTargetView, BlurView } from 'expo-blur';
import { createContext, useContext, useRef, type PropsWithChildren, type RefObject } from 'react';
import { Modal as NativeModal, Platform, StyleSheet, View, type ModalProps } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardSurface } from './KeyboardViewport';
import { AlertLayerHost } from './AlertLayer';
import { dismissConfirmSheet } from '@/lib/confirmSheet';

const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function ModalBlurTarget({ children }: PropsWithChildren) {
  const target = useRef<View | null>(null);

  return (
    <BlurTargetContext.Provider value={target}>
      <BlurTargetView ref={target} style={styles.fill}>{children}</BlurTargetView>
    </BlurTargetContext.Provider>
  );
}

/** Adds blur behind the existing dim layer, leaving each modal's content sharp. */
export function Modal({ children, ...props }: ModalProps) {
  const target = useContext(BlurTargetContext);
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();

  return (
    <NativeModal statusBarTranslucent navigationBarTranslucent {...props} onRequestClose={event => {
      if (!dismissConfirmSheet()) props.onRequestClose?.(event);
    }}>
      <BlurView
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        intensity={28}
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        blurTarget={target ?? undefined}
        blurReductionFactor={1}
      />
      <SafeAreaProvider initialMetrics={{ insets, frame }} style={styles.fill}>
        <KeyboardSurface modal>
          <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
            {children}
          </SafeAreaView>
        </KeyboardSurface>
        {props.visible && <AlertLayerHost />}
      </SafeAreaProvider>
    </NativeModal>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
