import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileApi } from './profile';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./client', () => ({ api: mocks }));
vi.mock('expo-file-system', () => ({ File: class {}, UploadType: { MULTIPART: 'multipart' } }));
beforeEach(() => { vi.clearAllMocks(); });

const compatibility = {
  status: 'ready', tier: 'gold', score_type: 'advanced', score: 88,
  viewer_id: 1, candidate_id: 21, day: '2026-10-22', snapshot_id: 'snapshot-21',
  algorithm_version: 'md049-v2', goal_matrix_version: 'goals-v1',
  reason_codes: ['goal_compatible'], reason_text: 'هدف رابطه نزدیک است.', reason_details: ['شرایط اولیه نزدیک است.'],
};
const profile = { id: 21, compatibility_day: '2026-10-22', compatibility_tier: 'gold', compatibility_score: 99, compatibility };

describe('profile compatibility snapshot ownership', () => {
  it('uses only the existing authenticated profile endpoint and the same stored snapshot', async () => {
    mocks.get.mockResolvedValue({ data: profile });
    const result = await profileApi.getUserProfile('session', 21, 1);
    expect(mocks.get).toHaveBeenCalledWith('/api/client/users/21/profile', 'session');
    expect(result.compatibility?.snapshot_id).toBe('snapshot-21');
    expect(result.compatibility?.score).toBe(88);
    expect(result.compatibility_score).toBeNull();
  });
  it.each([null, undefined, { ...compatibility, status: 'unavailable', score: 99 }])('clears old scores when the fresh backend snapshot is %j', async value => {
    mocks.get.mockResolvedValue({ data: { ...profile, compatibility: value } });
    const result = await profileApi.getUserProfile('session', 21, 1);
    expect(result.compatibility_score).toBeNull();
    expect(result.compatibility?.score ?? null).toBeNull();
  });
  it.each([
    { ...compatibility, viewer_id: 2 }, { ...compatibility, candidate_id: 22 }, { ...compatibility, day: '2026-10-21' },
  ])('discards a mismatched snapshot %j', async value => {
    mocks.get.mockResolvedValue({ data: { ...profile, compatibility: value } });
    expect((await profileApi.getUserProfile('session', 21, 1)).compatibility).toBeNull();
  });
  it('rejects a response for a different candidate instead of showing it under the route ID', async () => {
    mocks.get.mockResolvedValue({ data: { ...profile, id: 22 } });
    await expect(profileApi.getUserProfile('session', 21, 1)).rejects.toThrow('پاسخ پروفایل معتبر نیست');
  });
  it('honors server-side effective-tier downgrade independently of legacy numeric fields', async () => {
    mocks.get.mockResolvedValue({ data: { ...profile, compatibility_tier: 'basic' } });
    const result = await profileApi.getUserProfile('session', 21, 1);
    expect(result.compatibility).toBeNull();
    expect(result.compatibility_score).toBeNull();
  });
});
