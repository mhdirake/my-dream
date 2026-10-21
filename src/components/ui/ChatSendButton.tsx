import { createElement, type CSSProperties, type ReactNode } from 'react';
import { Platform, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { CHAT_SEND_HIT_SLOP } from '@/lib/chat/controls';

type Props = {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  preserveFocus?: boolean;
};

export function ChatSendButton({ children, style, onPress, disabled, accessibilityLabel, preserveFocus }: Props) {
  if (Platform.OS !== 'web') {
    return <TouchableOpacity style={style} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={CHAT_SEND_HIT_SLOP} activeOpacity={0.8}>{children}</TouchableOpacity>;
  }
  return createElement('button', {
    type: 'button',
    disabled,
    'aria-label': accessibilityLabel,
    onPointerDown: event => {
      // Keep the textarea focused before Safari can move the viewport between
      // pointer-down and click. The click remains the single send action.
      if (preserveFocus && !disabled) event.preventDefault();
    },
    onClick: () => { if (!disabled) onPress(); },
    style: {
      appearance: 'none', display: 'inline-flex', padding: 0, margin: 0,
      border: 0, borderStyle: 'solid', cursor: disabled ? 'default' : 'pointer',
      touchAction: 'manipulation',
      ...StyleSheet.flatten(style),
    } as CSSProperties,
  }, children);
}
