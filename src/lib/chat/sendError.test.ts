import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { chatSendError } from './sendError';

describe('chat send errors', () => {
  it('distinguishes the silver daily quota from permission to send voice', () => {
    const result = chatSendError(new ApiError(403, 'محدودیت روزانه messages به پایان رسیده است.'), 'voice', 'silver');
    expect(result.dailyLimit).toBe(true);
    expect(result.message).toContain('۵۰۰');
    expect(result.message).toContain('طلایی');
  });
  it('explains the required plan for each restricted media type', () => {
    const error = new ApiError(403, 'این نوع پیام در پلن اشتراک شما در دسترس نیست.');
    expect(chatSendError(error, 'image', 'silver').message).toContain('نقره‌ای ارسال عکس ندارد');
    expect(chatSendError(error, 'voice', 'basic').message).toContain('نقره‌ای یا طلایی');
  });
  it('preserves unrelated access failures and does not lock the composer for rate limits', () => {
    expect(chatSendError(new ApiError(403, 'به این گفتگو دسترسی نداری.'), 'voice', 'silver').message).toBe('به این گفتگو دسترسی نداری.');
    expect(chatSendError(new ApiError(429, 'Too many requests'), 'voice', 'silver').dailyLimit).toBe(false);
  });
  it('handles English daily limits without suggesting an upgrade beyond gold', () => {
    const result = chatSendError(new ApiError(403, 'Daily messages limit exceeded'), 'text', 'gold');
    expect(result.dailyLimit).toBe(true);
    expect(result.message).not.toContain('تهیه');
  });
});
