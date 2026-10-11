import type { MessageSender } from '@/lib/api/chat';
import { resolveMediaUrl } from '@/lib/api/media';

export function senderPhotoUrl(sender: MessageSender | null | undefined): string | null {
  const urls = sender?.profile_photo?.urls;
  return [urls?.thumbnail, urls?.small, urls?.medium, urls?.large, urls?.original]
    .map(value => resolveMediaUrl(value)).find(Boolean) ?? null;
}

export class SenderDirectory {
  readonly senders = new Map<number, MessageSender>();
  private pending = new Set<number>();
  private attempted = new Set<number>();

  constructor(private fetch: (ids: number[]) => Promise<MessageSender[]>, private changed: () => void) {}

  async resolve(ids: number[]) {
    const missing = [...new Set(ids)].filter(id => id > 0 && !this.pending.has(id) && !this.attempted.has(id));
    missing.forEach(id => { this.pending.add(id); this.attempted.add(id); });
    for (let start = 0; start < missing.length; start += 50) {
      const batch = missing.slice(start, start + 50);
      try {
        const senders = await this.fetch(batch);
        senders.filter(sender => batch.includes(sender.id)).forEach(sender => this.senders.set(sender.id, sender));
        this.changed();
      } catch {
        // A metadata error must not interrupt sending or displaying messages.
      } finally {
        batch.forEach(id => this.pending.delete(id));
      }
    }
  }
}
