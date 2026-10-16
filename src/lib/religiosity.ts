export const RELIGIOSITY_LEVELS = ['اصلاً مذهبی نیستم', 'خیلی کم', 'متوسط', 'نسبتاً مذهبی', 'مذهبی'] as const;

export function religiosityIndex(value: unknown): number | null {
  if ((typeof value !== 'string' && typeof value !== 'number') || value === '') return null;
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 && level <= RELIGIOSITY_LEVELS.length ? level - 1 : null;
}

export function religiosityLabel(value: number | null): string {
  const index = religiosityIndex(value);
  return index === null ? 'تعیین نشده' : RELIGIOSITY_LEVELS[index];
}
