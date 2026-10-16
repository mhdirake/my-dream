export type ChatActivity = { userId: number; kind: 'typing' | 'recording'; expiresAt: number };
export const ACTIVITY_TTL = 6000;

export function updateActivities(previous: ChatActivity[], raw: Record<string, unknown>, accountId: number, now = Date.now()): ChatActivity[] {
  const userId = Number(raw.user_id ?? raw.UserID);
  const kind = raw.activity ?? raw.Activity ?? 'typing';
  const current = previous.filter(item => item.expiresAt > now && item.userId !== accountId);
  if (!Number.isSafeInteger(userId) || userId <= 0 || userId === accountId || (kind !== 'typing' && kind !== 'recording')) return current;
  if ((raw.active ?? raw.Active) === false) return current.filter(item => item.userId !== userId || item.kind !== kind);
  return [...current.filter(item => item.userId !== userId), { userId, kind, expiresAt: now + ACTIVITY_TTL }];
}

export function activitySummary(activities: ChatActivity[], name: (id: number) => string): string {
  const entries = [...activities].sort((a, b) => a.userId - b.userId);
  return entries.slice(0, 3).map(item => `${name(item.userId)} ${item.kind === 'recording' ? 'در حال ضبط صدا' : 'در حال تایپ'}`).join('، ')
    + (entries.length > 3 ? '، ...' : '');
}
