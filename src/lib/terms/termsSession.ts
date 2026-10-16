import { hasOfflineAcceptance, type TermsDocument, type TermsStatus } from '../termsPolicy';

export type TermsCache = { status: TermsStatus; document: TermsDocument | null };
export type TermsSessionState = {
  identity: string | null;
  phase: 'checking' | 'allowed' | 'required' | 'error';
  document: TermsDocument | null;
  busy: boolean;
  acceptError: boolean;
};
type Dependencies = {
  load: (key: string) => Promise<string | null>;
  save: (key: string, value: string) => Promise<void>;
  status: (token: string) => Promise<TermsStatus>;
  current: () => Promise<TermsDocument | null>;
  accept: (token: string, version: number) => Promise<TermsStatus>;
};

/** Account-scoped gate. Checking is not evidence that acceptance is required. */
export class TermsSessionController {
  private state: TermsSessionState = { identity: null, phase: 'checking', document: null, busy: false, acceptError: false };
  private listeners = new Set<() => void>();
  private token: string | undefined;
  private key: string | null = null;
  private cache: TermsCache | null = null;
  private hydrated = false;
  private required = false;
  private epoch = 0;
  private inFlight: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();

  constructor(private deps: Dependencies) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<TermsSessionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  cancel = () => { this.epoch++; this.inFlight = null; };

  async connect(identity: string | null, token: string | undefined, key: string | null) {
    const changed = identity !== this.state.identity;
    this.cancel();
    const epoch = this.epoch;
    this.token = token;
    this.key = key;
    if (this.state.busy) this.update({ busy: false });
    if (changed) {
      this.cache = null; this.hydrated = false; this.required = false;
      this.update({ identity, phase: 'checking', document: null, busy: false, acceptError: false });
    }
    if (!token || !identity) return;
    if (!this.hydrated) {
      try {
        // Finish acceptance/invalidation writes before rehydrating this account.
        await this.writes;
        const raw = key ? await this.deps.load(key) : null;
        if (epoch !== this.epoch) return;
        const parsed = raw ? JSON.parse(raw) as TermsCache : null;
        this.cache = parsed?.status && typeof parsed.status.terms_accepted === 'boolean' ? parsed : null;
      } catch { if (epoch === this.epoch) this.cache = null; }
      if (epoch !== this.epoch) return;
      this.hydrated = true;
      this.required = !!this.cache && !hasOfflineAcceptance(this.cache.status);
      if (hasOfflineAcceptance(this.cache?.status ?? null)) this.update({ phase: 'allowed' });
    }
    // Token rotation for this account must not reset a known acceptance.
    await this.refresh();
  }

  private persist(value: TermsCache): Promise<void> {
    this.cache = value;
    const key = this.key;
    if (!key) return Promise.resolve();
    const write = this.writes.then(() => this.deps.save(key, JSON.stringify(value)));
    // Storage failure cannot override a successful live status response.
    this.writes = write.catch(() => {});
    return this.writes;
  }

  refresh = (): Promise<void> => {
    if (!this.token || !this.hydrated || this.state.busy) return Promise.resolve();
    if (this.inFlight) return this.inFlight;
    const epoch = this.epoch, token = this.token;
    const run = async () => {
      try {
        const status = await this.deps.status(token);
        if (epoch !== this.epoch) return;
        this.required = !status.terms_accepted;
        const knownDocument = this.state.document?.id === status.current_version_id ? this.state.document : null;
        this.update({ phase: status.terms_accepted ? 'allowed' : 'required', document: status.terms_accepted ? null : knownDocument });
        await this.persist({ status, document: knownDocument });
        if (epoch !== this.epoch || status.terms_accepted) return;
        const document = await this.deps.current();
        if (epoch !== this.epoch) return;
        this.update({ document });
        await this.persist({ status, document });
      } catch {
        if (epoch !== this.epoch) return;
        const allowed = !this.required && hasOfflineAcceptance(this.cache?.status ?? null);
        this.update({ phase: allowed ? 'allowed' : this.required && this.state.document ? 'required' : 'error' });
      } finally { if (epoch === this.epoch) this.inFlight = null; }
    };
    this.inFlight = run();
    return this.inFlight;
  };

  require = async (requestToken?: string) => {
    if (!this.token || requestToken !== this.token) return;
    this.cancel();
    this.hydrated = true; this.required = true;
    this.update({ phase: 'required', document: null, busy: false });
    void this.persist({ status: this.cache
      ? { ...this.cache.status, terms_accepted: false }
      : { terms_accepted: false, current_version_id: null, accepted_version_id: null, accepted_at: null }, document: null });
    await this.refresh();
  };

  accept = async () => {
    const { document, busy, phase } = this.state;
    if (!document || !this.token || busy || phase !== 'required') return;
    this.cancel();
    const epoch = this.epoch, token = this.token;
    this.update({ busy: true, acceptError: false });
    try {
      const status = await this.deps.accept(token, document.id);
      if (epoch !== this.epoch) return;
      this.required = !status.terms_accepted;
      this.update({ phase: status.terms_accepted ? 'allowed' : 'required' });
      await this.persist({ status, document });
    } catch {
      if (epoch !== this.epoch) return;
      this.update({ busy: false, acceptError: true });
      await this.refresh();
    } finally { if (epoch === this.epoch) this.update({ busy: false }); }
  };
}
