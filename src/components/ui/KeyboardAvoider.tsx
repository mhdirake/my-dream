import { StyleSheet, View } from 'react-native';

export function KeyboardAvoider({ children }: { children: React.ReactNode }) {
  // KeyboardViewport at the application root owns avoidance. This wrapper is
  // retained so form screens keep a single flex layout without double padding.
  return <View style={styles.flex}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
