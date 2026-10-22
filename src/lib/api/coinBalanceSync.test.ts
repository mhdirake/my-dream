import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { coinBalanceStore } from '../coinBalanceStore';
vi.mock('./url', () => ({ apiUrl: (path: string) => `https://api.test${path}` }));
afterEach(() => { coinBalanceStore.activate(null, null); vi.unstubAllGlobals(); });

describe('API wallet synchronization', () => {
  it('publishes payment and gift results without screens updating their own counters', async () => {
    coinBalanceStore.activate(1, 'token');
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('{"data":{"coin_balance":700}}'))
      .mockResolvedValueOnce(new Response('{"sender_coin_balance":500}'));
    vi.stubGlobal('fetch', fetcher);
    await api.get('/api/client/payments/1', 'token');
    expect(coinBalanceStore.balance).toBe(700);
    const invalidated = vi.fn(); const unsubscribe = coinBalanceStore.onInvalidate(invalidated);
    await api.post('/api/client/coin-gifts', { amount: 200 }, 'token');
    expect(coinBalanceStore.balance).toBe(500);
    expect(invalidated).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does not publish balances from failed requests', async () => {
    coinBalanceStore.activate(1, 'token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"coin_balance":999}', { status: 422 })));
    await expect(api.post('/api/client/coin-gifts', {}, 'token')).rejects.toThrow();
    expect(coinBalanceStore.balance).toBeNull();
  });
});
