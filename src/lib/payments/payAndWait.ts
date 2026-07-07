import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { paymentsApi, type PaymentStatusDetail } from '../api/payments';

export type PayAndWaitResult =
  | { status: 'completed'; detail: PaymentStatusDetail }
  | { status: 'failed'; detail: PaymentStatusDetail | null }
  | { status: 'cancelled' };

export async function payAndWait(
  token: string,
  paymentId: number,
  paymentUrl: string,
): Promise<PayAndWaitResult> {
  const redirectUrl = Linking.createURL('payment-callback');
  const result = await WebBrowser.openAuthSessionAsync(paymentUrl, redirectUrl);

  if (result.type !== 'success') {
    // کاربر مرورگر رو بست — ولی ممکنه پرداخت واقعاً انجام شده باشه (مثلاً redirect به scheme
    // در بعضی مرورگرها session رو close می‌کنه). یک‌بار از سرور وضعیت قطعی رو می‌گیریم.
    try {
      const detail = await paymentsApi.getStatus(token, paymentId);
      if (detail.status === 'completed') return { status: 'completed', detail };
      if (detail.status === 'failed') return { status: 'failed', detail };
    } catch {
      // بدون شبکه/خطا — همون cancelled می‌مونه
    }
    return { status: 'cancelled' };
  }

  try {
    const detail = await paymentsApi.getStatus(token, paymentId);
    return detail.status === 'completed'
      ? { status: 'completed', detail }
      : { status: 'failed', detail };
  } catch {
    return { status: 'failed', detail: null };
  }
}
