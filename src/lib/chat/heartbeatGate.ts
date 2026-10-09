export class HeartbeatGate {
  private inFlight = false;
  private nextAllowedAt = 0;
  private backoffSeconds = 30;

  begin(now = Date.now()): boolean {
    if (this.inFlight || now < this.nextAllowedAt) return false;
    this.inFlight = true;
    this.nextAllowedAt = now + 30_000;
    return true;
  }

  success(): void { this.backoffSeconds = 30; }

  failure(status: number, retryAfterSeconds = 0, now = Date.now()): void {
    if (status === 401 || status === 403) this.nextAllowedAt = Infinity;
    else {
      this.nextAllowedAt = now + Math.max(this.backoffSeconds, retryAfterSeconds) * 1000;
      this.backoffSeconds = Math.min(this.backoffSeconds * 2, 120);
    }
  }

  finish(): void { this.inFlight = false; }
}
