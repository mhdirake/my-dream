import { identityDisplayName } from './profileIdentity';
import { describe, expect, it } from 'vitest';
import { IdentityHydration, identityBirthDate, normalizeDateDigits } from './profileIdentity';

describe('editable profile identity', () => {
  it('does not hydrate over a draft after the same account rotates its token', () => {
    const hydration = new IdentityHydration();
    const scope = '5:edit:0';
    expect(hydration.needsLoad(scope)).toBe(true);
    hydration.complete(scope);
    expect(hydration.needsLoad(scope)).toBe(false);
  });

  it('reloads for a different account, mode, or explicit retry', () => {
    const hydration = new IdentityHydration();
    for (const scope of ['5:edit:0', '6:edit:0', '6:setup:0', '6:setup:1']) {
      expect(hydration.needsLoad(scope)).toBe(true);
      hydration.complete(scope);
      expect(hydration.needsLoad(scope)).toBe(false);
    }
  });

  it('can retry an interrupted load and ignores completion from another account', () => {
    const hydration = new IdentityHydration();
    expect(hydration.needsLoad('5:edit:0')).toBe(true);
    expect(hydration.needsLoad('5:edit:0')).toBe(true);
    expect(hydration.needsLoad('6:edit:0')).toBe(true);
    hydration.complete('5:edit:0');
    expect(hydration.needsLoad('6:edit:0')).toBe(true);
    hydration.complete('6:edit:0');
    expect(hydration.needsLoad('5:edit:0')).toBe(true);
  });
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

it('preserves the full legacy name and does not repeat a cleared family name', () => {
  expect(identityDisplayName('مهدی', 'رشید')).toBe('مهدی رشید');
  expect(identityDisplayName('مهدی رشید', null)).toBe('مهدی رشید');
});
