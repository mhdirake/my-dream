const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toFaDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, digit => PERSIAN_DIGITS[Number(digit)]);
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'نام',
  birth_date: 'تاریخ تولد',
  gender: 'جنسیت',
  province: 'استان',
  province_id: 'استان',
  city: 'شهر',
  city_id: 'شهر',
  profile_photo: 'عکس پروفایل',
  username: 'نام کاربری',
  email: 'ایمیل',
  relationship_goal: 'هدف از آشنایی',
  lifestyle_tags: 'سبک زندگی',
  languages: 'زبان‌ها و گویش‌ها',
  height: 'قد',
  height_cm: 'قد',
  religiosity: 'میزان مذهبی بودن',
  religiosity_level: 'میزان مذهبی بودن',
  dealbreakers: 'خط قرمزها',
  job: 'شغل',
  education: 'تحصیلات',
  personality_test: 'تست شخصیت',
  voice: 'فایل صوتی',
  duration_seconds: 'مدت فایل صوتی',
  password: 'رمز عبور',
  mobile: 'شماره موبایل',
};

export function profileCompletionLabel(key: string, fallback?: string): string {
  return FIELD_LABELS[key] ?? fallback ?? key;
}

function fieldFromMessage(message: string): string | null {
  const match = message.match(/The ([a-z0-9_. -]+) field/i);
  if (!match) return null;
  const key = match[1].replaceAll(' ', '_').replace(/\.\d+(\.|$)/g, '_');
  return FIELD_LABELS[key] ?? FIELD_LABELS[key.split('_')[0]] ?? null;
}

export function localizeErrorMessage(rawMessage: unknown, status?: number): string {
  const raw = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  if (raw && /[\u0600-\u06ff]/.test(raw)) return toFaDigits(raw);

  const field = fieldFromMessage(raw);
  if (field) {
    if (/required/i.test(raw)) return `وارد کردن ${field} الزامی است.`;
    if (/must be a file of type/i.test(raw)) return `فرمت ${field} پشتیبانی نمی‌شود.`;
    if (/must be an? (integer|number)/i.test(raw)) return `${field} باید عدد معتبر باشد.`;
    if (/has already been taken/i.test(raw)) return `${field} قبلاً استفاده شده است.`;
    if (/selected .* is invalid/i.test(raw)) return `${field} انتخاب‌شده معتبر نیست.`;
    if (/must not be greater than/i.test(raw)) return `مقدار ${field} بیشتر از حد مجاز است.`;
    return `مقدار ${field} معتبر نیست.`;
  }

  if (/failed to fetch|network request failed|networkerror/i.test(raw)) {
    return 'ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کن.';
  }
  if (/invalid user credentials|invalid_grant|incorrect password/i.test(raw)) {
    return 'نام کاربری یا رمز عبور نادرست است.';
  }
  if (/insufficient.*coin|not enough.*coin/i.test(raw)) {
    return 'موجودی سکه کافی نیست.';
  }
  if (/too many requests|rate limit/i.test(raw) || status === 429) {
    return 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کن.';
  }
  if (/unauthenticated|token.*expired|invalid token/i.test(raw) || status === 401) {
    return 'نشست شما منقضی شده است؛ دوباره وارد شو.';
  }
  if (/forbidden|not allowed|permission/i.test(raw) || status === 403) {
    return 'اجازه انجام این عملیات را نداری.';
  }
  if (/not found/i.test(raw) || status === 404) {
    return 'اطلاعات موردنظر پیدا نشد.';
  }
  if (/validation/i.test(raw) || status === 422) {
    return 'اطلاعات واردشده معتبر نیست؛ موارد فرم را بررسی کن.';
  }
  if (status !== undefined && status >= 500) {
    return 'خطایی در سرور رخ داد؛ کمی بعد دوباره تلاش کن.';
  }
  if (!raw || /^HTTP \d+$/i.test(raw)) {
    return 'انجام عملیات ناموفق بود؛ دوباره تلاش کن.';
  }

  return 'انجام عملیات ناموفق بود؛ دوباره تلاش کن.';
}
