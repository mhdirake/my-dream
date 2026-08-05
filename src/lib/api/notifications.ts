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

const GIFT_PLAN_LABELS: Record<string, string> = {
  free: 'پایه',
  silver: 'نقره‌ای',
  gold: 'طلایی',
};

function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(digit)));
}

export function giftNotificationDetail(notification: AppNotification): string | null {
  if (notification.type !== 'gift_received') return null;

  const metadata = notification.metadata ?? {};
  const giftKind = String(metadata.gift_kind ?? '').toLowerCase();

  if (giftKind === 'catalog_gift') {
    const title = typeof metadata.gift_title === 'string' ? metadata.gift_title.trim() : '';
    return title ? `هدیه: ${title}` : 'هدیه فروشگاه';
  }

  if (giftKind === 'coin_gift') {
    const amount = Number(metadata.amount);
    return Number.isFinite(amount) && amount > 0
      ? `${toPersianDigits(amount)} سکه`
      : 'هدیه سکه';
  }

  if (giftKind === 'subscription' || giftKind === 'subscription_gift') {
    const slug = String(metadata.plan_slug ?? '').toLowerCase();
    const planName = typeof metadata.plan_name === 'string' ? metadata.plan_name.trim() : '';
    const plan = planName || GIFT_PLAN_LABELS[slug] || slug;
    const duration = Number(metadata.duration_days);
    const durationText = Number.isFinite(duration) && duration > 0
      ? `، ${toPersianDigits(duration)} روزه`
      : '';
    return plan ? `اشتراک ${plan}${durationText}` : 'هدیه اشتراک';
  }

  if (giftKind === 'gold_badge' || giftKind === 'gold_badge_gift') {
    return 'نشان طلایی یک‌ماهه';
  }

  return null;
}

const MESSAGE_NOTIFICATION_TYPES = new Set([
  'new_message',
  'message_received',
  'chat_message_created',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Group messages use the same notification types as direct messages on some
 * backend versions, so keep a lightweight defensive check for malformed or
 * stale responses even though the backend no longer creates these records.
 */
export function isGroupMessageNotification(notification: AppNotification): boolean {
  const type = notification.type.toLowerCase().replace(/-/g, '_');
  const explicitlyGroupMessage =
    (type.includes('group') && type.includes('message'));
  const isMessage = MESSAGE_NOTIFICATION_TYPES.has(type) || explicitlyGroupMessage;
  if (!isMessage) return false;
  if (explicitlyGroupMessage) return true;

  const metadata = notification.metadata ?? {};
  const conversation = asRecord(metadata.conversation);
  const conversationType = String(
    metadata.conversation_type ??
    metadata.conversationType ??
    conversation?.type ??
    conversation?.conversation_type ??
    '',
  ).toLowerCase();
  if (conversationType === 'group') return true;

  const isGroup = metadata.is_group ?? metadata.isGroup ?? conversation?.is_group;
  if (isGroup === true || isGroup === 1 || isGroup === '1' || isGroup === 'true') return true;

  if (
    metadata.group_key != null ||
    metadata.group_id != null ||
    conversation?.group_key != null ||
    conversation?.group_id != null
  ) return true;

  return false;
}

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
