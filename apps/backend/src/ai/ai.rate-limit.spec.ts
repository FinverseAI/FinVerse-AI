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
});
