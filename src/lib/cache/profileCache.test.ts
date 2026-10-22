import { describe, expect, it } from 'vitest';
import { profileCache } from './profileCache';
import type { DiscoverProfile } from '../api/discover';

describe('shared public profile cache', () => {
  it('never caches viewer/day-owned compatibility scores through set, setMany or patch', () => {
    const profile = { id: 991, first_name: 'نام عمومی', compatibility_score: 90, reason_text: 'توضیح مقایسه متعلق به بیننده',
      compatibility: { status: 'ready', viewer_id: 1, candidate_id: 991, score: 90 } } as unknown as DiscoverProfile;
    profileCache.set(profile);
    expect(profileCache.get(991)?.compatibility).toBeNull();
    expect(profileCache.get(991)?.compatibility_score).toBeNull();
    expect(profileCache.get(991)).not.toHaveProperty('reason_text');
    profileCache.setMany([profile]);
    profileCache.patch(991, { compatibility: profile.compatibility, compatibility_score: 100 });
    expect(profileCache.get(991)?.compatibility).toBeNull();
    expect(profileCache.get(991)?.compatibility_score).toBeNull();
    expect(profileCache.get(991)?.first_name).toBe('نام عمومی');
  });
});
