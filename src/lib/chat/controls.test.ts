import { describe, expect, it } from 'vitest';
import { CHAT_SEND_HIT_SLOP, CHAT_SEND_TARGET } from './controls';

describe('chat composer touch targets', () => {
  it('provides an Android-sized layout target even when hitSlop is clipped', () => {
    expect(CHAT_SEND_TARGET).toBeGreaterThanOrEqual(48);
  });

  it('keeps horizontal hitSlop inside half the eight-point composer gap', () => {
    expect(CHAT_SEND_HIT_SLOP.left).toBeLessThanOrEqual(4);
    expect(CHAT_SEND_HIT_SLOP.right).toBeLessThanOrEqual(4);
    expect(CHAT_SEND_TARGET + CHAT_SEND_HIT_SLOP.top + CHAT_SEND_HIT_SLOP.bottom).toBe(64);
  });
});
