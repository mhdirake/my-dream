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

export type OnboardingUser = {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  bio: string | null;
  gender: string | null;
  birth_date: string | null;
  province: string | null;
  city: string | null;
  height_cm: number | null;
  job: string | null;
  education: string | null;
  relationship_goal_id: number | null;
  profile_completion_percent: number;
  profile_photo_status: string | null;
  profile_photo: { urls: ProfilePhotoUrls } | null;
  safe_mode_enabled: boolean;
};

export type OnboardingStatus = {
  completion_percent: number;
  can_enter_app: boolean;
  next_required_step: string | null;
  profile_photo_status: string | null;
  flags: {
    must_complete_required_profile: boolean;
    must_upload_profile_photo: boolean;
    must_wait_profile_photo_review: boolean;
    must_replace_profile_photo: boolean;
    force_required_profile_screen: boolean;
    force_profile_photo_screen: boolean;
  };
  steps: {
    required_profile: { completed: boolean; missing_fields: string[] };
    profile_photo: { completed: boolean; uploaded: boolean; status: string };
  };
  user: OnboardingUser;
};

export const onboardingApi = {
  getStatus: (token: string) =>
    api.get<OnboardingStatus>('/api/client/onboarding', token),

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

    const blob = await fetch(uri).then(r => r.blob());
    const form = new FormData();
    form.append('image', blob, 'photo.jpg');
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
