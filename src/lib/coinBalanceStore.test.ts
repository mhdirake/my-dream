import { describe, expect, it, vi } from 'vitest';
import { CoinBalanceStore, isCoinMutation } from './coinBalanceStore';

describe('shared account coin balance', () => {
  it('updates every mounted display from one authoritative response, including zero', () => {
    const store = new CoinBalanceStore();
    store.activate(1, 'one');
    const profile: (number | null)[] = [], gifts: (number | null)[] = [];
    store.subscribe(() => profile.push(store.balance));
    const unsubscribe = store.subscribe(() => gifts.push(store.balance));
    store.observe('one', { coin_balance: 400 }, store.capture('one'), true);
    store.observe('one', { sender_coin_balance: 0 }, store.capture('one'), false);
    expect(profile).toEqual([400, 0]);
    expect(gifts).toEqual([400, 0]);
    unsubscribe();
    store.observe('one', { data: { coin_balance: 1000 } }, store.capture('one'), false);
    expect(profile).toEqual([400, 0, 1000]);
    expect(gifts).toEqual([400, 0]);
  });

  it('cannot let a wallet read started before a purchase overwrite the new balance', () => {
    const store = new CoinBalanceStore(); store.activate(1, 'one');
    const oldRead = store.capture('one');
    store.observe('one', { coin_balance: 900 }, store.capture('one'), false);
    expect(store.observe('one', { coin_balance: 100 }, oldRead, true)).toBe(false);
    expect(store.balance).toBe(900);
  });

  it('clears the previous account and ignores in-flight responses after account switching or logout', () => {
    const store = new CoinBalanceStore(); store.activate(1, 'one');
    const old = store.capture('one');
    store.observe('one', { coin_balance: 100 }, old, false);
    store.activate(2, 'two');
    expect(store.balance).toBeNull();
    expect(store.observe('one', { coin_balance: 900 }, old, false)).toBe(false);
    store.observe('two', { coin_balance: 50 }, store.capture('two'), true);
    store.activate(null, null);
    expect(store.balance).toBeNull();
  });

  it('preserves the same account balance during token rotation but rejects old requests', () => {
    const store = new CoinBalanceStore(); store.activate(1, 'old');
    store.observe('old', { coin_balance: 100 }, store.capture('old'), true);
    const stale = store.capture('old');
    store.activate(1, 'new');
    expect(store.balance).toBe(100);
    expect(store.observe('old', { coin_balance: 50 }, stale, false)).toBe(false);
  });

  it.each([-1, NaN, Infinity, '200', 1.5, null])('rejects malformed balances: %s', value => {
    const store = new CoinBalanceStore(); store.activate(1, 'one');
    expect(store.observe('one', { coin_balance: value }, store.capture('one'), false)).toBe(false);
    expect(store.balance).toBeNull();
  });

  it('coalesces simultaneous requests from several screens', async () => {
    const store = new CoinBalanceStore(); store.activate(1, 'one');
    let resolve!: (value: { coin_balance: number }) => void;
    const load = vi.fn(() => new Promise<{ coin_balance: number }>(done => { resolve = done; }));
    const first = store.read('one', load), second = store.read('one', load);
    expect(load).toHaveBeenCalledTimes(1);
    resolve({ coin_balance: 100 });
    expect(await first).toEqual(await second);
  });

  it('invalidates in-flight reads and notifies refresh listeners after spending', () => {
    const store = new CoinBalanceStore(); store.activate(1, 'one');
    const read = store.capture('one');
    const refresh = vi.fn(); store.onInvalidate(refresh);
    store.invalidate('one');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store.observe('one', { coin_balance: 500 }, read, true)).toBe(false);
    store.invalidate('another-account');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes coin-funded operations without refreshing on each chat message', () => {
    for (const path of ['/api/client/gifts/3/send', '/api/client/coin-gifts', '/api/client/gold-badge/gifts', '/api/client/ai-insights/users/7/purchase']) expect(isCoinMutation(path)).toBe(true);
    expect(isCoinMutation('/api/client/conversations/1/messages')).toBe(false);
  });
});
