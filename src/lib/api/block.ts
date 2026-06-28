import { api } from './client';
import type { ProfilePhotoVariants } from './profile';

export type BlockStatus = {
  blocked_by_me: boolean;
  blocked_me: boolean;
  is_blocked_between: boolean;
  can_view_profile: boolean;
  can_interact: boolean;
  can_start_conversation: boolean;
};

export type BlockedUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string | null;
  profile_photo: { urls: ProfilePhotoVariants } | null;
};

export type BlockedItem = {
  blocked_user: BlockedUser;
  blocked_at: string;
  reason: string | null;
};

export type BlockedUsersPage = {
  data: BlockedItem[];
  meta: { total: number; current_page: number; last_page: number };
};

export const blockApi = {
  getBlocked: (token: string, page = 1): Promise<BlockedUsersPage> =>
    api.get<BlockedUsersPage>(`/api/client/blocks?page=${page}`, token),

  blockUser: (token: string, userId: number, reason?: string): Promise<void> =>
    api.post(`/api/client/users/${userId}/block`, reason ? { reason } : {}, token),

  unblockUser: (token: string, userId: number): Promise<void> =>
    api.delete(`/api/client/users/${userId}/block`, token),

  getBlockStatus: (token: string, userId: number): Promise<BlockStatus> =>
    api.get<{ data: BlockStatus }>(`/api/client/users/${userId}/block-status`, token).then(r => r.data),
};
