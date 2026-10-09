import { describe, expect, it } from 'vitest';
import { HeartbeatGate } from './heartbeatGate';

describe('presence heartbeat scheduling', () => {
  it('deduplicates foreground and timer calls without concurrent heartbeats', () => {
    const gate = new HeartbeatGate();
    expect(gate.begin(0)).toBe(true);
    expect(gate.begin(30_000)).toBe(false);
    gate.success(); gate.finish();
    expect(gate.begin(20_000)).toBe(false);
    expect(gate.begin(30_000)).toBe(true);
  });
  it('respects Retry-After on 429', () => {
    const gate = new HeartbeatGate();
    gate.begin(0); gate.failure(429, 90, 0); gate.finish();
    expect(gate.begin(30_000)).toBe(false);
    expect(gate.begin(89_000)).toBe(false);
    expect(gate.begin(90_000)).toBe(true);
  });
  it('backs off service failures and resets after recovery', () => {
    const gate = new HeartbeatGate();
    gate.begin(0); gate.failure(503, 0, 0); gate.finish();
    gate.begin(30_000); gate.failure(503, 0, 30_000); gate.finish();
    expect(gate.begin(60_000)).toBe(false);
    expect(gate.begin(90_000)).toBe(true);
    gate.success(); gate.finish();
    gate.begin(120_000); gate.failure(503, 0, 120_000); gate.finish();
    expect(gate.begin(150_000)).toBe(true);
  });
  it('stops retrying invalid credentials until the token effect creates a new gate', () => {
    const gate = new HeartbeatGate();
    gate.begin(0); gate.failure(401, 0, 0); gate.finish();
    expect(gate.begin(999999)).toBe(false);
    expect(new HeartbeatGate().begin(999999)).toBe(true);
  });
});
