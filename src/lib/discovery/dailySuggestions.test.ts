import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailySuggestionProfile, DailySuggestionStatus } from '../api/discover';
import {
  DAILY_POLL_DELAYS, DailySuggestionsLoader, dailyIsPending, dailyReason,
  emptyDailyState, type DailySuggestionsResponse,
} from './dailySuggestions';

function response(status: DailySuggestionStatus, ids: number[] = []): DailySuggestionsResponse {
  return {
    data: ids.map(id => ({ id } as DailySuggestionProfile)),
    meta: { plan: 'basic', daily_limit: 3, generated_count: ids.length, remaining_today: 0,
      day: '2026-10-22', status, count: ids.length, tier: 'basic', limit: 3 },
  };
}

function setup(load = vi.fn<() => Promise<DailySuggestionsResponse>>().mockResolvedValue(response('ready', [1, 2, 3]))) {
  let state = emptyDailyState();
  const publish = vi.fn(update => { state = update(state); });
  return { loader: new DailySuggestionsLoader(load, publish), load, publish, state: () => state };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('daily read-only loader', () => {
  it('reads ready results once, with stable order and no repeated polling', async () => {
    const context = setup();
    context.loader.start();
    await vi.runAllTimersAsync();
    expect(context.load).toHaveBeenCalledTimes(1);
    expect(context.state().profiles.map(p => p.id)).toEqual([1, 2, 3]);
    expect(context.state().loading).toBe(false);
    expect(context.state().error).toBeNull();
  });

  it.each(['ready_partial', 'empty'] as const)('does not refill %s results', async status => {
    const context = setup(vi.fn().mockResolvedValue(response(status, status === 'empty' ? [] : [1])));
    context.loader.start();
    await vi.runAllTimersAsync();
    expect(context.load).toHaveBeenCalledTimes(1);
    expect(context.state().meta?.status).toBe(status);
  });

  it('polls queued and processing results until ready without creating jobs', async () => {
    const load = vi.fn().mockResolvedValueOnce(response('queued'))
      .mockResolvedValueOnce(response('processing')).mockResolvedValue(response('ready', [8]));
    const context = setup(load);
    context.loader.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(dailyIsPending(context.state().meta)).toBe(true);
    await vi.runAllTimersAsync();
    expect(load).toHaveBeenCalledTimes(3);
    expect(context.state().profiles.map(p => p.id)).toEqual([8]);
  });

  it('bounds processing polls and permits a deliberate retry after the budget', async () => {
    const context = setup(vi.fn().mockResolvedValue(response('processing')));
    context.loader.start();
    await vi.runAllTimersAsync();
    expect(context.load).toHaveBeenCalledTimes(DAILY_POLL_DELAYS.length + 1);
    expect(context.state().meta?.status).toBe('processing');
    context.load.mockResolvedValue(response('ready', [3]));
    context.loader.retry();
    await vi.runAllTimersAsync();
    expect(context.state().profiles.map(p => p.id)).toEqual([3]);
  });

  it('does not infinitely retry HTTP/network failures', async () => {
    const context = setup(vi.fn().mockRejectedValue(new Error('offline')));
    context.loader.start();
    await vi.runAllTimersAsync();
    expect(context.load).toHaveBeenCalledTimes(1);
    expect(context.state().error).toContain('دریافت پیشنهادهای امروز');
    context.load.mockResolvedValue(response('ready', [4]));
    context.loader.retry();
    await vi.runAllTimersAsync();
    expect(context.state().error).toBeNull();
    expect(context.state().profiles[0].id).toBe(4);
  });

  it.each(['failed', 'restricted'] as const)('does not poll a %s batch', async status => {
    const context = setup(vi.fn().mockResolvedValue(response(status)));
    context.loader.start();
    await vi.runAllTimersAsync();
    expect(context.load).toHaveBeenCalledTimes(1);
    expect(context.state().restricted).toBe(status === 'restricted');
    expect(!!context.state().error).toBe(status === 'failed');
  });

  it('shows restricted access for a forbidden request instead of an empty batch', async () => {
    const context = setup(vi.fn().mockRejectedValue({ status: 403 }));
    context.loader.start();
    await vi.runAllTimersAsync();
    expect(context.state().restricted).toBe(true);
    expect(context.state().error).toBeNull();
  });

  it('cancels scheduled polls when leaving the page or moving to background', async () => {
    const context = setup(vi.fn().mockResolvedValue(response('processing')));
    context.loader.start();
    await vi.advanceTimersByTimeAsync(0);
    context.loader.stop();
    await vi.runAllTimersAsync();
    expect(context.load).toHaveBeenCalledTimes(1);
    context.loader.retry();
    expect(context.load).toHaveBeenCalledTimes(1);
  });

  it('discards a late response after logout/blur and resumes with one new read', async () => {
    let resolve!: (value: DailySuggestionsResponse) => void;
    const context = setup(vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockResolvedValue(response('ready', [2])));
    context.loader.start();
    context.loader.stop();
    resolve(response('ready', [1]));
    await vi.advanceTimersByTimeAsync(0);
    expect(context.state().profiles).toEqual([]);
    context.loader.start();
    context.loader.start();
    await vi.runAllTimersAsync();
    expect(context.load).toHaveBeenCalledTimes(2);
    expect(context.state().profiles.map(p => p.id)).toEqual([2]);
  });

  it('does not let an older response replace a more recent explicit read', async () => {
    let resolve!: (value: DailySuggestionsResponse) => void;
    const context = setup(vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockResolvedValue(response('ready', [2])));
    context.loader.start();
    context.loader.retry();
    await vi.advanceTimersByTimeAsync(0);
    resolve(response('ready', [1]));
    await vi.runAllTimersAsync();
    expect(context.state().profiles.map(p => p.id)).toEqual([2]);
  });
});

describe('daily presentation permissions', () => {
  it('uses factual server text and falls back to a neutral reason', () => {
    expect(dailyReason({ reason_text: 'هدف رابطه شما نزدیک است.' } as DailySuggestionProfile)).toBe('هدف رابطه شما نزدیک است.');
    expect(dailyReason({ compatibility: { reason_text: 'شرایط اولیه نزدیک است.' } } as DailySuggestionProfile)).toBe('شرایط اولیه نزدیک است.');
    expect(dailyReason({} as DailySuggestionProfile)).toBe('پروفایل پیشنهادی برای آشنایی');
  });
});
