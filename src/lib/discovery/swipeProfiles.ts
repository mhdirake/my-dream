import type { DiscoverProfile, SwipePoolMeta } from '../api/discover';
import type { DiscoveryFilters } from './filters';

export type SwipeProfilesState = {
  profiles: DiscoverProfile[];
  meta: SwipePoolMeta | null;
  loading: boolean;
  error: string | null;
};
export const emptySwipeState = (): SwipeProfilesState => ({ profiles: [], meta: null, loading: true, error: null });

/** Discards responses after blur, identity, tier, or applied-filter changes. */
export class SwipeProfilesLoader {
  private version = 0;
  constructor(
    private read: (filters?: DiscoveryFilters) => Promise<{ data: DiscoverProfile[]; meta: SwipePoolMeta }>,
    private emit: (state: SwipeProfilesState) => void,
  ) {}

  stop(): void { this.version++; }

  async load(filters?: DiscoveryFilters): Promise<void> {
    const version = ++this.version;
    this.emit(emptySwipeState());
    try {
      let response;
      try { response = await this.read(filters); }
      catch (error) {
        if (version !== this.version) return;
        const denied = error as { status?: number; data?: { code?: string } };
        if (!filters || denied.status !== 403
          || !['DISCOVERY_FILTERS_SUBSCRIPTION_REQUIRED', 'GOLD_FILTERS_SUBSCRIPTION_REQUIRED'].includes(denied.data?.code ?? '')) throw error;
        // Keep RAM selections, but never use them on a downgraded account.
        response = await this.read();
      }
      if (version !== this.version) return;
      this.emit({ profiles: response.data, meta: response.meta, loading: false, error: null });
    } catch (error) {
      if (version !== this.version) return;
      this.emit({ ...emptySwipeState(), loading: false,
        error: error instanceof Error ? error.message : 'دریافت افراد با مشکل مواجه شد. دوباره تلاش کن.' });
    }
  }
}
