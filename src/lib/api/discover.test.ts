import { beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverApi, type DailySuggestionProfile } from './discover';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./client', () => ({ api: mocks }));

beforeEach(() => { vi.clearAllMocks(); });

describe('MD-050 filter request isolation', () => {
  it('sends selected fields only to Swipe and never to Daily Suggestions or account settings', async () => {
    mocks.get.mockResolvedValue({ data: [], meta: { tier: 'silver' } });
    await discoverApi.getProfiles('session', 15, false, { min_age: 25, max_age: 32, genders: ['female'], province_id: 1, city_id: 2 });
    const params = new URLSearchParams(mocks.get.mock.calls[0][0].split('?')[1]);
    expect(params.get('min_age')).toBe('25');
    expect(params.get('max_age')).toBe('32');
    expect(params.getAll('genders[]')).toEqual(['female']);
    expect(params.get('province_id')).toBe('1');
    expect(params.get('city_id')).toBe('2');
    await discoverApi.getDailySuggestions('session', 1, 'silver');
    expect(mocks.get).toHaveBeenLastCalledWith('/api/client/discovery/daily-suggestions', 'session');
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('reset or Basic requests send no additional filter query', async () => {
    mocks.get.mockResolvedValue({ data: [], meta: { tier: 'basic' } });
    await discoverApi.getProfiles('session', 15);
    expect(mocks.get).toHaveBeenCalledWith('/api/client/discovery/swipe-pool?limit=15', 'session');
  });
});

const profile = {
  id: 21, compatibility_score: 91, reason_text: 'هدف رابطه شما نزدیک است.',
  compatibility: { percentage: 95, score: 94, labels: ['هدف رابطه'],
    explanation: { summary: 'هدف رابطه شما نزدیک است.', score: 94, shared_lifestyle_tags: 3 } },
} as unknown as DailySuggestionProfile;

describe('daily suggestions API', () => {
  it.each(['basic', 'Basic', 'unknown', ''])('keeps %s compatibility textual, including an old server response', async plan => {
    mocks.get.mockResolvedValue({ data: [profile], meta: { plan, daily_limit: 3 } });
    const result = await discoverApi.getDailySuggestions('session');
    expect(mocks.get).toHaveBeenCalledWith('/api/client/discovery/daily-suggestions', 'session');
    expect(mocks.post).not.toHaveBeenCalled();
    expect(result.data[0].compatibility_score).toBeNull();
    expect(result.data[0].compatibility).toBeNull();
    expect(result.data[0].reason_text).toBe('هدف رابطه شما نزدیک است.');
  });

  it('uses the current tier after a downgrade and retains authoritative server day/status', async () => {
    mocks.get.mockResolvedValue({ data: [profile], meta: { plan: 'gold', tier: 'basic', day: '2026-10-22', status: 'ready', limit: 3, count: 1 } });
    const result = await discoverApi.getDailySuggestions('session');
    expect(result.meta.day).toBe('2026-10-22');
    expect(result.meta.status).toBe('ready');
    expect(result.meta.count).toBe(1);
    expect(result.data[0].compatibility_score).toBeNull();
  });

  it('does not invent paid scores when the backend model supplies none', async () => {
    mocks.get.mockResolvedValue({ data: [{ id: 2, compatibility_score: null }], meta: { plan: 'gold' } });
    expect((await discoverApi.getDailySuggestions('session')).data[0].compatibility_score).toBeNull();
  });

  it('preserves permitted paid model scores when explicitly supplied', async () => {
    const compatibility = { status: 'ready', tier: 'silver', score_type: 'lifestyle', score: 0,
      reason_text: 'شرایط اولیه', reason_codes: [], reason_details: [], snapshot_id: 'snapshot-1',
      viewer_id: 1, candidate_id: 21, day: '2026-10-22', algorithm_version: 'md049-v2', goal_matrix_version: 'goals-v1' };
    mocks.get.mockResolvedValue({ data: [{ ...profile, compatibility }], meta: { tier: 'silver', day: '2026-10-22' } });
    expect((await discoverApi.getDailySuggestions('session', 1)).data[0].compatibility_score).toBe(0);
  });

  it('discards a snapshot belonging to another viewer or another day', async () => {
    const compatibility = { status: 'ready', tier: 'silver', score_type: 'lifestyle', score: 94,
      viewer_id: 2, candidate_id: 21, day: '2026-10-21', snapshot_id: 'old',
      algorithm_version: 'md049-v2', goal_matrix_version: 'goals-v1' };
    mocks.get.mockResolvedValue({ data: [{ ...profile, compatibility }], meta: { tier: 'silver', day: '2026-10-22' } });
    expect((await discoverApi.getDailySuggestions('session', 1)).data[0].compatibility).toBeNull();
  });

  it('clamps a cached higher-tier result to the known downgraded quota without granting a client-side upgrade', async () => {
    mocks.get.mockResolvedValue({ data: Array.from({ length: 10 }, (_, id) => ({ ...profile, id })),
      meta: { tier: 'gold', plan: 'gold', day: '2026-10-22', daily_limit: 10 } });
    const downgraded = await discoverApi.getDailySuggestions('session', 1, 'basic');
    expect(downgraded.data).toHaveLength(3);
    expect(downgraded.meta.tier).toBe('basic');
    expect(downgraded.meta.daily_limit).toBe(3);
    expect(downgraded.data[0].reason_text).toBe('پروفایل پیشنهادی برای آشنایی');
    mocks.get.mockResolvedValue({ data: [profile], meta: { tier: 'basic' } });
    expect((await discoverApi.getDailySuggestions('session', 1, 'gold')).meta.tier).toBe('basic');
  });

  it('sends an explicit reject, not a swipe or a profile-view interaction', async () => {
    mocks.post.mockResolvedValue({ data: { type: 'reject' } });
    await discoverApi.interact('session', 21, 'reject');
    expect(mocks.post).toHaveBeenCalledWith('/api/client/users/21/interactions', { type: 'reject', metadata: {} }, 'session');
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('records a profile view without sending any like/reject/swipe', async () => {
    await discoverApi.recordProfileView('session', 21);
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('/api/client/users/21/profile-view', {}, 'session');
  });
});
