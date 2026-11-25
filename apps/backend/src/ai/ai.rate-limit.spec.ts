import { AiRateLimiter } from './ai.rate-limit';

describe('AiRateLimiter', () => {
  it('allows up to the limit, then blocks until the window slides', () => {
    const limiter = new AiRateLimiter(2, 60_000);
    expect(limiter.allow('user-1', 0)).toBe(true);
    expect(limiter.allow('user-1', 1_000)).toBe(true);
    expect(limiter.allow('user-1', 2_000)).toBe(false);
    // The first hit is now outside the window.
    expect(limiter.allow('user-1', 60_001)).toBe(true);
  });

  it('limits users independently', () => {
    const limiter = new AiRateLimiter(1, 60_000);
    expect(limiter.allow('user-1', 0)).toBe(true);
    expect(limiter.allow('user-2', 0)).toBe(true);
    expect(limiter.allow('user-1', 1)).toBe(false);
  });

  it('uses the in-memory fallback through allowAsync when Upstash is not configured', async () => {
    const limiter = new AiRateLimiter(1, 60_000);
    expect(limiter.usesSharedLimiter).toBe(false);
    expect(await limiter.allowAsync('user-1', 0)).toBe(true);
    expect(await limiter.allowAsync('user-1', 1)).toBe(false);
  });

  describe('shared Upstash limiter (B52)', () => {
    type FetchStub = (url: string, init: RequestInit) => Promise<unknown>;
    const upstash = (fetchFn: FetchStub) =>
      new AiRateLimiter(2, 60_000, {
        upstashUrl: 'https://example.upstash.io',
        upstashToken: 'token',
        fetchFn: fetchFn as unknown as typeof fetch,
      });

    it('counts in the shared store and blocks past the limit', async () => {
      let count = 0;
      const seenUrls: string[] = [];
      const seenBodies: unknown[] = [];
      const limiter = upstash(async (url: string, init: RequestInit) => {
        seenUrls.push(url);
        seenBodies.push(
          typeof init.body === 'string' ? JSON.parse(init.body) : null,
        );
        count += 1;
        return {
          ok: true,
          json: async () => ({ result: [{ result: count }, { result: 1 }] }),
        };
      });
      expect(limiter.usesSharedLimiter).toBe(true);
      expect(await limiter.allowAsync('user-1', 0)).toBe(true);
      expect(await limiter.allowAsync('user-1', 1_000)).toBe(true);
      expect(await limiter.allowAsync('user-1', 2_000)).toBe(false);
      // One key per user per window, via the pipeline endpoint.
      expect(seenUrls.every((url) => url.endsWith('/pipeline'))).toBe(true);
      expect(JSON.stringify(seenBodies[0])).toContain('user-1');
    });

    it('fails open when Upstash errors, answers non-OK, or replies unparseably', async () => {
      const throwing = upstash(async () => {
        throw new Error('network down');
      });
      expect(await throwing.allowAsync('user-1', 0)).toBe(true);
      const nonOk = upstash(async () => ({
        ok: false,
        json: async () => ({}),
      }));
      expect(await nonOk.allowAsync('user-1', 0)).toBe(true);
      const garbage = upstash(async () => ({
        ok: true,
        json: async () => ({ result: [{ result: 'not-a-number' }] }),
      }));
      expect(await garbage.allowAsync('user-1', 0)).toBe(true);
    });

    it('stays shared only when both Upstash variables are set', () => {
      expect(
        new AiRateLimiter(2, 60_000, { upstashUrl: 'https://x' })
          .usesSharedLimiter,
      ).toBe(false);
      expect(
        new AiRateLimiter(2, 60_000, { upstashToken: 't' }).usesSharedLimiter,
      ).toBe(false);
    });
  });
});
