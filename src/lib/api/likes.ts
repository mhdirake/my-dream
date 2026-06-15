import { api } from './client';

const MEDIA_BASE = process.env.EXPO_PUBLIC_MEDIA_URL ?? process.env.EXPO_PUBLIC_API_URL ?? '';

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${MEDIA_BASE}/${path}`;
}

export type AnonInterestTarget = {
  id: number;
  username: string;
  first_name: string;
  last_name: string | null;
  profile_photo: string | null;
};

export type SentAnonInterest = {
  id: number;
  target: AnonInterestTarget;
  status: 'active' | 'removed';
  sent_at: string;
  removed_at: string | null;
  is_mutual: boolean;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export const likesApi = {
  listSentAnonInterests: async (
    token: string,
    status: 'active' | 'removed' | 'all' = 'active',
  ): Promise<PaginatedResponse<SentAnonInterest>> => {
    return api.get(`/api/client/anonymous-interests/sent?status=${status}`, token);
  },
};
