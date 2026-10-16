import { describe, expect, it } from 'vitest';
import { religiosityIndex, religiosityLabel, RELIGIOSITY_LEVELS } from './religiosity';

describe('editable religiosity', () => {
  it.each([1, 2, 3, 4, 5])('hydrates and labels stored level %s', level => {
    expect(religiosityIndex(String(level))).toBe(level - 1);
    expect(religiosityLabel(level)).toBe(RELIGIOSITY_LEVELS[level - 1]);
  });
  it.each([null, undefined, '', 0, 6, 'invalid', 2.5, true])('does not invent a choice for %s', value => {
    expect(religiosityIndex(value)).toBeNull();
  });
  it('exposes a missing value in the profile editor', () => {
    expect(religiosityLabel(null)).toBe('تعیین نشده');
  });
});
