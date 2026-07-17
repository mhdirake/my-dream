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

  const readTerminalStatus = async (): Promise<PaymentStatusDetail | null> => {
    let lastDetail: PaymentStatusDetail | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        lastDetail = await paymentsApi.getStatus(token, paymentId);
        if (lastDetail.status === 'completed' || lastDetail.status === 'failed') return lastDetail;
      } catch {
        // A short network interruption after returning from the gateway is retried below.
      }

      if (attempt < 7) {
        await new Promise(resolve => setTimeout(resolve, 750));
      }
    }

    return lastDetail;
  };

  if (result.type !== 'success') {
    // کاربر مرورگر رو بست — ولی ممکنه پرداخت واقعاً انجام شده باشه (مثلاً redirect به scheme
    // در بعضی مرورگرها session رو close می‌کنه). یک‌بار از سرور وضعیت قطعی رو می‌گیریم.
    try {
      const detail = await readTerminalStatus();
      if (!detail) return { status: 'cancelled' };
      if (detail.status === 'completed') return { status: 'completed', detail };
      if (detail.status === 'failed') return { status: 'failed', detail };
    } catch {
      // بدون شبکه/خطا — همون cancelled می‌مونه
    }
    return { status: 'cancelled' };
  }

  try {
    const detail = await readTerminalStatus();
    if (!detail) return { status: 'cancelled' };
    if (detail.status === 'completed') return { status: 'completed', detail };
    if (detail.status === 'failed') return { status: 'failed', detail };
    return { status: 'cancelled' };
  } catch {
    return { status: 'cancelled' };
  }
}
