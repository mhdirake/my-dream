import { api } from './client';

export type Province = { id: number; name: string };
export type City = { id: number; name: string };
export type RelationshipGoal = { id: number; label: string };
export type LifestyleTag = { id: number; label: string; category?: string };
export type Language = { id: number; name: string };
export type ProfilePrompt = { id: number; question: string };

export type OnboardingStatus = {
  completed: boolean;
  next_step: string | null;
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
    const form = new FormData();
    form.append('image', { uri, name: 'photo.jpg', type: mimeType } as any);
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/client/onboarding/profile-photo`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data;
  },
};

export const locationsApi = {
  getProvinces: (token: string) =>
    api.get<Province[]>('/api/locations/provinces', token),

  getCities: (token: string, provinceId: number) =>
    api.get<City[]>(`/api/locations/provinces/${provinceId}/cities`, token),
};

export const lookupsApi = {
  getRelationshipGoals: (token: string) =>
    api.get<RelationshipGoal[]>('/api/lookups/relationship-goals', token),

  getLifestyleTags: (token: string) =>
    api.get<LifestyleTag[]>('/api/lookups/lifestyle-tags', token),

  getLanguages: (token: string) =>
    api.get<Language[]>('/api/lookups/languages', token),

  getProfilePrompts: (token: string) =>
    api.get<ProfilePrompt[]>('/api/lookups/profile-prompts', token),
};
