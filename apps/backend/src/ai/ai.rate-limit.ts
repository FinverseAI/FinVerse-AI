/**
 * The AI rate limiter: 10 requests/minute per user by default.
 *
 * Two backends, chosen by environment (B52):
 *
 * - SHARED (Upstash Redis REST): when UPSTASH_REDIS_REST_URL and
 *   UPSTASH_REDIS_REST_TOKEN are both set, the counter is a
 *   fixed-window INCR in Upstash (plain fetch, no new dependency),
 *   keyed by user — so the limit holds across instances, cold starts,
 *   and concurrent requests. This is the backend that actually
 *   enforces the limit on serverless (Netlify) deployments.
 * - IN-MEMORY fallback: without those variables, the original
 *   single-process sliding-window Map. It is only correct while the
 *   backend runs as one long-lived process (Render); on Netlify each
 *   invocation can be a fresh instance with an empty Map, so the
 *   limit is vacuous there. Real enforcement needs the Upstash setup
 *   or the Render move — the fallback exists so local/dev and the
 *   single-process deploy keep working without new infrastructure.
 *
 * Upstash failures fail OPEN (the request is allowed): a Redis blip
 * must degrade to "unlimited" rather than 503 the whole AI surface.
 * The Redis call itself is capped at 2s so a slow store cannot stall
 * a request past the AI deadline.
 */

export interface AiRateLimiterOptions {
  upstashUrl?: string;
  upstashToken?: string;
  /** Injectable fetch (tests); defaults to the global fetch. */
  fetchFn?: typeof fetch;
}

/** Timeout for one Upstash REST round-trip. */
const UPSTASH_TIMEOUT_MS = 2_000;

export class AiRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly upstashUrl: string | undefined;
  private readonly upstashToken: string | undefined;
  private readonly fetchFn: typeof fetch;

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    options: AiRateLimiterOptions = {},
  ) {
    this.upstashUrl = options.upstashUrl?.trim() || undefined;
    this.upstashToken = options.upstashToken?.trim() || undefined;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  /** True when the shared (Upstash) limiter is configured. */
  get usesSharedLimiter(): boolean {
    return this.upstashUrl !== undefined && this.upstashToken !== undefined;
  }

  /**
   * Returns true and records the hit when the key is within its limit,
   * false when the window is full (the hit is not recorded).
   * In-memory sliding window only — use allowAsync for the configured
   * backend (shared when Upstash is set, this fallback otherwise).
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

  /**
   * The configured backend: shared Upstash fixed-window counter when
   * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
   * otherwise the in-memory fallback. Fail-open: any Upstash error,
   * non-OK response, or unparseable reply allows the request.
   */
  async allowAsync(key: string, now = Date.now()): Promise<boolean> {
    if (!this.usesSharedLimiter) return this.allow(key, now);
    try {
      const windowId = Math.floor(now / this.windowMs);
      const redisKey = `finverse:ratelimit:${encodeURIComponent(key)}:${windowId}`;
      const response = await this.fetchFn(
        `${this.upstashUrl as string}/pipeline`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.upstashToken as string}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            ['INCR', redisKey],
            ['EXPIRE', redisKey, Math.ceil(this.windowMs / 1000)],
          ]),
          signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
        },
      );
      if (!response.ok) return true;
      const data: unknown = await response.json();
      const count = pipelineFirstResult(data);
      if (typeof count !== 'number' || !Number.isFinite(count)) return true;
      return count <= this.maxRequests;
    } catch {
      return true;
    }
  }
}

/** The first result of an Upstash /pipeline reply: { result: [{ result: n }, …] }. */
function pipelineFirstResult(data: unknown): unknown {
  if (!data || typeof data !== 'object') return undefined;
  const results = (data as { result?: unknown }).result;
  if (!Array.isArray(results)) return undefined;
  const first = results[0];
  if (first !== null && typeof first === 'object') {
    return (first as { result?: unknown }).result;
  }
  return first;
}
