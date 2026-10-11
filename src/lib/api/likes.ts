import { api } from './client';
import { resolveMediaUrl } from './media';

type MediaLike =
  | string
  | null
  | undefined
  | {
      urls?: {
        thumbnail?: string | null;
        small?: string | null;
        medium?: string | null;
        large?: string | null;
        original?: string | null;
      } | null;
      url?: string | null;
      path?: string | null;
    };

export function mediaUrl(path: MediaLike): string | null {
  if (!path) return null;
  const resolved = typeof path === 'string'
    ? path
    : path.urls?.thumbnail
      ?? path.urls?.small
      ?? path.urls?.medium
      ?? path.urls?.large
      ?? path.urls?.original
      ?? path.url
      ?? path.path
      ?? null;
  if (!resolved) return null;
  return resolveMediaUrl(resolved);
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type AnonUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string | null;
  profile_photo: MediaLike;
};

export type SentAnonInterest = {
  id: number;
  target: AnonUser;
  status: 'active' | 'removed';
  sent_at: string;
  removed_at: string | null;
  is_mutual: boolean;
};

export type SentLike = {
  id: number;
  target: AnonUser & {
    province?: string | null;
    city?: string | null;
  };
  liked_at: string;
  is_mutual: boolean;
};

export type ReceivedAnonInterest = {
  id: number;
  sender: AnonUser;
  sent_at: string;
  is_mutual: boolean;
};

export type AnonSummary = {
  received_count: number;
  reveal_access_active: boolean;
  reveal_access_until: string | null;
  can_reveal: boolean;
};

export type ReceivedResponse =
  | { locked: true; received_count: number; reveal_access_active: false; items: [] }
  | {
      locked: false;
      received_count: number;
      reveal_access_active: true;
      reveal_access_until: string;
      items: ReceivedAnonInterest[];
    };

export type RevealPackage = {
  id: number;
  name: string;
  slug: string;
  coin_price: number;
  duration_days: number;
  description: string | null;
};

type Meta = { current_page: number; last_page: number; per_page: number; total: number };

// ── API ────────────────────────────────────────────────────────────────────────

export const likesApi = {
  summary: (token: string): Promise<{ data: AnonSummary }> =>
    api.get('/api/client/anonymous-interests/summary', token),

  received: (token: string, page = 1): Promise<{ data: ReceivedResponse; meta?: Meta }> =>
    api.get(`/api/client/anonymous-interests/received?page=${page}&per_page=20`, token),

  listSentAnonInterests: (
    token: string,
    status: 'active' | 'removed' | 'all' = 'active',
    page = 1,
  ): Promise<{ data: SentAnonInterest[]; meta: Meta }> =>
    api.get(`/api/client/anonymous-interests/sent?status=${status}&page=${page}&per_page=20`, token),

  listSentLikes: (token: string, page = 1): Promise<{ data: SentLike[]; meta: Meta }> =>
    api.get(`/api/client/likes/sent?page=${page}&per_page=20`, token),

  revealPackages: (token: string): Promise<{ data: RevealPackage[] }> =>
    api.get('/api/client/packages?feature=anonymous_interest_reveal', token),

  purchaseReveal: (
    token: string,
    packageId: number,
  ): Promise<{ data: { active_until: string; remaining_days: number; coin_balance: number } }> =>
    api.post('/api/client/anonymous-interests/reveal-access/purchase', { package_id: packageId }, token),
};
