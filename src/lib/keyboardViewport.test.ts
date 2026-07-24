import { describe, expect, it } from 'vitest';
import { getKeyboardViewportMetrics } from './keyboardViewport';

describe('getKeyboardViewportMetrics', () => {
  it('measures a mobile software keyboard from visualViewport', () => {
    expect(getKeyboardViewportMetrics(844, 524, 0)).toEqual({
      height: 524,
      offsetTop: 0,
      keyboardInset: 320,
    });
  });

  it('subtracts browser viewport panning from the keyboard inset', () => {
    expect(getKeyboardViewportMetrics(844, 524, 44)).toEqual({
      height: 524,
      offsetTop: 44,
      keyboardInset: 276,
    });
  });

  it('falls back to the window height when visualViewport is unavailable', () => {
    expect(getKeyboardViewportMetrics(780)).toEqual({
      height: 780,
      offsetTop: 0,
      keyboardInset: 0,
    });
  });
});
