import { describe, expect, it } from 'vitest';
import { localizeErrorMessage } from './localization';

describe('localizeErrorMessage', () => {
  it('preserves specific Persian subscription explanations', () => {
    const message = 'برای ارسال عکس باید اشتراک طلایی تهیه کنی.';
    expect(localizeErrorMessage(message, 403)).toBe(message);
  });
  it('explains subscription limits clearly', () => {
    expect(localizeErrorMessage('Daily messages limit exceeded', 429)).toBe(
      'به محدودیت اشتراک فعلی‌ات رسیدی. برای ادامه، اشتراکت را ارتقا بده یا بعداً دوباره تلاش کن.',
    );
  });

  it('does not mistake authorization failures for subscription limits', () => {
    expect(localizeErrorMessage('اجازه انجام این عملیات را نداری.', 403)).toBe(
      'اجازه انجام این عملیات را نداری.',
    );
  });
  it('explains that AI is intentionally disabled', () => {
    expect(localizeErrorMessage('AI is temporarily unavailable: the service is disabled or not configured.', 503)).toBe(
      'سرویس هوش مصنوعی فعلاً غیرفعال است و هنوز تنظیم نشده است.',
    );
  });
});
