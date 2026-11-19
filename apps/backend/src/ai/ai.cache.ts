/**
 * A tiny in-memory cache for identical AI queries (latency, strategy doc
 * §4.3): asking the same question twice within a minute reuses the first
 * answer instead of paying for another model call. Entries expire after
 * the TTL, and the cache is capped so it cannot grow without bound. Keys
 * always include the user id — one user's answer is never served to
 * another.
 */
export class AiResponseCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }
}
