import { api } from './client';
import { BackendGift } from './discover';

export type SentGift = {
  sent_gift_id: number;
  gift_title: string;
  gift_type: string;
  coin_price_paid: number;
  asset_url: string | null;
  asset_type: string;
  sender: { id: number; username: string; first_name: string; last_name: string | null; profile_photo_path: string | null } | null;
  note: string | null;
  sent_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
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
  sender: { id: number; username: string; first_name: string } | null;
  receiver: { id: number; username: string; first_name: string } | null;
};

export const giftsApi = {
  list: (token: string): Promise<BackendGift[]> =>
    api.get<{ data: BackendGift[] }>('/api/client/gifts', token).then(r => r.data ?? []),

  send: (token: string, giftId: number, receiverUserId: number, note?: string) =>
    api.post<{ message: string; data: SentGift; coin_balance: number }>(
      `/api/client/gifts/${giftId}/send`,
      { receiver_user_id: receiverUserId, note: note ?? null, show_in_chat: false },
      token,
    ),

  mine: (token: string): Promise<SentGift[]> =>
    api.get<{ data: SentGift[] }>('/api/client/me/gifts', token).then(r => r.data ?? []),

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
    api.post<{ message: string }>(
      '/api/client/subscription-gifts',
      { receiver_user_id: receiverUserId, subscription_plan_id: subscriptionPlanId, note: note ?? null, show_in_chat: false },
      token,
    ),
};
