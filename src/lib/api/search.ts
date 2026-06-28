import { api } from './client';
import type { ProfilePhotoVariants } from './profile';

export type SearchUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string | null;
  age: number | null;
  city: string | null;
  profile_photo: { urls: ProfilePhotoVariants } | null;
  badges: { id: number; title: string; slug: string }[];
};

export type SearchResult = {
  data: SearchUser[];
  meta: { total: number; current_page: number; last_page: number };
};

export const searchApi = {
  search: (token: string, q: string, limit = 20, page = 1): Promise<SearchResult> =>
    api.get<SearchResult>(
      `/api/client/users/search?q=${encodeURIComponent(q)}&limit=${limit}&page=${page}`,
      token,
    ),
};
