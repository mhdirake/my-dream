import { api } from './client';

export type ProfilePhotoVariants = {
  original: string;
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
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
  relationship_goal: { id: number; label: string } | null;
  lifestyle_tags: { id: number; label: string; category?: string }[];
  languages: { id: number; name: string; is_primary?: boolean }[];
  dealbreakers: string[];
  badges: { id: number; label: string; icon?: string }[];
  active_subscription: { plan: string; expires_at: string } | null;
  coins: number;
};

export const profileApi = {
  getProfile: (token: string) =>
    api.get<{ data: ClientProfile }>('/api/client/profile', token).then(r => r.data),

  updateProfile: (token: string, data: Partial<Pick<ClientProfile,
    'bio' | 'height_cm' | 'job' | 'education' | 'religiosity_level' | 'safe_mode_enabled'
  >>) =>
    api.patch<ClientProfile>('/api/client/profile', data, token),
};
