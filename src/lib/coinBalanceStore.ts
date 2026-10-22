type RequestStamp = { epoch: number; revision: number };
type WalletResult = { coin_balance: number };

/** One server-authoritative balance per signed-in account; never persist money locally. */
export class CoinBalanceStore {
  accountId: number | null = null;
  balance: number | null = null;
  private token: string | null = null;
  private epoch = 0;
  private revision = 0;
  private listeners = new Set<() => void>();
  private invalidations = new Set<() => void>();
  private pending: { token: string; revision: number; promise: Promise<WalletResult> } | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  onInvalidate = (listener: () => void) => {
    this.invalidations.add(listener);
    return () => { this.invalidations.delete(listener); };
  };

  activate(accountId: number | null, token: string | null) {
    if (this.accountId === accountId && this.token === token) return;
    const changedAccount = this.accountId !== accountId || token === null;
    this.accountId = accountId;
    this.token = token;
    this.epoch++;
    this.pending = null;
    if (changedAccount) this.balance = null;
    this.emit();
  }

  capture(token: string | undefined): RequestStamp | null {
    return token && token === this.token ? { epoch: this.epoch, revision: this.revision } : null;
  }

  observe(token: string | undefined, response: unknown, stamp: RequestStamp | null, readOnly: boolean): boolean {
    if (!stamp || token !== this.token || stamp.epoch !== this.epoch || (readOnly && stamp.revision !== this.revision)) return false;
    if (!response || typeof response !== 'object') return false;
    const body = response as Record<string, unknown>;
    const data = body.data && typeof body.data === 'object' ? body.data as Record<string, unknown> : null;
    const balance = body.coin_balance ?? body.sender_coin_balance ?? data?.coin_balance;
    if (typeof balance !== 'number' || !Number.isSafeInteger(balance) || balance < 0) return false;
    this.balance = balance;
    this.revision++;
    this.emit();
    return true;
  }

  invalidate(token: string | undefined) {
    if (!token || token !== this.token) return;
    this.revision++;
    this.invalidations.forEach(listener => listener());
  }

  read(token: string, load: () => Promise<WalletResult>): Promise<WalletResult> {
    if (this.pending?.token === token && this.pending.revision === this.revision) return this.pending.promise;
    const revision = this.revision;
    const promise = load().finally(() => {
      if (this.pending?.promise === promise) this.pending = null;
    });
    this.pending = { token, revision, promise };
    return promise;
  }

  private emit() { this.listeners.forEach(listener => listener()); }
}

export const coinBalanceStore = new CoinBalanceStore();

export function isCoinMutation(path: string): boolean {
  return /^\/api\/client\/(coin-gifts$|gifts\/\d+\/send$|gold-badge\/(purchase|gifts)$|profile-view-history\/purchase$|anonymous-interests\/reveal-access\/purchase$|ai-insights\/(self\/generate|users\/\d+\/purchase)$)/.test(path);
}
