import { toEnDigits } from './toEnDigits';

export function defaultCoinPricing() {
  return { unit_price_amount: 1000, preset_amounts: [200, 500, 1000], minimum_coins: 200 };
}

export function normalizeCoinQuantity(value: string): string {
  return toEnDigits(value).replace(/[\s,٬]/g, '');
}

export function coinPurchaseQuote(value: string, unitPrice: number, minimum = 200) {
  const normalized = normalizeCoinQuantity(value);
  if (!/^\d+$/.test(normalized)) return null;
  const coins = Number(normalized);
  const amount = coins * unitPrice;
  if (!Number.isSafeInteger(coins) || coins < minimum || !Number.isSafeInteger(unitPrice) || unitPrice < 1 || !Number.isSafeInteger(amount)) return null;
  return { coins, amount };
}
