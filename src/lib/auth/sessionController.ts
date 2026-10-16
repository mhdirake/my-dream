import type { Session } from './storage';

const refreshes = new Map<string, Promise<Session>>();

export async function refreshAuthenticatedIdentity<T extends { id: number }>(
  controller: SessionController,
  getIdentity: (token: string) => Promise<T>,
  changed: (user: T) => void,
): Promise<void> {
  const version = controller.version;
  const active = await controller.refresh();
  if (!active || controller.version !== version) return;
  const user = await getIdentity(active.accessToken);
  if (controller.version !== version || !controller.session) return;
  const acceptedVersion = controller.session.userId === user.id ? version : version + 1;
  if (controller.session.userId !== user.id) await controller.replace({ ...controller.session, userId: user.id });
  if (controller.version === acceptedVersion && controller.session?.userId === user.id) changed(user);
}

export class SessionController {
  private current: Session | null = null;
  private generation = 0;
  private pending: { generation: number; promise: Promise<Session | null> } | null = null;
  private writes: Promise<void> = Promise.resolve();
  private previousTokens = new Set<string>();

  constructor(
    private readonly renew: (session: Session) => Promise<Session>,
    private readonly persist: (session: Session | null) => Promise<void>,
    private readonly changed: (session: Session | null) => void,
    private readonly invalidCredentials: (error: unknown) => boolean,
  ) {}

  get session(): Session | null { return this.current; }
  get version(): number { return this.generation; }

  private save(session: Session | null): Promise<void> {
    const generation = this.generation;
    this.writes = this.writes.catch(() => {}).then(async () => {
      if (generation === this.generation) await this.persist(session);
    });
    return this.writes;
  }

  async replace(session: Session | null): Promise<void> {
    this.generation++;
    this.previousTokens.clear();
    this.current = session;
    this.changed(session);
    await this.save(session);
  }

  owns(token: string): boolean {
    return !!this.current && (this.current.accessToken === token || this.previousTokens.has(token));
  }

  async accessToken(token: string, forceRefresh = false): Promise<string | undefined> {
    if (!this.owns(token)) return undefined;
    const current = this.current!;
    const needsRefresh = Date.now() >= current.expiresAt - (current.backendManaged ? 0 : 30_000)
      || (forceRefresh && token === current.accessToken);
    const active = needsRefresh ? await this.refresh() : current;
    if (!this.owns(token)) return undefined;
    return active?.accessToken;
  }

  refresh(): Promise<Session | null> {
    const session = this.current;
    if (!session) return Promise.resolve(null);
    const generation = this.generation;
    if (this.pending?.generation === generation) return this.pending.promise;

    let network = refreshes.get(session.refreshToken);
    if (!network) {
      network = this.renew(session);
      refreshes.set(session.refreshToken, network);
      const cleanup = () => {
        if (refreshes.get(session.refreshToken) === network) refreshes.delete(session.refreshToken);
      };
      network.then(cleanup, cleanup);
    }

    let promise!: Promise<Session | null>;
    promise = (async () => {
      try {
        const next = await network;
        if (generation !== this.generation) return this.current;
        this.previousTokens.add(session.accessToken);
        if (this.previousTokens.size > 8) this.previousTokens.delete(this.previousTokens.values().next().value!);
        this.current = next;
        this.changed(next);
        await this.save(next);
        return this.current;
      } catch (error) {
        if (generation === this.generation && this.invalidCredentials(error)) await this.replace(null);
        throw error;
      } finally {
        if (this.pending?.promise === promise) this.pending = null;
      }
    })();
    this.pending = { generation, promise };
    return promise;
  }
}
