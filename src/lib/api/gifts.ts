import { api } from './client';
import { BackendGift } from './discover';
import type { PaymentTransaction } from './payments';
import { Platform } from 'react-native';
import { resolveMediaUrl } from './media';

export type GiftUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string | null;
  profile_photo_path: string | null;
  profile_photo?: {
    urls?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      original?: string;
    };
  } | null;
};

export function giftUserPhotoUrl(user: GiftUser | null | undefined): string | null {
  const path = user?.profile_photo?.urls?.thumbnail
    ?? user?.profile_photo?.urls?.small
    ?? user?.profile_photo?.urls?.medium
    ?? user?.profile_photo_path;
  if (!path) return null;
  return resolveMediaUrl(path);
}

// English seed titles displayed in Persian — admin-created gifts with a Persian
// title already pass through unchanged via the fallback.
const GIFT_TITLE_FA: Record<string, string> = {
  'Dream Rose': 'گل رز رویایی',
  'Coffee Invite': 'دعوت به قهوه',
  'Cool Moon': 'ماه دلنشین',
  'Golden Heart': 'قلب طلایی',
  'Legendary Star': 'ستاره افسانه‌ای',
};
export const giftDisplayTitle = (title: string) => GIFT_TITLE_FA[title] ?? title;

export type SentGift = {
  sent_gift_id: number;
  gift_title: string;
  gift_type: string;
  coin_price_paid: number;
  asset_url: string | null;
  asset_type: string;
  sender: GiftUser | null;
  note: string | null;
  sent_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
  conversation_id: number | null;
  message_id: string | null;
  chat_delivery_status: 'sent' | 'failed' | null;
  status?: string;
  hidden_at?: string | null;
};

export type CoinGiftRecord = {
  id: number;
  sender_user_id: number;
  receiver_user_id: number;
  amount: number;
  note: string | null;
  status: string;
  sent_at: string;
  sender: GiftUser | null;
  receiver: GiftUser | null;
};

export const giftsApi = {
  list: (token: string): Promise<BackendGift[]> =>
    api.get<{ data: BackendGift[] }>('/api/client/gifts', token).then(r => r.data ?? []),

  send: (token: string, giftId: number, receiverUserId: number, note?: string, showInChat = false) =>
    api.post<{ message: string; data: SentGift; coin_balance: number }>(
      `/api/client/gifts/${giftId}/send`,
      { receiver_user_id: receiverUserId, note: note ?? null, show_in_chat: showInChat },
      token,
    ),

  mine: (token: string): Promise<SentGift[]> =>
    api.get<{ data: SentGift[] }>('/api/client/me/gifts', token).then(r => r.data ?? []),

  listUserGifts: (token: string, userId: number): Promise<SentGift[]> =>
    api.get<{ data: SentGift[] }>(`/api/client/users/${userId}/gifts`, token).then(r => r.data ?? []),

  pin: (token: string, sentGiftId: number) =>
    api.post(`/api/client/sent-gifts/${sentGiftId}/pin`, {}, token),

  unpin: (token: string, sentGiftId: number) =>
    api.post(`/api/client/sent-gifts/${sentGiftId}/unpin`, {}, token),

  hide: (token: string, sentGiftId: number) =>
    api.post(`/api/client/sent-gifts/${sentGiftId}/hide`, {}, token),

  unhide: (token: string, sentGiftId: number) =>
    api.post(`/api/client/sent-gifts/${sentGiftId}/unhide`, {}, token),

  coinGiftsSent: (token: string): Promise<CoinGiftRecord[]> =>
    api.get<{ data: CoinGiftRecord[] }>('/api/client/coin-gifts/sent', token).then(r => r.data ?? []),

  coinGiftsReceived: (token: string): Promise<CoinGiftRecord[]> =>
    api.get<{ data: CoinGiftRecord[] }>('/api/client/coin-gifts/received', token).then(r => r.data ?? []),

  sendCoinGift: (token: string, receiverUserId: number, amount: number, note?: string) =>
    api.post<{ message: string; sender_coin_balance: number }>(
      '/api/client/coin-gifts',
      { receiver_user_id: receiverUserId, amount, note: note ?? null, show_in_chat: false },
      token,
    ),

  sendSubscriptionGift: (token: string, receiverUserId: number, subscriptionPlanId: number, note?: string) =>
    api.post<{
      message: string;
      data: SubscriptionGiftRecord;
      payment: PaymentTransaction;
      payment_url: string;
    }>(
      '/api/client/subscription-gifts',
      {
        receiver_user_id: receiverUserId,
        subscription_plan_id: subscriptionPlanId,
        note: note ?? null,
        show_in_chat: false,
        redirect_to: Platform.OS === 'web' ? 'web_app' : 'mobile_app',
      },
      token,
    ),

  subscriptionGiftsSent: (token: string, page = 1): Promise<SubscriptionGiftRecord[]> =>
    api.get<{ data: SubscriptionGiftRecord[] }>(`/api/client/subscription-gifts/sent?page=${page}`, token)
      .then(r => r.data ?? []),

  subscriptionGiftsReceived: (token: string, page = 1): Promise<SubscriptionGiftRecord[]> =>
    api.get<{ data: SubscriptionGiftRecord[] }>(`/api/client/subscription-gifts/received?page=${page}`, token)
      .then(r => r.data ?? []),
};

export type SubscriptionGiftRecord = {
  id: number;
  sender_user_id: number;
  receiver_user_id: number;
  plan_slug: string;
  duration_days: number;
  status: string;
  note: string | null;
  granted_at: string | null;
  created_at: string;
  sender: GiftUser | null;
  receiver: GiftUser | null;
  subscription_plan: { id: number; name: string; slug: string } | null;
};
