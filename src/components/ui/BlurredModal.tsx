import { BlurTargetView, BlurView } from 'expo-blur';
import { createContext, useContext, useRef, type PropsWithChildren, type RefObject } from 'react';
import { Modal as NativeModal, Platform, StyleSheet, View, type ModalProps } from 'react-native';

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

  return (
    <NativeModal {...props}>
      <BlurView
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        intensity={28}
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        blurTarget={target ?? undefined}
        blurReductionFactor={1}
      />
      {children}
    </NativeModal>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
