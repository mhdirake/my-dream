export type CompatibilityTier = 'basic' | 'silver' | 'gold';
export type CompatibilityStatus = 'text_only' | 'ready' | 'insufficient_data' | 'processing' | 'unavailable';
export type CompatibilitySnapshot = {
  status: CompatibilityStatus;
  tier: CompatibilityTier;
  score_type: 'basic' | 'lifestyle' | 'advanced';
  score?: number | null;
  reason_codes: string[];
  reason_text: string;
  reason_details: string[];
  snapshot_id: string | null;
  algorithm_version: string;
  goal_matrix_version: string;
  day: string;
  viewer_id: number;
  candidate_id: number;
};

export type CompatibilityContext = {
  viewerId?: number;
  candidateId: number;
  day?: string;
  tier?: string;
};

const statuses: CompatibilityStatus[] = ['text_only', 'ready', 'insufficient_data', 'processing', 'unavailable'];
const scoreTypes = { basic: 'basic', silver: 'lifestyle', gold: 'advanced' } as const;
const strings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim()).map(entry => entry.trim()) : [];

export function compatibilityTier(value: unknown): CompatibilityTier | undefined {
  return value === 'basic' || value === 'silver' || value === 'gold' ? value : undefined;
}

// This is contract validation, not matching. Never calculate, round, clamp or
// reconstruct a missing score from public profile fields/legacy cache values.
export function normalizeCompatibility(value: unknown, context: CompatibilityContext): CompatibilitySnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const tier = compatibilityTier(raw.tier);
  if (!tier || !statuses.includes(raw.status as CompatibilityStatus) || raw.score_type !== scoreTypes[tier]) return null;
  if (!Number.isSafeInteger(context.viewerId) || context.viewerId! <= 0
    || !Number.isSafeInteger(context.candidateId) || context.candidateId <= 0
    || raw.viewer_id !== context.viewerId || raw.candidate_id !== context.candidateId) return null;
  if (typeof raw.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.day) || !context.day || raw.day !== context.day) return null;
  const parsedDay = Date.parse(`${raw.day}T00:00:00Z`);
  if (!Number.isFinite(parsedDay) || new Date(parsedDay).toISOString().slice(0, 10) !== raw.day) return null;
  if (context.tier && context.tier !== tier) return null;
  if (typeof raw.algorithm_version !== 'string' || !raw.algorithm_version.trim()
    || typeof raw.goal_matrix_version !== 'string' || !raw.goal_matrix_version.trim()) return null;
  const status = raw.status as CompatibilityStatus;
  if ((tier === 'basic' && status === 'ready') || (tier !== 'basic' && status === 'text_only')) return null;
  const snapshotId = typeof raw.snapshot_id === 'string' && raw.snapshot_id.trim() ? raw.snapshot_id : null;
  if (status === 'ready' && (!snapshotId || typeof raw.score !== 'number'
    || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > 100)) return null;

  return {
    status, tier, score_type: scoreTypes[tier],
    ...(tier !== 'basic' && { score: status === 'ready' ? raw.score as number : null }),
    reason_codes: strings(raw.reason_codes),
    reason_text: typeof raw.reason_text === 'string' && raw.reason_text.trim()
      ? raw.reason_text.trim() : 'پروفایل پیشنهادی برای آشنایی',
    reason_details: status === 'unavailable' || status === 'processing' ? [] : strings(raw.reason_details),
    snapshot_id: snapshotId,
    algorithm_version: raw.algorithm_version,
    goal_matrix_version: raw.goal_matrix_version,
    day: raw.day, viewer_id: context.viewerId!, candidate_id: context.candidateId,
  };
}

export function compatibilityScore(snapshot: CompatibilitySnapshot | null | undefined): number | null {
  return snapshot?.status === 'ready' && snapshot.tier !== 'basic' && Number.isInteger(snapshot.score)
    && snapshot.score! >= 0 && snapshot.score! <= 100
    ? snapshot.score! : null;
}

export function compatibilityPresentation(snapshot: CompatibilitySnapshot | null | undefined) {
  const score = compatibilityScore(snapshot);
  const title = !snapshot || snapshot.status === 'unavailable' ? 'سازگاری در دسترس نیست'
    : snapshot.status === 'processing' ? 'سازگاری در حال آماده‌سازی است'
    : snapshot.status === 'insufficient_data' ? 'اطلاعات کافی برای امتیاز سازگاری وجود ندارد'
    : snapshot.score_type === 'lifestyle' ? 'سازگاری سبک زندگی'
    : snapshot.score_type === 'advanced' ? 'سازگاری پیشرفته' : 'دلیل پیشنهاد';
  return { score, title, reason: snapshot?.reason_text || 'امتیاز سازگاری برای پیشنهادهای معتبر امروز نمایش داده می‌شود.' };
}

export const COMPATIBILITY_DISCLAIMER = 'این ارزیابی تخمینی و براساس اطلاعات مجاز ثبت‌شده است؛ تضمین موفقیت رابطه یا تشخیص شخصیت نیست.';
