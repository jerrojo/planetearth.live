import { describe, it, expect, beforeEach } from 'vitest';
import {
    registerProvenance,
    registerDefaultProvenance,
    recordSuccess,
    recordInvalid,
    recordFailure,
    snapshotProvenance,
    refreshStaleness,
    clearProvenance,
    provenanceSummary,
    getProvenance,
} from '../../src/services/provenance';

const sample = {
    id: 'test.metric',
    label: 'Test metric',
    unit: 'unit',
    source: 'Agency X',
    originalSource: 'Agency X primary',
    url: 'https://example.com/api/metric',
    cadence: 'daily',
    staleAfterMs: 1_000, // 1s so tests can flip state synchronously
};

beforeEach(() => {
    clearProvenance();
});

describe('provenance registry', () => {
    it('starts empty and exposes a zeroed summary', () => {
        const s = provenanceSummary();
        expect(s.total).toBe(0);
        expect(s.ok).toBe(0);
        expect(s.pending).toBe(0);
    });

    it('registerProvenance sets status=pending by default', () => {
        registerProvenance(sample);
        const r = getProvenance('test.metric');
        expect(r).toBeDefined();
        expect(r?.status).toBe('pending');
        expect(r?.value).toBeNull();
        expect(r?.fetchedAt).toBeNull();
    });

    it('recordSuccess flips status to ok and stores value + latency', () => {
        registerProvenance(sample);
        recordSuccess('test.metric', 42, 123);
        const r = getProvenance('test.metric');
        expect(r?.status).toBe('ok');
        expect(r?.value).toBe(42);
        expect(r?.latencyMs).toBe(123);
        expect(r?.reason).toBeUndefined();
    });

    it('recordInvalid sets status=invalid with a reason', () => {
        registerProvenance(sample);
        recordInvalid('test.metric', 'out of bounds', 200);
        const r = getProvenance('test.metric');
        expect(r?.status).toBe('invalid');
        expect(r?.reason).toBe('out of bounds');
        expect(r?.latencyMs).toBe(200);
    });

    it('recordFailure sets status=offline', () => {
        registerProvenance(sample);
        recordFailure('test.metric', 'timeout after 5s');
        const r = getProvenance('test.metric');
        expect(r?.status).toBe('offline');
        expect(r?.reason).toBe('timeout after 5s');
    });

    it('refreshStaleness demotes ok → stale once past staleAfterMs', () => {
        registerProvenance(sample);
        const now = 1_000_000_000_000;
        recordSuccess('test.metric', 1, 10, now);
        refreshStaleness(now + 500); // inside window
        expect(getProvenance('test.metric')?.status).toBe('ok');
        refreshStaleness(now + 5_000); // past window
        expect(getProvenance('test.metric')?.status).toBe('stale');
    });

    it('provenanceSummary counts per status correctly', () => {
        registerProvenance({ ...sample, id: 'a' });
        registerProvenance({ ...sample, id: 'b' });
        registerProvenance({ ...sample, id: 'c' });
        recordSuccess('a', 1, 10);
        recordInvalid('b', 'bad');
        // 'c' stays pending
        const s = provenanceSummary();
        expect(s.total).toBe(3);
        expect(s.ok).toBe(1);
        expect(s.invalid).toBe(1);
        expect(s.pending).toBe(1);
    });

    it('snapshotProvenance returns records sorted by id', () => {
        registerProvenance({ ...sample, id: 'zzz' });
        registerProvenance({ ...sample, id: 'aaa' });
        registerProvenance({ ...sample, id: 'mmm' });
        const snap = snapshotProvenance();
        expect(snap.map((r) => r.id)).toEqual(['aaa', 'mmm', 'zzz']);
    });
});

describe('default provenance registry', () => {
    it('registers every documented live metric', () => {
        registerDefaultProvenance();
        const ids = snapshotProvenance().map((r) => r.id);
        // Spot-check the important ones — if any of these drop, the UI's
        // data-status panel silently loses a row, which we want to catch.
        expect(ids).toEqual(
            expect.arrayContaining([
                'co2', 'temperature', 'methane', 'nitrous', 'arcticIce',
                'kpIndex', 'pm25', 'seaLevelNYC', 'carbonIntensity',
                'earthquakes', 'seaLevelGlobal', 'globalTempAvg',
                'forestLossHa', 'openAq', 'uvIndex', 'gbifRecentCount',
            ]),
        );
    });

    it('every default record carries a valid URL and unit', () => {
        registerDefaultProvenance();
        const records = snapshotProvenance();
        for (const r of records) {
            expect(r.url, `${r.id} url`).toMatch(/^https:\/\//);
            expect(r.unit.length, `${r.id} unit`).toBeGreaterThan(0);
            expect(r.cadence.length, `${r.id} cadence`).toBeGreaterThan(0);
            expect(r.staleAfterMs, `${r.id} staleAfterMs`).toBeGreaterThan(0);
        }
    });
});
