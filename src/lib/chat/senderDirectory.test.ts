import { describe, expect, it, vi } from 'vitest';
import type { MessageSender } from '@/lib/api/chat';
import { SenderDirectory, senderPhotoUrl } from './senderDirectory';

const sender = (id: number): MessageSender => ({ id, username: 'sara', first_name: 'Sara', last_name: null, profile_photo: null });

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
  });
});
