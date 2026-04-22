/**
 * LruCache unit tests
 *
 * Covers the internal LRU cache used by `MfeHandlerMF` to bound
 * `sourceTextCache` and `sharedDepTextCache`. The cache is not part of the
 * public API (exported only for these tests), but its eviction and recency
 * semantics are security- and correctness-relevant because an unbounded cache
 * would leak memory in long-running hosts.
 */

import { describe, it, expect } from 'vitest';
import { LruCache } from '../../../src/mfe/handler/mf-handler';

describe('LruCache', () => {
  describe('constructor validation', () => {
    it('throws RangeError for capacity 0', () => {
      expect(() => new LruCache<string, number>(0)).toThrow(RangeError);
    });

    it('throws RangeError for negative capacity', () => {
      expect(() => new LruCache<string, number>(-1)).toThrow(RangeError);
    });

    it('throws RangeError for NaN capacity', () => {
      expect(() => new LruCache<string, number>(NaN)).toThrow(RangeError);
    });

    it('throws RangeError for Infinity capacity', () => {
      expect(() => new LruCache<string, number>(Infinity)).toThrow(RangeError);
    });

    it('accepts a positive finite integer capacity', () => {
      expect(() => new LruCache<string, number>(1)).not.toThrow();
      expect(() => new LruCache<string, number>(256)).not.toThrow();
    });
  });

  describe('basic get/set/has/delete', () => {
    it('returns undefined for a missing key', () => {
      const cache = new LruCache<string, number>(3);
      expect(cache.get('missing')).toBeUndefined();
    });

    it('stores and retrieves a value', () => {
      const cache = new LruCache<string, number>(3);
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('has() reflects presence without mutating recency', () => {
      const cache = new LruCache<string, number>(2);
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('missing')).toBe(false);
      // `a` is still the oldest after has() — adding a third key evicts it
      cache.set('c', 3);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
    });

    it('delete() removes the entry and returns the Map-style boolean', () => {
      const cache = new LruCache<string, number>(3);
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.delete('a')).toBe(false);
    });
  });

  describe('capacity-triggered LRU eviction', () => {
    it('evicts the least-recently-inserted key when capacity is reached', () => {
      const cache = new LruCache<string, number>(2);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // capacity exceeded → evict oldest (`a`)
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
    });

    it('capacity of 1 keeps only the most recent entry', () => {
      const cache = new LruCache<string, number>(1);
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
    });
  });

  describe('recency reordering', () => {
    it('get() promotes the accessed entry to most-recently-used', () => {
      const cache = new LruCache<string, number>(2);
      cache.set('a', 1);
      cache.set('b', 2);
      // Touch `a` — it is now most recent; `b` becomes the LRU victim.
      cache.get('a');
      cache.set('c', 3);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
    });

    it('set() on an existing key updates the value AND promotes to most-recent', () => {
      const cache = new LruCache<string, number>(2);
      cache.set('a', 1);
      cache.set('b', 2);
      // Re-setting `a` should move it to most-recent AND update its value.
      cache.set('a', 99);
      cache.set('c', 3); // evicts the LRU — now `b`, not `a`
      expect(cache.get('a')).toBe(99);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
    });

    it('updating an existing key does NOT reduce current size below capacity', () => {
      const cache = new LruCache<string, number>(2);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('a', 99); // update — still 2 entries, no eviction
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(true);
    });
  });
});
