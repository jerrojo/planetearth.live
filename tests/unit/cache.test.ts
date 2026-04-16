import { describe, it, expect, beforeEach } from 'vitest';
import { cacheMetric, loadFallback, clearCache, _primeMemoryForTest } from '../../src/services/cache';

beforeEach(async () => {
    await clearCache();
    try { localStorage.clear(); } catch { /* ignore */ }
});

describe('cache · loadFallback', () => {
    it('returns null when nothing is cached', async () => {
        const r = await loadFallback('unknown.id', 60_000);
        expect(r).toBeNull();
    });

    it('returns a memory-primed value that is within TTL', async () => {
        _primeMemoryForTest({ id: 'x', value: 42, fetchedAt: Date.now() });
        const r = await loadFallback('x', 60_000);
        expect(r?.value).toBe(42);
    });

    it('rejects a cached value older than TTL', async () => {
        _primeMemoryForTest({ id: 'stale', value: 1, fetchedAt: Date.now() - 120_000 });
        const r = await loadFallback('stale', 60_000);
        expect(r).toBeNull();
    });

    it('promotes a localStorage-only entry back into memory on hit', async () => {
        // Write directly to LS to simulate a prior session.
        localStorage.setItem(
            'pel:cache:ls-only',
            JSON.stringify({ id: 'ls-only', value: 7, fetchedAt: Date.now() }),
        );
        const r = await loadFallback('ls-only', 60_000);
        expect(r?.value).toBe(7);

        // After the first hit, the value is in memory — a second call should
        // resolve synchronously against the in-memory map.
        const again = await loadFallback('ls-only', 60_000);
        expect(again?.value).toBe(7);
    });

    it('cacheMetric writes to memory + localStorage, readable back', async () => {
        await cacheMetric('co2', 421.3);
        const r = await loadFallback('co2', 60_000);
        expect(r?.value).toBeCloseTo(421.3, 4);
    });

    it('clearCache removes prior state', async () => {
        await cacheMetric('co2', 421.3);
        await clearCache();
        const r = await loadFallback('co2', 60_000);
        expect(r).toBeNull();
    });

    it('ignores malformed localStorage entries (recovery, not crash)', async () => {
        localStorage.setItem('pel:cache:bad', 'not-json{');
        const r = await loadFallback('bad', 60_000);
        expect(r).toBeNull();
    });
});
