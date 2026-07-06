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
