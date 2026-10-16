import type { Session } from './storage';

type TokenLifetime = { expires_in?: number; session_expires_at?: string };

export function sessionDeadline(token: TokenLifetime, now = Date.now()): number {
  const deadline = token.session_expires_at ? Date.parse(token.session_expires_at) : NaN;
  return Number.isFinite(deadline) ? deadline : now + (token.expires_in ?? 300) * 1000;
}

// JS timers overflow above ~24.8 days. Check long sessions daily without an
// HTTP refresh; only the final deadline callback handles expiry/legacy renewal.
export function scheduleSessionDeadline(session: Session, expired: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    const remaining = session.expiresAt - Date.now() - (session.backendManaged ? 0 : 60_000);
    if (remaining <= 0) { expired(); return; }
    timer = setTimeout(schedule, Math.min(remaining, 86400000));
  };
  schedule();
  return () => clearTimeout(timer);
}
