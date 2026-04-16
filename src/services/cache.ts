/**
 * Client-side cache for last-known-good metric values.
 *
 * Why
 * ───
 * Climate and space-weather APIs are public, unpaid services. They drop
 * offline. NSIDC had a 3-week outage in 2023; SWPC is down for GOES updates
 * every few weeks; and the UK Carbon Intensity API routinely 429s. When the
 * primary source is unreachable we'd rather show the user a clearly-labelled
 * stale value than blank the metric.
 *
 * This module caches each `{ id, value, fetchedAt }` triple and exposes a
 * `loadFallback(id, maxAgeMs)` that returns the cached value if it exists and
 * is still within a liberal TTL.
 *
 * Storage strategy (ordered by preference):
 *   1. IndexedDB ("planetearth-live" database, "metrics" object store).
 *   2. localStorage fallback (for browsers with IndexedDB disabled — rare,
 *      but private-browsing Firefox does this).
 *   3. In-memory only (if both fail — private tabs can block both).
 *
 * All operations are async. Failures are swallowed and logged — the cache is
 * advisory, never on the critical path.
 */

const DB_NAME = 'planetearth-live';
const DB_VERSION = 1;
const STORE = 'metrics';
const LS_PREFIX = 'pel:cache:';

const memoryStore = new Map<string, CachedMetric>();

export interface CachedMetric {
    id: string;
    value: number;
    fetchedAt: number;
}

/* ────────────────── IndexedDB primitives ────────────────── */

function openDb(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') return resolve(null);
        let req: IDBOpenDBRequest;
        try {
            req = indexedDB.open(DB_NAME, DB_VERSION);
        } catch {
            return resolve(null);
        }
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
    });
}

async function idbPut(rec: CachedMetric): Promise<boolean> {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(rec);
            tx.oncomplete = () => { db.close(); resolve(true); };
            tx.onerror = () => { db.close(); resolve(false); };
        } catch {
            db.close();
            resolve(false);
        }
    });
}

async function idbGet(id: string): Promise<CachedMetric | null> {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(id);
            req.onsuccess = () => {
                db.close();
                resolve((req.result as CachedMetric | undefined) ?? null);
            };
            req.onerror = () => { db.close(); resolve(null); };
        } catch {
            db.close();
            resolve(null);
        }
    });
}

/* ────────────────── localStorage fallback ────────────────── */

function lsPut(rec: CachedMetric): void {
    try {
        localStorage.setItem(LS_PREFIX + rec.id, JSON.stringify(rec));
    } catch {
        /* storage quota exceeded — ignore */
    }
}

function lsGet(id: string): CachedMetric | null {
    try {
        const raw = localStorage.getItem(LS_PREFIX + id);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedMetric;
        if (typeof parsed?.id === 'string' && typeof parsed?.value === 'number' && typeof parsed?.fetchedAt === 'number') {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

/* ────────────────── Public API ────────────────── */

/** Persist a fresh value. Writes to IndexedDB + localStorage + memory. */
export async function cacheMetric(id: string, value: number, fetchedAt = Date.now()): Promise<void> {
    const rec: CachedMetric = { id, value, fetchedAt };
    memoryStore.set(id, rec);
    lsPut(rec);
    await idbPut(rec);
}

/**
 * Try to load a previously-cached value for `id`, rejecting anything older
 * than `maxAgeMs`. Ordering: memory → localStorage → IndexedDB.
 */
export async function loadFallback(id: string, maxAgeMs: number): Promise<CachedMetric | null> {
    const now = Date.now();
    const mem = memoryStore.get(id);
    if (mem && now - mem.fetchedAt <= maxAgeMs) return mem;

    const ls = lsGet(id);
    if (ls && now - ls.fetchedAt <= maxAgeMs) {
        memoryStore.set(id, ls);
        return ls;
    }

    const idb = await idbGet(id);
    if (idb && now - idb.fetchedAt <= maxAgeMs) {
        memoryStore.set(id, idb);
        return idb;
    }

    return null;
}

/** Clear everything (useful for tests). Silent on failure. */
export async function clearCache(): Promise<void> {
    memoryStore.clear();
    try {
        const keys = Object.keys(localStorage);
        for (const k of keys) {
            if (k.startsWith(LS_PREFIX)) localStorage.removeItem(k);
        }
    } catch { /* ignore */ }
    const db = await openDb();
    if (!db) return;
    try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
    } catch {
        db.close();
    }
}

/** Seed the memory store directly. Used by tests and by `loadFallback` hits. */
export function _primeMemoryForTest(rec: CachedMetric): void {
    memoryStore.set(rec.id, rec);
}
