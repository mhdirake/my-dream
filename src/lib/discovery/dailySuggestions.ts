import type { DailySuggestionProfile, DailySuggestionsMeta } from '../api/discover';

export type DailySuggestionsResponse = { data: DailySuggestionProfile[]; meta: DailySuggestionsMeta };
export type DailySuggestionsState = {
  profiles: DailySuggestionProfile[];
  meta: DailySuggestionsMeta | null;
  loading: boolean;
  error: string | null;
  restricted: boolean;
};

export const emptyDailyState = (): DailySuggestionsState => ({
  profiles: [], meta: null, loading: false, error: null, restricted: false,
});

export const DAILY_POLL_DELAYS = [5000, 10000, 15000, 30000, 30000, 30000] as const;

export function dailyIsPending(meta: DailySuggestionsMeta | null): boolean {
  return meta?.status === 'queued' || meta?.status === 'processing';
}

export function dailyReason(profile: DailySuggestionProfile): string {
  return profile.compatibility?.reason_text?.trim() || profile.reason_text?.trim()
    || 'پروفایل پیشنهادی برای آشنایی';
}

// Read-only polling: never requests generation. A focus/foreground session has a
// bounded retry budget; hidden/unmounted screens discard in-flight responses.
export class DailySuggestionsLoader {
  private version = 0;
  private active = false;
  private pollCount = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly load: () => Promise<DailySuggestionsResponse>,
    private readonly publish: (update: (state: DailySuggestionsState) => DailySuggestionsState) => void,
  ) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    this.pollCount = 0;
    void this.fetch();
  }

  stop(): void {
    this.active = false;
    this.version++;
    clearTimeout(this.timer);
  }

  retry(): void {
    if (!this.active) return;
    clearTimeout(this.timer);
    this.pollCount = 0;
    void this.fetch();
  }

  private async fetch(): Promise<void> {
    const version = ++this.version;
    this.publish(state => ({ ...state, loading: true, error: null }));
    try {
      const response = await this.load();
      if (!this.active || version !== this.version) return;
      this.publish(() => ({
        profiles: response.data,
        meta: response.meta,
        loading: false,
        restricted: response.meta.status === 'restricted',
        error: response.meta.status === 'failed' ? 'آماده‌سازی پیشنهادها انجام نشد. دوباره تلاش کن.' : null,
      }));
      if (dailyIsPending(response.meta) && this.pollCount < DAILY_POLL_DELAYS.length) {
        this.timer = setTimeout(() => { void this.fetch(); }, DAILY_POLL_DELAYS[this.pollCount++]);
      }
    } catch (error) {
      if (!this.active || version !== this.version) return;
      const status = (error as { status?: number })?.status;
      this.publish(state => ({
        ...state, loading: false, restricted: status === 403,
        error: status === 403 ? null : 'دریافت پیشنهادهای امروز انجام نشد. دوباره تلاش کن.',
      }));
      // Network/server failures wait for an explicit retry, not an infinite loop.
    }
  }
}
