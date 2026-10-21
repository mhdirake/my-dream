import { describe, expect, it, vi } from 'vitest';
import { ChatSendButton } from './ChatSendButton';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  StyleSheet: { flatten: (style: unknown) => style },
  TouchableOpacity: 'native-button',
}));

describe('web chat send activation', () => {
  it('preserves composer focus on pointer down and sends once on click', () => {
    const send = vi.fn();
    const preventDefault = vi.fn();
    const button = ChatSendButton({ children: null, style: {}, onPress: send, accessibilityLabel: 'ارسال پیام', preserveFocus: true });
    button.props.onPointerDown({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
    button.props.onClick();
    expect(send).toHaveBeenCalledOnce();
    expect(button.props.type).toBe('button');
  });
  it('supports keyboard click activation and ignores disabled activation', () => {
    const send = vi.fn();
    const button = ChatSendButton({ children: null, style: {}, onPress: send, accessibilityLabel: 'ارسال پیام' });
    button.props.onClick();
    expect(send).toHaveBeenCalledOnce();
    const disabled = ChatSendButton({ children: null, style: {}, onPress: send, accessibilityLabel: 'ارسال پیام', disabled: true });
    disabled.props.onClick();
    expect(send).toHaveBeenCalledOnce();
  });
});
