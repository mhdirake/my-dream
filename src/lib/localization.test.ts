import { describe, expect, it } from 'vitest';
import { localizeErrorMessage } from './localization';

describe('localizeErrorMessage', () => {
  it('explains subscription limits clearly', () => {
    expect(localizeErrorMessage('Daily messages limit exceeded', 429)).toBe(
      'به محدودیت اشتراک فعلی‌ات رسیدی. برای ادامه، اشتراکت را ارتقا بده یا بعداً دوباره تلاش کن.',
    );
  });

  it('replaces vague permission errors with a subscription explanation', () => {
    expect(localizeErrorMessage('اجازه انجام این عملیات را نداری.', 403)).toBe(
      'این کار با اشتراک فعلی‌ات مجاز نیست. برای ادامه باید اشتراکت را ارتقا بدهی.',
    );
  });
});
