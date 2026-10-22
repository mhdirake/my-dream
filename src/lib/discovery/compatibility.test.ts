import { describe, expect, it } from 'vitest';
import {
  normalizeCompatibility, compatibilityPresentation, compatibilityScore, COMPATIBILITY_DISCLAIMER,
} from './compatibility';

const context = { viewerId: 1, candidateId: 21, day: '2026-10-22', tier: 'silver' };
const ready = {
  status: 'ready', tier: 'silver', score_type: 'lifestyle', score: 80,
  viewer_id: 1, candidate_id: 21, day: context.day, snapshot_id: 'snapshot-1',
  algorithm_version: 'md049-v2', goal_matrix_version: 'goals-v1',
  reason_codes: ['goal_compatible'], reason_text: 'هدف رابطه نزدیک است.', reason_details: ['شرایط اولیه سازگار است.'],
};

describe('versioned server compatibility contract', () => {
  it.each([0, 1, 80, 100])('accepts the authoritative integer %s including genuine zero', score => {
    const snapshot = normalizeCompatibility({ ...ready, score }, context);
    expect(compatibilityScore(snapshot)).toBe(score);
    expect(compatibilityPresentation(snapshot).score).toBe(score);
  });
  it.each([null, undefined, NaN, Infinity, -1, 101, 80.5, '80'])('never calculates/clamps a bad score %s', score => {
    expect(normalizeCompatibility({ ...ready, score }, context)).toBeNull();
  });
  it.each(['processing', 'insufficient_data', 'unavailable'] as const)('does not reveal a carried-over number for %s', status => {
    const snapshot = normalizeCompatibility({ ...ready, status, score: 99 }, context);
    expect(snapshot?.score).toBeNull();
    expect(compatibilityPresentation(snapshot).score).toBeNull();
  });
  it('Basic retains only public textual reasons and has no score property even in an old/leaky payload', () => {
    const snapshot = normalizeCompatibility({ ...ready, status: 'text_only', tier: 'basic', score_type: 'basic',
      score: 99, percentage: 99, explanation: { score: 99, religion: 4 }, factor_values: { personality: 'private' },
      reason_details: [...ready.reason_details, 99, { score: 99, religion: 'private' }, null] },
    { ...context, tier: 'basic' });
    expect(snapshot?.reason_text).toBe(ready.reason_text);
    expect(snapshot).not.toHaveProperty('score');
    expect(snapshot).not.toHaveProperty('percentage');
    expect(snapshot).not.toHaveProperty('explanation');
    expect(snapshot).not.toHaveProperty('factor_values');
    expect(snapshot?.reason_details).toEqual(ready.reason_details);
    expect(compatibilityPresentation(snapshot).score).toBeNull();
  });
  it.each([
    { viewer_id: 2 }, { candidate_id: 22 }, { day: '2026-10-21' }, { tier: 'gold' },
    { algorithm_version: '' }, { goal_matrix_version: '' }, { snapshot_id: null },
    { status: 'text_only' }, { status: 'surprise' }, { score_type: 'advanced' },
  ])('rejects invalid, unversioned, stale or unowned snapshots %j', patch => {
    expect(normalizeCompatibility({ ...ready, ...patch }, context)).toBeNull();
  });
  it('requires authenticated viewer and authoritative server day, never the device clock', () => {
    expect(normalizeCompatibility(ready, { candidateId: 21, day: context.day })).toBeNull();
    expect(normalizeCompatibility(ready, { viewerId: 1, candidateId: 21 })).toBeNull();
    expect(normalizeCompatibility(ready, { ...context, tier: 'basic' })).toBeNull();
    expect(normalizeCompatibility({ ...ready, day: '2026-02-30' }, { ...context, day: '2026-02-30' })).toBeNull();
  });
  it('does not reinterpret legacy standalone or nested percentages as a snapshot', () => {
    expect(normalizeCompatibility({ score: 90, percentage: 90, explanation: { score: 90 } }, context)).toBeNull();
    expect(normalizeCompatibility(null, context)).toBeNull();
  });
  it('uses explicit insufficient-data text, never zero, and includes an estimated-outcome disclaimer', () => {
    const snapshot = normalizeCompatibility({ ...ready, status: 'insufficient_data', score: null }, context);
    expect(compatibilityPresentation(snapshot).title).toContain('اطلاعات کافی');
    expect(compatibilityPresentation(snapshot).score).toBeNull();
    expect(COMPATIBILITY_DISCLAIMER).toContain('تضمین');
  });
});
