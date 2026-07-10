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
  relationship_goal: { id: number; title: string; slug: string } | null;
  profile_photo: { urls: ProfilePhotoUrls } | null;
  lifestyle_tags: LifestyleTag[];
  compatibility_score: number | null;
  badges: { id: number; title: string; slug: string; is_active: boolean }[];
  is_verified: boolean;
  likes_count: number;
  liked_by_me: boolean;
};

export type InteractionType = 'like' | 'pass' | 'swipe_like' | 'swipe_pass' | 'anonymous_interest';

export type SwipePoolMeta = {
  daily_limit: number | null;
  used_today: number;
  remaining_today: number | null;
  available: boolean;
  unlocks_at: string | null;
};

export type MutualUser = {
  id: number;
  first_name: string;
  username: string;
  profile_photo?: { urls?: { medium?: string; thumbnail?: string } } | null;
};

export type InteractionResult = {
  type: string;
  action?: string;
  sent_by_me?: boolean;
  liked_by_me?: boolean;
  likes_count?: number;
  mutual?: boolean;
  mutual_user?: MutualUser | null;
  mutual_message?: string | null;
};

export type DailyCompatibility = {
  labels?: string[];
  percentage?: number;
  score?: number;
  explanation?: {
    summary?: string;
    score?: number;
    shared_lifestyle_tags?: number;
    shared_languages?: number;
  };
};

export type DailySuggestionProfile = DiscoverProfile & {
  compatibility?: DailyCompatibility;
};

export type DailySuggestionsMeta = {
  plan: string;
  daily_limit: number;
  generated_count: number;
  remaining_today: number;
};

export type ProfileView = {
  id: number;
  viewer_user: {
    id: number;
    first_name: string;
    profile_photo: { urls: { medium: string; thumbnail: string } } | null;
  };
  viewed_at: string;
};

export type ProfileViewSummary = {
  total_count: number;
  has_active_access: boolean;
  access_until: string | null;
  locked: boolean;
};

export type ProfileViewTimelineItem = {
  profile_view_id: number;
  viewer: {
    id: number;
    username: string;
    first_name: string;
    last_name: string | null;
    profile_photo?: { urls?: { medium?: string; thumbnail?: string } } | null;
  } | null;
  last_viewed_at: string | null;
  view_count: number;
  can_open_profile: boolean;
  display_state: 'normal' | 'deleted' | 'banned' | 'suspended' | 'blocked';
  display_name: string;
};

export type ViewPackage = {
  id: number;
  name: string;
  slug: string;
  feature: string;
  coin_price: number;
  duration_days: number | null;
  description: string | null;
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
    const res = await api.get<{ data: DiscoverProfile[]; meta: SwipePoolMeta }>(
      `/api/client/discovery/swipe-pool?${params}`,
      token,
    );
    return { data: res.data ?? [], meta: res.meta };
  },

  interact: (token: string, userId: number, type: InteractionType) =>
    api.post<{ data: InteractionResult }>(
      `/api/client/users/${userId}/interactions`,
      { type, metadata: {} },
      token,
    ),

  sendGift: (token: string, userId: number, giftId: number, message?: string) =>
    api.post(`/api/client/gifts/${giftId}/send`, { receiver_user_id: userId, note: message ?? null, show_in_chat: false }, token),

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

  getProfileViewSummary: async (token: string) => {
    const res = await api.get<ProfileViewSummary>('/api/client/profile-view-history/summary', token);
    return res;
  },

  getProfileViewTimeline: async (token: string, page = 1) => {
    const res = await api.get<{
      summary: ProfileViewSummary;
      data: { current_page: number; last_page: number; data: ProfileViewTimelineItem[] };
    }>(`/api/client/profile-view-history/timeline?page_number=${page}`, token);
    return res;
  },

  getViewPackages: async (token: string) => {
    const res = await api.get<{ data: ViewPackage[] }>(
      '/api/client/packages?feature=profile_view_history',
      token,
    );
    return res.data ?? [];
  },

  purchaseViewAccess: (token: string, packageId: number) =>
    api.post<{ access_until: string; coin_balance: number }>(
      '/api/client/profile-view-history/purchase',
      { package_id: packageId },
      token,
    ),

  getDailySuggestions: async (token: string) => {
    const res = await api.get<{ data: DailySuggestionProfile[]; meta: DailySuggestionsMeta }>(
      '/api/client/discovery/daily-suggestions',
      token,
    );
    const data = (res.data ?? []).map(p => ({
      ...p,
      compatibility_score: p.compatibility?.score ?? p.compatibility?.percentage ?? p.compatibility_score ?? null,
    }));
    return { data, meta: res.meta };
  },
};
