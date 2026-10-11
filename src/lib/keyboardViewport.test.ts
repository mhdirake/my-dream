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

  it.each([0, -1, NaN, Infinity])('ignores transient viewport height %s', height => {
    expect(getKeyboardViewportMetrics(780, height)).toEqual({ height: 780, offsetTop: 0, keyboardInset: 0 });
  });

  it('clamps offsets/oversized viewports and keeps non-finite values out of CSS', () => {
    expect(getKeyboardViewportMetrics(800, 900, -40)).toEqual({ height: 800, offsetTop: 0, keyboardInset: 0 });
    expect(getKeyboardViewportMetrics(800, 500, 900)).toEqual({ height: 500, offsetTop: 300, keyboardInset: 0 });
    expect(getKeyboardViewportMetrics(800, 500, NaN).offsetTop).toBe(0);
    expect(getKeyboardViewportMetrics(NaN, NaN, NaN)).toEqual({ height: 1, offsetTop: 0, keyboardInset: 0 });
  });
});
