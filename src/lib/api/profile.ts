import { api } from './client';

export type ProfilePhotoVariants = {
  original: string;
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
};

// Full profile of another user — returned by GET /api/client/users/{id}/profile
// Note: the endpoint records the profile view automatically, so no separate call needed.
export type UserProfile = {
  id: number;
  username: string;
  first_name: string;
  last_name: string | null;
  birth_date: string;
  gender: string | null;
  province: string | null;
  city: string | null;
  bio: string | null;
  height_cm: number | null;
  job: string | null;
  education: string | null;
  religiosity_level: number | null;
  is_verified?: boolean;
  profile_photo: { urls: ProfilePhotoVariants } | null;
  relationship_goal: { id: number; title: string; slug: string } | null;
  lifestyle_tags: { id: number; title: string; slug: string }[];
  languages: { id: number; title: string; slug: string; pivot?: { is_primary: number } }[];
  dealbreakers: { id: number; body: string; moderation_status: string }[];
  badges: { id: number; title: string; slug: string; is_active?: boolean }[];
  prompt_answers?: { id: number; answer: string; prompt: { id: number; text: string } }[];
  latest_personality_test?: { result_key: string; result_title: string; completed_at: string } | null;
  // Preserved from cache when available — not in API response
  compatibility_score?: number | null;
};

export type ClientProfile = {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  email: string | null;
  gender: string | null;
  birth_date: string | null;
  province: string | null;
  city: string | null;
  bio: string | null;
  height_cm: number | null;
  job: string | null;
  education: string | null;
  religiosity_level: number | null;
  safe_mode_enabled: boolean;
  profile_completion_percent: number;
  profile_photo_status: string | null;
  profile_photo: { urls: ProfilePhotoVariants } | null;
  relationship_goal: { id: number; title: string; slug: string } | null;
  lifestyle_tags: { id: number; title: string; slug: string; category_id?: number }[];
  languages: { id: number; title: string; slug: string; pivot?: { is_primary: number | boolean } }[];
  dealbreakers: { id: number; body: string; moderation_status: string }[];
  badges: { id: number; title?: string; label?: string; slug?: string; icon?: string }[];
  active_subscription: { plan: { id: number; name: string; slug: string }; expires_at: string } | null;
  coins?: number;
  prompt_answers?: { id: number; answer: string; prompt: { id: number; text: string; body?: string } }[];
  is_restricted?: boolean;
  is_banned?: boolean;
  restricted_until?: string | null;
  restriction_badge?: string | null;
  status?: string;
};

export const profileApi = {
  getProfile: (token: string) =>
    api.get<{ data: ClientProfile }>('/api/client/profile', token).then(r => r.data),

  getUserProfile: (token: string, userId: number) =>
    api.get<{ data: UserProfile }>(`/api/client/users/${userId}/profile`, token).then(r => r.data),

  updateProfile: (
    token: string,
    data: {
      bio?: string;
      height_cm?: number;
      job?: string;
      education?: string;
      religiosity_level?: number;
      safe_mode_enabled?: boolean;
      relationship_goal_id?: number;
      lifestyle_tag_ids?: number[];
      languages?: { id: number; is_primary: boolean }[];
      dealbreakers?: string[];
    }
  ) =>
    api.patch<ClientProfile>('/api/client/profile', data, token),
};
