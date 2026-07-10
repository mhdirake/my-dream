import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';

export function KeyboardStickyBar({
  style,
  bottomOffset = 0,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  bottomOffset?: number;
  children: ReactNode;
}) {
  const keyboardHeight = useKeyboardHeight();
  return <View style={[style, { bottom: bottomOffset + keyboardHeight }]}>{children}</View>;
}
