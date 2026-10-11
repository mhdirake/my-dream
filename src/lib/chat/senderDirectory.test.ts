import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MessageSender } from '@/lib/api/chat';
import { SenderDirectory, displayUserName, senderPhotoUrl } from './senderDirectory';

const sender = (id: number): MessageSender => ({ id, username: 'sara', first_name: 'Sara', last_name: null, profile_photo: null });
afterEach(() => { vi.useRealTimers(); });

describe('chat sender directory', () => {
  it('batches at most 50 identities and deduplicates subsequent messages', async () => {
    const fetch = vi.fn(async (ids: number[]) => ids.map(sender));
    const directory = new SenderDirectory(fetch, vi.fn());
    await directory.resolve(Array.from({ length: 105 }, (_, i) => i + 1));
    await directory.resolve([1, 2, 3]);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.map(([ids]) => ids.length)).toEqual([50, 50, 5]);
    expect(directory.senders.get(1)?.first_name).toBe('Sara');
  });

  it('resolves a nonempty photo variant rather than an empty thumbnail', () => {
    const user = sender(1);
    user.profile_photo = { urls: { thumbnail: '', small: '//cdn.example/sara.jpg', medium: '', large: '', original: '' } };
    expect(senderPhotoUrl(user)).toBe('https://cdn.example/sara.jpg');
    expect(senderPhotoUrl(sender(2))).toBeNull();
  });

  it('ignores identities not requested in the batch', async () => {
    const directory = new SenderDirectory(async () => [sender(99)], vi.fn());
    await directory.resolve([1]);
    expect(directory.senders.size).toBe(0);
    directory.stop();
  });

  it('never displays IDs or numeric placeholder names', () => {
    expect(displayUserName({ first_name: '', username: '۱۲۳' })).toBe('در حال دریافت نام…');
    expect(displayUserName({ first_name: 'کاربر 123' })).toBe('در حال دریافت نام…');
    expect(displayUserName({ first_name: ' Sara ', last_name: 'Ahmadi' })).toBe('Sara  Ahmadi');
    expect(displayUserName({ username: 'sara' })).toBe('sara');
  });

  it('retries transient failures then stops once the name is available', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce([sender(1)]);
    const directory = new SenderDirectory(fetch, vi.fn());
    await directory.resolve([1]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(directory.senders.get(1)?.first_name).toBe('Sara');
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(2);
    directory.stop();
  });

  it('bounds missing-name retries and allows a later focus retry', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => [] as MessageSender[]);
    const directory = new SenderDirectory(fetch, vi.fn());
    await directory.resolve([1]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(4);
    await directory.resolve([1]);
    expect(fetch).toHaveBeenCalledTimes(4);
    fetch.mockResolvedValueOnce([sender(1)]);
    await directory.retryUnresolved();
    expect(directory.senders.get(1)?.first_name).toBe('Sara');
    directory.stop();
  });

  it('cancels retries when leaving the account or conversation', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => [] as MessageSender[]);
    const directory = new SenderDirectory(fetch, vi.fn());
    await directory.resolve([1]);
    directory.stop();
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
