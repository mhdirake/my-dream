import Toast from 'react-native-toast-message';

export const toast = {
  success: (text: string, sub?: string) =>
    Toast.show({ type: 'success', text1: text, text2: sub, position: 'top' }),

  error: (text: string, sub?: string) =>
    Toast.show({ type: 'error', text1: text, text2: sub, position: 'top' }),

  info: (text: string, sub?: string) =>
    Toast.show({ type: 'info', text1: text, text2: sub, position: 'top' }),
};
