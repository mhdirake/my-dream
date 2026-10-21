import { describe, expect, it } from 'vitest';
import { coinPurchaseQuote, defaultCoinPricing } from './coinPurchase';

describe('coin purchases', () => {
  it('provides the default unit price and independent preset arrays', () => {
    expect(defaultCoinPricing()).toEqual({ unit_price_amount: 1000, preset_amounts: [200, 500, 1000], minimum_coins: 200 });
    const changed = defaultCoinPricing();
    changed.preset_amounts.push(2000);
    expect(defaultCoinPricing().preset_amounts).toEqual([200, 500, 1000]);
  });
  it('calculates presets and arbitrary Persian quantities in rials', () => {
    expect(coinPurchaseQuote('۲۰۰', 1000)).toEqual({ coins: 200, amount: 200000 });
    expect(coinPurchaseQuote('۷۵۱', 1200)).toEqual({ coins: 751, amount: 901200 });
    expect(coinPurchaseQuote('۱٬۰۰۰', 1000)?.amount).toBe(1000000);
  });
  it.each(['', '199', '-200', '200.5', 'abc', '9007199254740992'])('rejects invalid or unrepresentable quantity %s', value => {
    expect(coinPurchaseQuote(value, 1000)).toBeNull();
  });
  it('does not impose a package-size maximum', () => {
    expect(coinPurchaseQuote('1000000', 1000)?.coins).toBe(1000000);
  });
});
