import { describe, it, expect, beforeEach } from 'vitest';
import {
    registerProvenance,
    recordSuccess,
    clearProvenance,
} from '../../src/services/provenance';
import { buildSnapshot, toCsv, toJson } from '../../src/services/export';

beforeEach(() => {
    clearProvenance();
    registerProvenance({
        id: 'co2', label: 'CO₂', unit: 'ppm',
        source: 'global-warming.org', originalSource: 'NOAA GML',
        url: 'https://global-warming.org/api/co2-api',
        cadence: 'daily', staleAfterMs: 2 * 24 * 60 * 60 * 1000,
    });
    registerProvenance({
        id: 'kp', label: 'Planetary Kp index', unit: '0-9',
        source: 'NOAA SWPC',
        url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
        cadence: '3h', staleAfterMs: 6 * 60 * 60 * 1000,
    });
    recordSuccess('co2', 421.3, 120, Date.UTC(2026, 3, 16, 12));
    recordSuccess('kp', 4, 80, Date.UTC(2026, 3, 16, 12));
});

describe('export · buildSnapshot', () => {
    it('emits a schemaVersion=1 payload with ISO timestamp', () => {
        const s = buildSnapshot(new Date(Date.UTC(2026, 3, 16, 12)));
        expect(s.schemaVersion).toBe(1);
        expect(s.generatedAt).toBe('2026-04-16T12:00:00.000Z');
        expect(s.source).toBe('planetearth.live');
        expect(s.records.length).toBe(2);
        expect(s.attribution).toMatch(/agencies/i);
    });
});

describe('export · toJson', () => {
    it('round-trips through JSON.parse unchanged', () => {
        const snap = buildSnapshot(new Date(Date.UTC(2026, 3, 16, 12)));
        const s = toJson(snap);
        const parsed = JSON.parse(s);
        expect(parsed.schemaVersion).toBe(1);
        expect(parsed.records.length).toBe(2);
        expect(parsed.records[0].id).toBeDefined();
    });

    it('produces human-readable indentation', () => {
        const snap = buildSnapshot();
        const s = toJson(snap);
        expect(s).toContain('\n  "schemaVersion"');
    });
});

describe('export · toCsv', () => {
    it('emits header rows and data rows with stable column order', () => {
        const snap = buildSnapshot(new Date(Date.UTC(2026, 3, 16, 12)));
        const csv = toCsv(snap);
        const lines = csv.trimEnd().split('\n');
        expect(lines[0]).toMatch(/^# planetearth\.live snapshot · schemaVersion=1/);
        expect(lines[1]).toMatch(/^# /);
        expect(lines[2]).toBe('id,label,value,unit,source,originalSource,url,cadence,status,fetchedAt,latencyMs,reason');
        expect(lines.length).toBeGreaterThanOrEqual(4);
    });

    it('quotes cells containing commas', () => {
        clearProvenance();
        registerProvenance({
            id: 'multi', label: 'value, with, commas', unit: 'x',
            source: 's', url: 'https://example.com', cadence: 'daily', staleAfterMs: 1000,
        });
        const snap = buildSnapshot();
        const csv = toCsv(snap);
        expect(csv).toContain('"value, with, commas"');
    });

    it('escapes quotes by doubling them', () => {
        clearProvenance();
        registerProvenance({
            id: 'q', label: 'he said "hi"', unit: 'x',
            source: 's', url: 'https://example.com', cadence: 'daily', staleAfterMs: 1000,
        });
        const snap = buildSnapshot();
        const csv = toCsv(snap);
        expect(csv).toContain('"he said ""hi"""');
    });
});
