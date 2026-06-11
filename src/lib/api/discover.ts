import { api } from './client';
import { ProfilePhotoUrls, LifestyleTag } from './onboarding';

export type DiscoverProfile = {
  id: number;
  username: string;
  first_name: string;
  birth_date: string;
  gender: string;
  city: string | null;
  province: string | null;
  bio: string | null;
  height_cm: number | null;
  relationship_goal: { id: number; label: string } | null;
  profile_photo: { urls: ProfilePhotoUrls } | null;
  lifestyle_tags: LifestyleTag[];
  compatibility_score: number | null;
  badges: { id: number; title: string; slug: string; is_active: boolean }[];
  is_verified: boolean;
};

export type InteractionType = 'like' | 'pass' | 'skip';

export type ProfileView = {
  id: number;
  viewer_user: {
    id: number;
    first_name: string;
    profile_photo: { urls: { medium: string; thumbnail: string } } | null;
  };
  viewed_at: string;
};

export type BackendGift = {
  id: number;
  title: string;
  slug: string;
  type: 'simple' | 'cool' | 'special' | 'legendary' | string;
  coin_price: number;
  asset_url: string | null;
  asset_type: string;
  inventory: number | null;
  is_limited: boolean;
};

export const discoverApi = {
  getProfiles: async (token: string, limit = 10, safeMode = false) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (safeMode) params.set('safe_mode', '1');
    const res = await api.get<{ data: DiscoverProfile[] }>(
      `/api/client/discover?${params}`,
      token,
    );
    return res.data ?? [];
  },

  interact: (token: string, userId: number, type: InteractionType) =>
    api.post(`/api/client/users/${userId}/interactions`, { type, metadata: {} }, token),

  sendGift: (token: string, userId: number, giftId: number, message?: string) =>
    api.post(`/api/client/users/${userId}/gifts`, { gift_id: giftId, message: message ?? '' }, token),

  recordProfileView: (token: string, userId: number) =>
    api.post(`/api/client/users/${userId}/profile-view`, {}, token),

  listGifts: async (token: string) => {
    const res = await api.get<{ data: BackendGift[] }>('/api/client/gifts', token);
    return res.data ?? [];
  },

  getProfileViews: async (token: string) => {
    const res = await api.get<{ data: ProfileView[] }>('/api/client/profile-views', token);
    return res.data ?? [];
  },
};
