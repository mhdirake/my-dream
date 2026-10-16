import { describe, expect, it } from 'vitest';
import { loginMobileNumber, normalizeIranMobileInput } from './iranMobile';

describe('Iran mobile login input', () => {
  it.each([
    '9123456789', '09123456789', '+98 912 345 6789', '00989123456789',
    '989123456789', '۰۹۱۲۳۴۵۶۷۸۹', '٠٩١٢٣٤٥٦٧٨٩', '+۹۸ (۹۱۲) ۳۴۵-۶۷۸۹',
  ])('accepts %s without losing the final digit', input => {
    const national = normalizeIranMobileInput(input);
    expect(national).toBe('9123456789');
    expect(loginMobileNumber(national)).toBe('09123456789');
  });

  it('keeps partial input editable and limited to ten digits', () => {
    expect(normalizeIranMobileInput('')).toBe('');
    expect(normalizeIranMobileInput('0')).toBe('');
    expect(normalizeIranMobileInput('۹۱۲')).toBe('912');
    expect(normalizeIranMobileInput('91234567890')).toBe('9123456789');
  });

  it('preserves national numbers starting with 98 while typing', () => {
    expect(normalizeIranMobileInput('98')).toBe('98');
    expect(normalizeIranMobileInput('9891234567')).toBe('9891234567');
    expect(normalizeIranMobileInput('98912345678')).toBe('9891234567');
    expect(loginMobileNumber(normalizeIranMobileInput('9891234567'))).toBe('09891234567');
  });

  it.each(['', '912', '8123456789', '09123456789', '91234567890', '912345678a'])(
    'does not submit invalid national input: %s', input => {
      expect(loginMobileNumber(input)).toBeNull();
    },
  );
});
