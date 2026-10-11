import type { MessageSender } from '@/lib/api/chat';
import { resolveMediaUrl } from '@/lib/api/media';

export function senderPhotoUrl(sender: MessageSender | null | undefined): string | null {
  const urls = sender?.profile_photo?.urls;
  return [urls?.thumbnail, urls?.small, urls?.medium, urls?.large, urls?.original]
    .map(value => resolveMediaUrl(value)).find(Boolean) ?? null;
}

export function displayUserName(sender: Partial<MessageSender> | null | undefined, fallback = 'در حال دریافت نام…'): string {
  const names = [[sender?.first_name, sender?.last_name].filter(Boolean).join(' ').trim(), sender?.username?.trim()];
  return names.find(name => name && !/^[\d۰-۹٠-٩\s]+$/.test(name) && !/^کاربر\s+[\d۰-۹٠-٩]+$/.test(name)) ?? fallback;
}

const RETRY_DELAYS = [1000, 3000, 10000];

export class SenderDirectory {
  readonly senders = new Map<number, MessageSender>();
  private pending = new Set<number>();
  private attempts = new Map<number, number>();
  private retryAt = new Map<number, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(private fetch: (ids: number[]) => Promise<MessageSender[]>, private changed: () => void, readonly scope = '') {}

  setFetcher(fetch: (ids: number[]) => Promise<MessageSender[]>) { this.fetch = fetch; }

  start() { this.stopped = false; }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  retryUnresolved() {
    const unresolved = [...this.attempts.keys()].filter(id => !displayUserName(this.senders.get(id), ''));
    unresolved.forEach(id => { this.attempts.delete(id); this.retryAt.delete(id); });
    return this.resolve(unresolved);
  }

  async resolve(ids: number[]) {
    if (this.stopped) return;
    const missing = [...new Set(ids)].filter(id => id > 0 && !this.pending.has(id)
      && !displayUserName(this.senders.get(id), '')
      && (this.attempts.get(id) ?? 0) <= RETRY_DELAYS.length
      && (this.retryAt.get(id) ?? 0) <= Date.now());
    missing.forEach(id => { this.pending.add(id); this.attempts.set(id, (this.attempts.get(id) ?? 0) + 1); });
    for (let start = 0; start < missing.length; start += 50) {
      const batch = missing.slice(start, start + 50);
      try {
        const senders = await this.fetch(batch);
        if (this.stopped) return;
        senders.filter(sender => batch.includes(sender.id)).forEach(sender => this.senders.set(sender.id, sender));
        this.changed();
      } catch {
        // A metadata error must not interrupt sending or displaying messages.
      } finally {
        batch.forEach(id => {
          this.pending.delete(id);
          const delay = RETRY_DELAYS[(this.attempts.get(id) ?? 1) - 1];
          if (!displayUserName(this.senders.get(id), '') && delay !== undefined) this.retryAt.set(id, Date.now() + delay);
          else this.retryAt.delete(id);
        });
      }
    }
    if (!this.stopped && this.retryAt.size) {
      if (this.timer) clearTimeout(this.timer);
      const next = Math.min(...this.retryAt.values());
      this.timer = setTimeout(() => {
        this.timer = null;
        void this.resolve([...this.retryAt.keys()]);
      }, Math.max(0, next - Date.now()));
    }
  }
}
