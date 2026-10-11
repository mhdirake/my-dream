import { Fragment, useId, useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ALERT_Z_INDEX, AlertLayers } from '@/lib/alertLayers';
import { toastConfig } from './ToastConfig';

const layers = new AlertLayers<ReactNode>();

export function AlertPortal({ children }: { children: ReactNode }) {
  const id = useId();
  useLayoutEffect(() => {
    layers.set(id, children);
    return () => layers.remove(id);
  }, [id, children]);
  return null;
}

export function AlertLayerHost({ root = false }: { root?: boolean }) {
  const id = useId();
  const insets = useSafeAreaInsets();
  const snapshot = useSyncExternalStore(layers.subscribe, layers.getSnapshot, layers.getSnapshot);
  useLayoutEffect(() => layers.register(id, root), [id, root]);
  if (snapshot.host !== id) return null;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {[...snapshot.entries].map(([key, content]) => <Fragment key={key}>{content}</Fragment>)}
      <Toast config={toastConfig} visibilityTime={3000} topOffset={Math.max(56, insets.top + 12)} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, zIndex: ALERT_Z_INDEX, elevation: 1000 },
});
