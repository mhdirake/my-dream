import { describe, expect, it, vi } from 'vitest';
import { TermsSessionController, type TermsCache } from './termsSession';

const accepted = { terms_accepted: true, current_version_id: 2, accepted_version_id: 2, accepted_at: '2026-10-01T00:00:00Z' };
const required = { ...accepted, terms_accepted: false, current_version_id: 3 };
const document = { id: 3, content: 'قوانین جدید', published_at: '2026-10-16T00:00:00Z' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function fixture(cache?: TermsCache) {
  const storage = new Map<string, string>();
  if (cache) storage.set('terms-status-1', JSON.stringify(cache));
  const deps = {
    load: vi.fn(async (key: string) => storage.get(key) ?? null),
    save: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    status: vi.fn(async (_token: string) => accepted),
    current: vi.fn(async () => document),
    accept: vi.fn(async (_token: string, _id: number) => ({ ...accepted, current_version_id: 3, accepted_version_id: 3 })),
  };
  const gate = new TermsSessionController(deps);
  const phases: string[] = [];
  gate.subscribe(() => { phases.push(gate.getSnapshot().phase); });
  return { gate, deps, storage, phases };
}
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe('account-scoped terms gate', () => {
  it('never presents laws while a first status check is pending', async () => {
    const { gate, deps, phases } = fixture();
    const response = deferred<typeof accepted>();
    deps.status.mockReturnValue(response.promise);
    const connected = gate.connect('1', 'a', 'terms-status-1');
    await tick();
    expect(gate.getSnapshot().phase).toBe('checking');
    response.resolve(accepted); await connected;
    expect(gate.getSnapshot().phase).toBe('allowed');
    expect(phases).not.toContain('required');
  });

  it('restores cached acceptance before the network completes on a page reload', async () => {
    const { gate, deps, phases } = fixture({ status: accepted, document: null });
    const response = deferred<typeof accepted>();
    deps.status.mockReturnValue(response.promise);
    const connected = gate.connect('1', 'a', 'terms-status-1');
    await tick();
    expect(gate.getSnapshot().phase).toBe('allowed');
    response.resolve(accepted); await connected;
    expect(phases).not.toContain('required');
  });

  it('does not reset an accepted account during token rotation', async () => {
    const { gate, deps, phases } = fixture();
    await gate.connect('1', 'a', 'terms-status-1');
    const response = deferred<typeof accepted>();
    deps.status.mockReturnValue(response.promise);
    phases.length = 0;
    const rotated = gate.connect('1', 'b', 'terms-status-1');
    expect(gate.getSnapshot().phase).toBe('allowed');
    expect(deps.load).toHaveBeenCalledTimes(1);
    response.resolve(accepted); await rotated;
    expect(phases.every(phase => phase === 'allowed')).toBe(true);
  });

  it('keeps acceptance during background/foreground checks and transient failure', async () => {
    const { gate, deps } = fixture();
    await gate.connect('1', 'a', 'terms-status-1');
    const response = deferred<typeof accepted>();
    deps.status.mockReturnValueOnce(response.promise);
    const check = gate.refresh();
    expect(gate.refresh()).toBe(check);
    expect(gate.getSnapshot().phase).toBe('allowed');
    response.resolve(accepted); await check;
    deps.status.mockRejectedValue(new Error('offline'));
    await gate.refresh();
    expect(gate.getSnapshot().phase).toBe('allowed');
  });

  it('does not reuse acceptance or an old pending response for another account', async () => {
    const { gate, deps } = fixture();
    await gate.connect('1', 'a', 'terms-status-1');
    const old = deferred<typeof accepted>(), next = deferred<typeof accepted>();
    deps.status.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const stale = gate.refresh();
    const switched = gate.connect('2', 'b', 'terms-status-2');
    await tick();
    expect(gate.getSnapshot()).toMatchObject({ identity: '2', phase: 'checking' });
    old.resolve(accepted); await stale;
    expect(gate.getSnapshot().phase).toBe('checking');
    next.resolve(required); await switched;
    expect(gate.getSnapshot()).toMatchObject({ identity: '2', phase: 'required' });
  });

  it('blocks a newly published version before its document finishes loading', async () => {
    const { gate, deps } = fixture({ status: accepted, document: null });
    const doc = deferred<typeof document>();
    deps.status.mockResolvedValue(required); deps.current.mockReturnValue(doc.promise);
    const connected = gate.connect('1', 'a', 'terms-status-1'); await tick();
    expect(gate.getSnapshot()).toMatchObject({ phase: 'required', document: null });
    doc.resolve(document); await connected;
    expect(gate.getSnapshot().document).toEqual(document);
  });

  it('never undoes an explicit requirement with a stale successful request', async () => {
    const { gate, deps, storage } = fixture();
    await gate.connect('1', 'a', 'terms-status-1');
    const stale = deferred<typeof accepted>();
    deps.status.mockReturnValueOnce(stale.promise).mockRejectedValue(new Error('offline'));
    const old = gate.refresh();
    await gate.require('a'); stale.resolve(accepted); await old;
    expect(gate.getSnapshot().phase).toBe('error');
    expect(JSON.parse(storage.get('terms-status-1')!).status.terms_accepted).toBe(false);
    await gate.connect('1', 'b', 'terms-status-1');
    expect(gate.getSnapshot().phase).not.toBe('allowed');
  });

  it('invalidates cached acceptance even if the requirement arrives during hydration', async () => {
    const { gate, deps, storage } = fixture({ status: accepted, document: null });
    const stored = deferred<string | null>();
    deps.load.mockReturnValue(stored.promise); deps.status.mockRejectedValue(new Error('offline'));
    const connected = gate.connect('1', 'a', 'terms-status-1'); await tick();
    await gate.require('a');
    stored.resolve(JSON.stringify({ status: accepted, document: null })); await connected;
    expect(gate.getSnapshot().phase).not.toBe('allowed');
    expect(JSON.parse(storage.get('terms-status-1')!).status.terms_accepted).toBe(false);
  });

  it('ignores terms events belonging to an old token or account', async () => {
    const { gate, deps } = fixture();
    await gate.connect('1', 'a', 'terms-status-1');
    await gate.require('old'); await gate.require(undefined);
    expect(gate.getSnapshot().phase).toBe('allowed');
    expect(deps.status).toHaveBeenCalledTimes(1);
  });

  it.each(['{bad json', '{}', '{"status":{"terms_accepted":"yes"}}'])('recovers from malformed cache: %s', async raw => {
    const { gate, storage } = fixture(); storage.set('terms-status-1', raw);
    await gate.connect('1', 'a', 'terms-status-1');
    expect(gate.getSnapshot().phase).toBe('allowed');
  });

  it('does not grant offline access without a valid cached acceptance', async () => {
    const { gate, deps } = fixture(); deps.status.mockRejectedValue(new Error('offline'));
    await gate.connect('1', 'a', 'terms-status-1');
    expect(gate.getSnapshot().phase).toBe('error');
  });

  it('does not reuse a cached acceptance for an outdated version while offline', async () => {
    const { gate, deps } = fixture({ status: { ...accepted, current_version_id: 3 }, document: null });
    deps.status.mockRejectedValue(new Error('offline'));
    await gate.connect('1', 'a', 'terms-status-1');
    expect(gate.getSnapshot().phase).toBe('error');
  });

  it('keeps the document mounted during routine checks while reading it', async () => {
    const { gate, deps } = fixture(); deps.status.mockResolvedValue(required);
    await gate.connect('1', 'a', 'terms-status-1');
    const doc = deferred<typeof document>(); deps.current.mockReturnValue(doc.promise);
    const check = gate.refresh(); await tick();
    expect(gate.getSnapshot().document).toEqual(document);
    doc.resolve(document); await check;
  });

  it('keeps live approval when persistent storage fails', async () => {
    const { gate, deps } = fixture(); deps.save.mockRejectedValue(new Error('storage blocked'));
    await gate.connect('1', 'a', 'terms-status-1');
    expect(gate.getSnapshot().phase).toBe('allowed');
  });

  it('accepts only the displayed current document and persists approval', async () => {
    const { gate, deps, storage } = fixture(); deps.status.mockResolvedValue(required);
    await gate.connect('1', 'a', 'terms-status-1'); await gate.accept();
    expect(deps.accept).toHaveBeenCalledWith('a', 3);
    expect(gate.getSnapshot()).toMatchObject({ phase: 'allowed', busy: false });
    expect(JSON.parse(storage.get('terms-status-1')!).status.accepted_version_id).toBe(3);
  });

  it('cannot accept without a required, loaded document', async () => {
    const { gate, deps } = fixture(); await gate.accept();
    await gate.connect('1', 'a', 'terms-status-1'); await gate.accept();
    expect(deps.accept).not.toHaveBeenCalled();
  });

  it('keeps rejection feedback and remains blocked when accepting fails', async () => {
    const { gate, deps } = fixture(); deps.status.mockResolvedValue(required);
    deps.accept.mockRejectedValue(new Error('new version published'));
    await gate.connect('1', 'a', 'terms-status-1'); await gate.accept();
    expect(gate.getSnapshot()).toMatchObject({ phase: 'required', busy: false, acceptError: true });
  });

  it('does not get stuck busy if the token rotates while acceptance is in flight', async () => {
    const { gate, deps } = fixture(); deps.status.mockResolvedValue(required);
    await gate.connect('1', 'a', 'terms-status-1');
    const pending = deferred<typeof accepted>(); deps.accept.mockReturnValue(pending.promise);
    const old = gate.accept(); await gate.connect('1', 'b', 'terms-status-1');
    pending.resolve(accepted); await old;
    expect(gate.getSnapshot()).toMatchObject({ phase: 'required', busy: false });
  });

  it('does not unlock the next account when the previous acceptance completes', async () => {
    const { gate, deps } = fixture(); deps.status.mockResolvedValue(required);
    await gate.connect('1', 'a', 'terms-status-1');
    const approval = deferred<typeof accepted>();
    deps.accept.mockReturnValue(approval.promise);
    const old = gate.accept();
    await gate.connect('2', 'b', 'terms-status-2'); approval.resolve(accepted); await old;
    expect(gate.getSnapshot()).toMatchObject({ identity: '2', phase: 'required', busy: false });
  });

  it('discards cancelled mount results and rechecks after StrictMode remount', async () => {
    const { gate, deps } = fixture(); const old = deferred<typeof accepted>();
    deps.status.mockReturnValueOnce(old.promise).mockResolvedValue(required);
    const first = gate.connect('1', 'a', 'terms-status-1'); await tick(); gate.cancel();
    await gate.connect('1', 'a', 'terms-status-1'); old.resolve(accepted); await first;
    expect(gate.getSnapshot().phase).toBe('required');
  });
});
