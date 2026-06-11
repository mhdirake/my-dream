import { File as FSFile, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';
import { api } from './client';

// Laravel wraps list responses in { data: [...] } — handle both formats
function unwrap<T>(res: T[] | { data: T[] }): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
}

export type Province = { id: number; name: string };
export type City = { id: number; name: string };
export type RelationshipGoal = { id: number; label: string };
export type LifestyleTag = { id: number; label: string; category?: string };
export type Language = { id: number; name: string };
export type ProfilePrompt = { id: number; question: string };

export type ProfilePhotoUrls = {
  original: string;
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
};

export type CompletionBreakdownItem = {
  key: string;
  label: string;
  weight: number;
  completed: boolean;
  current_value?: string | number | { count: number; primary_count: number };
};

export type OnboardingUser = {
  id: number;
  keycloak_id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  mobile_verified_at: string | null;
  status: string;
  bio: string | null;
  gender: string | null;
  birth_date: string | null;
  province: string | null;
  province_id: number | null;
  city: string | null;
  city_id: number | null;
  height_cm: number | null;
  job: string | null;
  education: string | null;
  religiosity_level: string | null;
  relationship_goal_id: number | null;
  profile_photo_path: string | null;
  profile_photo_status: string | null;
  profile_completion_percent: number;
  profile_quality_score: number;
  valid_reports_count: number;
  safe_mode_enabled: boolean;
  is_banned: boolean;
  restricted_until: string | null;
  is_restricted: boolean;
  restriction_badge: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  profile_photo: { urls: ProfilePhotoUrls } | null;
  lifestyle_tags: LifestyleTag[];
  languages: Language[];
  dealbreakers: any[];
  latest_personality_test: any | null;
};

export type OnboardingStatus = {
  completion_percent: number;
  completion_status: 'incomplete' | 'complete';
  can_enter_app: boolean;
  next_required_step: string | null;
  profile_photo_status: string | null;
  completion_breakdown: CompletionBreakdownItem[];
  missing_completion_items: CompletionBreakdownItem[];
  flags: {
    must_complete_required_profile: boolean;
    must_upload_profile_photo: boolean;
    must_wait_profile_photo_review: boolean;
    must_replace_profile_photo: boolean;
    force_required_profile_screen: boolean;
    force_profile_photo_screen: boolean;
  };
  steps: {
    required_profile: { completed: boolean; required_fields: string[]; missing_fields: string[] };
    profile_photo: { completed: boolean; uploaded: boolean; status: string; required_fields: string[]; missing_fields: string[] };
  };
  user: OnboardingUser;
};

export const onboardingApi = {
  getStatus: async (token: string) => {
    const res = await api.get<{ data: OnboardingStatus }>('/api/client/onboarding', token);
    return res.data;
  },

  saveRequiredProfile: (
    token: string,
    data: {
      first_name: string;
      birth_date: string;
      gender: string;
      province_id: number;
      city_id: number;
    },
  ) => api.patch('/api/client/onboarding/required-profile', data, token),

  uploadPhoto: async (token: string, uri: string, mimeType = 'image/jpeg') => {
    const url = `${process.env.EXPO_PUBLIC_API_URL}/api/client/onboarding/profile-photo`;

    if (Platform.OS !== 'web') {
      const file = new FSFile(uri);
      const result = await file.upload(url, {
        uploadType: UploadType.MULTIPART,
        fieldName: 'image',
        mimeType,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = JSON.parse(result.body || '{}');
      if (result.status < 200 || result.status >= 300)
        throw new Error(data?.message ?? `HTTP ${result.status}`);
      return data;
    }

    let blob: Blob;
    if (uri.startsWith('data:')) {
      // data URI → Blob (برخی browserها fetch از data: پشتیبانی نمیکنن)
      const [header, b64] = uri.split(',');
      const mime = header.match(/:(.*?);/)?.[1] ?? mimeType;
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      blob = new Blob([arr], { type: mime });
    } else {
      blob = await fetch(uri).then(r => r.blob());
    }
    const file = new File([blob], 'photo.jpg', { type: blob.type || mimeType });
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data;
  },
};

export const locationsApi = {
  getProvinces: async (token: string) =>
    unwrap(await api.get<Province[] | { data: Province[] }>('/api/locations/provinces', token)),

  getCities: async (token: string, provinceId: number) =>
    unwrap(await api.get<City[] | { data: City[] }>(`/api/locations/provinces/${provinceId}/cities`, token)),
};

export const lookupsApi = {
  getRelationshipGoals: async (token: string) =>
    unwrap(await api.get<RelationshipGoal[] | { data: RelationshipGoal[] }>('/api/lookups/relationship-goals', token)),

  getLifestyleTags: async (token: string) =>
    unwrap(await api.get<LifestyleTag[] | { data: LifestyleTag[] }>('/api/lookups/lifestyle-tags', token)),

  getLanguages: async (token: string) =>
    unwrap(await api.get<Language[] | { data: Language[] }>('/api/lookups/languages', token)),

  getProfilePrompts: async (token: string) =>
    unwrap(await api.get<ProfilePrompt[] | { data: ProfilePrompt[] }>('/api/lookups/profile-prompts', token)),
};
