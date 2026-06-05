import { api } from './client';

export type ClientProfile = {
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  gender?: string;
  province_id?: number;
  city_id?: number;
  bio?: string;
  height_cm?: number;
  job?: string;
  education?: string;
  religiosity_level?: number;
  relationship_goal_id?: number;
  safe_mode_enabled?: boolean;
  lifestyle_tag_ids?: number[];
  languages?: { id: number; is_primary: boolean }[];
  dealbreakers?: string[];
};

export const profileApi = {
  getProfile: (token: string) =>
    api.get<ClientProfile>('/api/client/profile', token),

  updateProfile: (token: string, data: Partial<ClientProfile>) =>
    api.patch<ClientProfile>('/api/client/profile', data, token),
};
