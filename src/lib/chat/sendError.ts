import { ApiError } from '../api/client';

export function requiredMessagePlan(type: 'image' | 'voice'): string {
  return type === 'image'
    ? 'برای ارسال عکس باید اشتراک طلایی تهیه کنی؛ اشتراک نقره‌ای ارسال عکس ندارد.'
    : 'برای ارسال پیام صوتی باید اشتراک نقره‌ای یا طلایی داشته باشی.';
}

export function dailyMessageLimitMessage(plan: string): string {
  if (plan === 'gold') return 'سقف ارسال پیام امروزت به پایان رسیده است؛ فردا دوباره تلاش کن.';
  return plan === 'silver'
    ? 'سقف ۵۰۰ پیام روزانهٔ اشتراک نقره‌ای‌ات تمام شده است. فردا دوباره پیام بفرست یا اشتراک طلایی تهیه کن.'
    : 'سقف ۱۰ پیام روزانهٔ پلن پایه‌ات تمام شده است. فردا دوباره پیام بفرست یا اشتراک نقره‌ای یا طلایی تهیه کن.';
}

export function chatSendError(error: unknown, type: 'text' | 'image' | 'voice', plan: string) {
  const raw = error instanceof ApiError ? error.rawMessage : error instanceof Error ? error.message : '';
  const dailyLimit = /daily messages|daily.*message.*limit|message.*limit exceeded|محدودیت روزانه messages|سقف.*پیام|محدودیت روزانه.*پیام/i.test(raw);
  if (dailyLimit) return { dailyLimit: true, message: dailyMessageLimitMessage(plan) };
  if (type !== 'text' && /این نوع پیام در پلن|message type.*(unavailable|not allowed)/i.test(raw)) {
    return { dailyLimit: false, message: requiredMessagePlan(type) };
  }
  return {
    dailyLimit: false,
    message: error instanceof Error && error.message
      ? error.message
      : 'ارسال پیام ناموفق بود؛ دوباره تلاش کن.',
  };
}
