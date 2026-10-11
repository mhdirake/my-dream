import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppMaxWidth } from '@/constants/colors';

const FrameWidth = createContext<number | null>(null);

/** Measure the actual app column rather than a browser window/startup snapshot. */
export function AppFrame({ children }: PropsWithChildren) {
  const [width, setWidth] = useState<number | null>(null);
  return (
    <View style={styles.frame} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <FrameWidth.Provider value={width}>{children}</FrameWidth.Provider>
    </View>
  );
}

export function useAppWidth() {
  const measured = useContext(FrameWidth);
  const { width } = useWindowDimensions();
  return measured && measured > 0 ? measured : Math.min(width, AppMaxWidth);
}

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 0, width: '100%', maxWidth: AppMaxWidth, alignSelf: 'center' },
});
