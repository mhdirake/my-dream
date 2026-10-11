import { describe, expect, it } from 'vitest';
import { identityBirthDate, normalizeDateDigits } from './profileIdentity';

describe('editable profile identity', () => {
  it('normalizes mobile Persian and Arabic keyboards', () => {
    expect(normalizeDateDigits('۱۳۷۷/٠٦-15')).toBe('13770615');
  });
  it('converts a valid adult birthdate', () => {
    expect(identityBirthDate('1377', '6', '15', new Date(2026, 9, 12))).toBe('1998-09-06');
  });
  it.each([['1400', '1', '1'], ['1377', '13', '1'], ['1377', '7', '31'], ['1377', '', '15'], ['9999', '1', '1']])(
    'rejects underage or invalid dates %s/%s/%s', (year, month, day) => {
      expect(identityBirthDate(year, month, day, new Date(2026, 9, 12))).toBeNull();
    },
  );
});
