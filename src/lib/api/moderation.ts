import { api } from './client';

export type RestrictionItem = {
  id: number;
  type: string;
  scope: string;
  label: string;
  reason: string | null;
  level: number;
  starts_at: string;
  ends_at: string | null;
  remaining_seconds: number | null;
  is_permanent: boolean;
  source: string;
};

export type ModerationStatus = {
  is_banned: boolean;
  has_active_restriction: boolean;
  active_restrictions: RestrictionItem[];
  capabilities: Record<string, boolean>;
};

export const moderationApi = {
  getStatus: (token: string): Promise<ModerationStatus> =>
    api.get<{ moderation: ModerationStatus }>('/api/client/me/moderation-status', token).then(r => r.moderation),
};
