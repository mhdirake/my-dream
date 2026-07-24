import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export function KeyboardStickyBar({
  style,
  bottomOffset = 0,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  bottomOffset?: number;
  children: ReactNode;
}) {
  // The root viewport shrinks above the keyboard, so adding the keyboard
  // height here would move fixed actions twice.
  return <View style={[style, { bottom: bottomOffset }]}>{children}</View>;
}
