import { api } from './client';

export type PaymentTransactionStatus =
  | 'pending' | 'requested' | 'verified' | 'completed' | 'failed';

export type PaymentTransaction = {
  id: number;
  purchase_type: 'subscription' | 'gold_badge' | 'coin_bundle';
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  payment_url?: string;
};

export type PaymentStatusDetail = {
  id: number;
  purchase_type: 'subscription' | 'gold_badge' | 'coin_bundle';
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  reference_id: string | null;
  gateway_transaction_id: string | null;
  failure_message: string | null;
  metadata: Record<string, unknown> | null;
  coin_balance: number;
  gold_badge_active: boolean;
  gold_badge_until: string | null;
  feature_access_until: string | null;
};

export type CoinPackage = {
  id: number;
  name: string;
  slug: string;
  feature: string;
  description: string | null;
  duration_days: number | null;
  metadata: { coin_amount: number; price_amount: number };
};

type PaymentRequestResponse = { message: string; data: PaymentTransaction; payment_url: string };

export const paymentsApi = {
  paySubscription: (token: string, subscriptionPlanId: number) =>
    api.post<PaymentRequestResponse>(
      '/api/client/payments/subscriptions',
      { subscription_plan_id: subscriptionPlanId },
      token,
    ),

  payGoldBadge: (token: string, packageId: number) =>
    api.post<PaymentRequestResponse>(
      '/api/client/payments/gold-badge',
      { package_id: packageId },
      token,
    ),

  payCoinPackage: (token: string, packageId: number) =>
    api.post<PaymentRequestResponse>(
      '/api/client/payments/coin-packages',
      { package_id: packageId },
      token,
    ),

  getCoinPackages: (token: string): Promise<CoinPackage[]> =>
    api.get<{ data: CoinPackage[] }>('/api/client/coin-packages', token).then(r => r.data ?? []),

  getStatus: (token: string, paymentId: number): Promise<PaymentStatusDetail> =>
    api.get<{ data: PaymentStatusDetail }>(`/api/client/payments/${paymentId}`, token).then(r => r.data),
};
