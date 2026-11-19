import { AiResponseCache } from './ai.cache';

describe('AiResponseCache', () => {
  it('returns a stored value inside the TTL and expires it after', () => {
    const cache = new AiResponseCache<string>(60_000, 10);
    cache.set('key', 'value', 1_000);
    expect(cache.get('key', 2_000)).toBe('value');
    expect(cache.get('key', 61_000)).toBeUndefined();
    // An expired entry is removed, not returned again.
    expect(cache.get('key', 62_000)).toBeUndefined();
  });

  it('evicts the oldest entry when full', () => {
    const cache = new AiResponseCache<string>(60_000, 2);
    cache.set('a', '1', 0);
    cache.set('b', '2', 0);
    cache.set('c', '3', 0);
    expect(cache.get('a', 1)).toBeUndefined();
    expect(cache.get('b', 1)).toBe('2');
    expect(cache.get('c', 1)).toBe('3');
  });

  it('refreshing a key does not count as a new entry', () => {
    const cache = new AiResponseCache<string>(60_000, 2);
    cache.set('a', '1', 0);
    cache.set('b', '2', 0);
    cache.set('a', '1b', 0);
    expect(cache.get('a', 1)).toBe('1b');
    expect(cache.get('b', 1)).toBe('2');
  });
});
