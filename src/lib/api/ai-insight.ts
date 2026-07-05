import { api } from './client';

export type AiInsightData = {
  id: number;
  type: 'self' | 'public';
  status: string;
  source: string;
  result: string | null;
  summary: string | null;
  generated_at: string | null;
  cache_expires_at: string | null;
};

export type SelfInsightLocked = {
  locked: true;
  price: number;
  cache_days: number;
};

export type SelfInsightUnlocked = AiInsightData & {
  locked?: false;
  cached?: boolean;
  can_regenerate_at?: string | null;
  coin_balance?: number;
};

export type UserInsightLocked =
  | { locked: true; target_hidden: true; can_purchase: false }
  | { locked: true; price: number; access_hours: number; has_active_cached_insight: boolean; can_purchase: true; target_hidden: false };

export type UserInsightUnlocked = AiInsightData & {
  locked?: false;
  access_expires_at?: string | null;
};

export type SelfInsight = SelfInsightLocked | SelfInsightUnlocked;
export type UserInsight = UserInsightLocked | UserInsightUnlocked;

export type GenerateError = {
  status: 'insufficient_data' | 'insufficient_quality';
  required?: { active_conversations: number; total_messages: number };
  current?: { active_conversations: number; total_messages: number };
  refunded?: boolean;
};

export type AiInsightPurchase = {
  id: number;
  insight_type: string;
  subject_user_id: number;
  coin_amount: number;
  status: string;
  access_expires_at: string | null;
  refunded_at: string | null;
  purchased_at: string;
};

export type InsightVisibility = 'visible' | 'hidden';

export const aiInsightApi = {
  getSelf: (token: string): Promise<SelfInsight> =>
    api.get<{ data: SelfInsight }>('/api/client/ai-insights/self/latest', token).then(r => r.data),

  generateSelf: (token: string): Promise<SelfInsightUnlocked> =>
    api.post<{ data: SelfInsightUnlocked }>('/api/client/ai-insights/self/generate', {}, token).then(r => r.data),

  getUser: (token: string, userId: number): Promise<UserInsight> =>
    api.get<{ data: UserInsight }>(`/api/client/ai-insights/users/${userId}/latest`, token).then(r => r.data),

  purchaseUser: (token: string, userId: number): Promise<UserInsightUnlocked> =>
    api.post<{ data: UserInsightUnlocked }>(`/api/client/ai-insights/users/${userId}/purchase`, {}, token).then(r => r.data),

  getPurchases: (token: string, page = 1): Promise<AiInsightPurchase[]> =>
    api.get<{ data: AiInsightPurchase[] }>(`/api/client/ai-insights/purchases?page=${page}`, token)
      .then(r => r.data ?? []),

  setInsightPrivacy: (token: string, visibility: InsightVisibility) =>
    api.patch<{ data: { ai_public_insight_visibility: InsightVisibility } }>(
      '/api/client/me/ai-insight-privacy',
      { ai_public_insight_visibility: visibility },
      token,
    ),
};
