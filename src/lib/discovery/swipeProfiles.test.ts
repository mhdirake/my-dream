import { describe, expect, it, vi } from 'vitest';
import type { DiscoverProfile, SwipePoolMeta } from '../api/discover';
import { SwipeProfilesLoader, type SwipeProfilesState } from './swipeProfiles';

const meta = { daily_limit: 20, used_today: 0, remaining_today: 20, available: true, unlocks_at: null,
  tier: 'silver', filters_available: true } satisfies SwipePoolMeta;
const result = (id: number) => ({ data: [{ id }] as DiscoverProfile[], meta });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe('MD-050 swipe loading', () => {
  it('sends AND filter contract, preserving real empty results without broadening', async () => {
    const read = vi.fn().mockResolvedValue({ data: [], meta });
    const emit = vi.fn();
    const loader = new SwipeProfilesLoader(read, emit);
    const filters = { min_age: 25, max_age: 32, genders: ['female'] as 'female'[], province_id: 1, city_id: 2 };
    await loader.load(filters);
    expect(read).toHaveBeenCalledExactlyOnceWith(filters);
    expect(emit.mock.lastCall?.[0]).toMatchObject({ profiles: [], error: null, loading: false });
  });
  it('does not display cached unfiltered cards while applying a new filter', async () => {
    const emit = vi.fn();
    await new SwipeProfilesLoader(vi.fn().mockResolvedValue(result(2)), emit).load({ max_age: 32 });
    expect(emit.mock.calls[0][0]).toMatchObject({ profiles: [], loading: true });
  });
  it('discards late results after a newer filter or reset request', async () => {
    const old = deferred<ReturnType<typeof result>>();
    const read = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(result(2));
    const states: SwipeProfilesState[] = [];
    const loader = new SwipeProfilesLoader(read, state => states.push(state));
    const first = loader.load({ max_age: 25 });
    await loader.load();
    old.resolve(result(1));
    await first;
    expect(states.at(-1)?.profiles[0].id).toBe(2);
    expect(states.some(state => state.profiles[0]?.id === 1)).toBe(false);
  });
  it('discards late responses when blurred, backgrounded, or switched to a different identity', async () => {
    const pending = deferred<ReturnType<typeof result>>();
    const emit = vi.fn();
    const loader = new SwipeProfilesLoader(() => pending.promise, emit);
    const promise = loader.load({ min_age: 25 });
    loader.stop();
    pending.resolve(result(1));
    await promise;
    expect(emit).toHaveBeenCalledTimes(1);
  });
  it('a paid downgrade explicitly retries once without filters after server denial', async () => {
    const read = vi.fn().mockRejectedValueOnce({ status: 403, data: { code: 'DISCOVERY_FILTERS_SUBSCRIPTION_REQUIRED' } })
      .mockResolvedValueOnce({ ...result(2), meta: { ...meta, tier: 'basic', filters_available: false } });
    const emit = vi.fn();
    await new SwipeProfilesLoader(read, emit).load({ max_age: 32 });
    expect(read).toHaveBeenNthCalledWith(1, { max_age: 32 });
    expect(read).toHaveBeenNthCalledWith(2);
    expect(emit.mock.lastCall?.[0]).toMatchObject({ meta: { tier: 'basic' }, loading: false, error: null });
  });
  it('a Gold-to-Silver downgrade retries after Gold-only filter denial', async () => {
    const read = vi.fn().mockRejectedValueOnce({ status: 403, data: { code: 'GOLD_FILTERS_SUBSCRIPTION_REQUIRED' } })
      .mockResolvedValueOnce({ ...result(2), meta: { ...meta, tier: 'silver' } });
    const emit = vi.fn();
    await new SwipeProfilesLoader(read, emit).load({ verified_only: 1, min_age: 25 });
    expect(read).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenNthCalledWith(2);
    expect(emit.mock.lastCall?.[0]).toMatchObject({ meta: { tier: 'silver' }, error: null });
  });
  it.each([422, 500, 401, 503])('does not silently discard filters on an unrelated error %s', async status => {
    const error = Object.assign(new Error('خطای دریافت'), { status });
    const read = vi.fn().mockRejectedValue(error);
    const emit = vi.fn();
    await new SwipeProfilesLoader(read, emit).load({ min_age: 25 });
    expect(read).toHaveBeenCalledTimes(1);
    expect(emit.mock.lastCall?.[0]).toMatchObject({ error: 'خطای دریافت', profiles: [], loading: false });
  });
  it('stale denied response cannot trigger an unfiltered retry after filters changed', async () => {
    let reject!: (error: unknown) => void;
    const old = new Promise<ReturnType<typeof result>>((_, fail) => { reject = fail; });
    const read = vi.fn().mockReturnValueOnce(old).mockResolvedValueOnce(result(2));
    const loader = new SwipeProfilesLoader(read, vi.fn());
    const first = loader.load({ min_age: 25 });
    await loader.load({ min_age: 30 });
    reject({ status: 403, data: { code: 'DISCOVERY_FILTERS_SUBSCRIPTION_REQUIRED' } });
    await first;
    expect(read).toHaveBeenCalledTimes(2);
  });
});
