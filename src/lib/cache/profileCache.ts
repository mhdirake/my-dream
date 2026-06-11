import { DiscoverProfile } from '@/lib/api/discover';

const cache = new Map<number, DiscoverProfile>();

export const profileCache = {
  set: (p: DiscoverProfile) => cache.set(p.id, p),
  setMany: (profiles: DiscoverProfile[]) => profiles.forEach(p => cache.set(p.id, p)),
  get: (id: number) => cache.get(id),
};
