import Toast from 'react-native-toast-message';
import { localizeErrorMessage, toFaDigits } from './localization';

export const toast = {
  success: (text: string, sub?: string) =>
    Toast.show({ type: 'success', text1: toFaDigits(text), text2: sub ? toFaDigits(sub) : undefined, position: 'top' }),

  error: (text: string, sub?: string) =>
    Toast.show({ type: 'error', text1: localizeErrorMessage(text), text2: sub ? toFaDigits(sub) : undefined, position: 'top' }),

  info: (text: string, sub?: string) =>
    Toast.show({ type: 'info', text1: toFaDigits(text), text2: sub ? toFaDigits(sub) : undefined, position: 'top' }),
};
