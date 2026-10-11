export const ALERT_Z_INDEX = 2147483000;

// Native modal windows are above the root window regardless of its z-index.
// Move alert content to the most recently opened visible modal window.
export class AlertLayers<T> {
  private hosts: string[] = [];
  private root: string | null = null;
  private listeners = new Set<() => void>();
  private snapshot: { host: string | null; entries: Map<string, T> } = { host: null, entries: new Map() };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = () => this.snapshot;

  register(id: string, root = false) {
    if (root) this.root = id;
    else this.hosts = [...this.hosts.filter(host => host !== id), id];
    this.publish();
    return () => {
      if (this.root === id) this.root = null;
      this.hosts = this.hosts.filter(host => host !== id);
      this.publish();
    };
  }

  set(id: string, content: T) {
    this.snapshot.entries = new Map(this.snapshot.entries).set(id, content);
    this.publish();
  }

  remove(id: string) {
    const entries = new Map(this.snapshot.entries);
    entries.delete(id);
    this.snapshot.entries = entries;
    this.publish();
  }

  private publish() {
    this.snapshot = { host: this.hosts.at(-1) ?? this.root, entries: this.snapshot.entries };
    this.listeners.forEach(listener => listener());
  }
}
