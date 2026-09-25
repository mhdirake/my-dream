import { File as FSFile, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';
import { api } from './client';
import { apiUrl } from './url';

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
  prompt_answers?: { id: number; answer: string; moderation_status: string; prompt: { id: number; body: string } }[];
  prompt_answers_locked?: boolean;
  latest_personality_test?: {
    result_key: string;
    result_title: string;
    completed_at: string | null;
    scores?: unknown;
    assistant_analysis?: { summary?: string } | null;
    assistant_analysis_status?: string;
  } | null;
  personality_test_hidden?: boolean;
  voice_intro_url?: string | null;
  voice_intro_duration_seconds?: number | null;
  // Preserved from cache when available — not in API response
  compatibility_score?: number | null;
  liked_by_me?: boolean;
  likes_count?: number;
};

// One signal that feeds `profile_quality_score` (0..100). `max` values are fixed
// by the backend and sum to 100; rendered as the profile-score breakdown chart.
export type QualityBreakdownItem = { key: string; earned: number; max: number };

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
  active_subscription: {
    plan: { id: number; name: string; slug: string };
    starts_at: string;
    ends_at: string | null;
  } | null;
  ai_public_insight_visibility?: 'visible' | 'hidden';
  voice_intro_url?: string | null;
  voice_intro_duration_seconds?: number | null;
  prompt_answers?: { id: number; answer: string; prompt: { id: number; text: string; body?: string } }[];
  likes_count?: number;
  profile_views_count?: number;
  profile_quality_score?: number;
  quality_breakdown?: QualityBreakdownItem[];
  valid_reports_count?: number;
  is_restricted?: boolean;
  is_banned?: boolean;
  restricted_until?: string | null;
  restriction_badge?: string | null;
  status?: string;
};

export const profileApi = {
  getProfile: (token: string) =>
    api
      .get<{ data: ClientProfile; quality_breakdown?: QualityBreakdownItem[]; profile_views_count?: number }>(
        '/api/client/profile',
        token,
      )
      .then(r => ({
        ...r.data,
        quality_breakdown: r.quality_breakdown ?? r.data.quality_breakdown,
        profile_views_count: r.profile_views_count ?? r.data.profile_views_count,
      })),

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

  answerPrompts: (
    token: string,
    answers: { profile_prompt_id: number; answer: string }[],
  ) => api.post<{ data: ClientProfile }>('/api/client/profile/prompts', { answers }, token),

  uploadVoiceIntro: async (token: string, uri: string, durationSeconds: number, mimeType = 'audio/mp4') => {
    const url = apiUrl('/api/client/profile/voice-intro');
    const parameters = { duration_seconds: String(durationSeconds) };

    if (Platform.OS !== 'web') {
      const file = new FSFile(uri);
      const result = await file.upload(url, {
        uploadType: UploadType.MULTIPART,
        fieldName: 'voice',
        mimeType,
        headers: { Authorization: `Bearer ${token}` },
        parameters,
      });
      const data = JSON.parse(result.body || '{}');
      if (result.status < 200 || result.status >= 300)
        throw new Error(data?.message ?? `HTTP ${result.status}`);
      return data;
    }

    const blob = await fetch(uri).then(r => r.blob());
    const file = new File([blob], 'voice-intro.m4a', { type: blob.type || mimeType });
    const form = new FormData();
    form.append('voice', file);
    form.append('duration_seconds', String(durationSeconds));
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data;
  },

  changePassword: (
    token: string,
    data: { current_password: string; password: string; password_confirmation: string },
  ) =>
    api.patch<{ message: string }>('/api/client/profile/password', data, token),

  getBioSuggestions: (
    token: string,
    tone: 'friendly' | 'serious' | 'playful' | 'calm',
    hint?: string,
  ): Promise<string[]> =>
    api.post<{ data: { suggestions: string[] } }>(
      '/api/client/profile/bio/suggestions',
      { tone, ...(hint ? { hint: hint.slice(0, 300) } : {}) },
      token,
    ).then(r => r.data.suggestions),
};

export type BioTone = 'friendly' | 'serious' | 'playful' | 'calm';
