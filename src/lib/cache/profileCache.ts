import { DiscoverProfile } from '@/lib/api/discover';

const cache = new Map<number, DiscoverProfile>();
// This shared display cache is not viewer/day scoped. Keep only public profile
// data here; compatibility is always loaded from the authenticated current API.
const publicProfile = (profile: DiscoverProfile): DiscoverProfile => {
  const copy: DiscoverProfile & { reason_text?: string } = {
    ...profile, compatibility: null, compatibility_score: null,
    bio: null, city: null, province: null, lifestyle_tags: [],
  };
  delete copy.reason_text;
  return copy;
};

export const profileCache = {
  set: (p: DiscoverProfile) => cache.set(p.id, publicProfile(p)),
  setMany: (profiles: DiscoverProfile[]) => profiles.forEach(p => cache.set(p.id, publicProfile(p))),
  get: (id: number) => cache.get(id),
  patch: (id: number, patch: Partial<DiscoverProfile>) => {
    const profile = cache.get(id);
    if (profile) cache.set(id, publicProfile({ ...profile, ...patch }));
  },
};
