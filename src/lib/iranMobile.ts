import { toEnDigits } from './toEnDigits';

/** National input only; also accept full numbers pasted from contacts. */
export function normalizeIranMobileInput(value: string): string {
  let digits = toEnDigits(value).replace(/\D/g, '');
  if (digits.startsWith('0098')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('98') && (digits.length >= 12 || /^\s*\+/.test(value))) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/** Authentication expects the local, eleven-digit format. */
export function loginMobileNumber(nationalNumber: string): string | null {
  return /^9\d{9}$/.test(nationalNumber) ? `0${nationalNumber}` : null;
}
