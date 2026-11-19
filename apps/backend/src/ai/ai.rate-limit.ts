/**
 * A small in-memory sliding-window rate limiter, one window per key
 * (one per user). Enough for this phase: the AI endpoints are low-volume
 * and the backend runs as a single process on Render. Redis is declared
 * in docker-compose but unconnected; wiring it is a later-phase concern
 * if the backend ever scales past one process.
 */
export class AiRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Returns true and records the hit when the key is within its limit,
   * false when the window is full (the hit is not recorded).
   */
  allow(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );
    if (recent.length >= this.maxRequests) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
