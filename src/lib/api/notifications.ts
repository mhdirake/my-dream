import { api } from './client';

export type NotificationRelatedUser = {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo: string | null;
};

export type AppNotification = {
  id: number;
  type: string;
  title: string | null;
  body: string | null;
  related_user: NotificationRelatedUser | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationsResponse = {
  data: AppNotification[];
  unread_count: number;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export const notificationsApi = {
  list: (token: string, page = 1, unreadOnly = false): Promise<NotificationsResponse> =>
    api.get<NotificationsResponse>(
      `/api/client/notifications?page=${page}&per_page=20${unreadOnly ? '&unread=true' : ''}`,
      token,
    ),

  markRead: (token: string, id: number): Promise<{ data: AppNotification }> =>
    api.post(`/api/client/notifications/${id}/read`, {}, token),

  markAllRead: (token: string): Promise<void> =>
    api.post('/api/client/notifications/read-all', {}, token),
};
