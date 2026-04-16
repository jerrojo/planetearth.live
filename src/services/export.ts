/**
 * Snapshot export for the live dashboard.
 *
 * Public data is only useful if people can take it with them. This module
 * builds a reproducible snapshot of every metric (value, source, timestamp,
 * cadence, validation status) as CSV or JSON, downloadable with one click.
 *
 * The snapshot schema is stable — we version it with `schemaVersion: 1` so
 * external consumers can detect breaking changes. Adding columns is
 * non-breaking; renaming or removing requires bumping the version.
 */

import { snapshotProvenance, type ProvenanceRecord } from './provenance';

export interface SnapshotPayload {
    schemaVersion: 1;
    generatedAt: string;           // ISO 8601 in UTC
    source: 'planetearth.live';
    attribution: string;
    records: ProvenanceRecord[];
}

export function buildSnapshot(at = new Date()): SnapshotPayload {
    return {
        schemaVersion: 1,
        generatedAt: at.toISOString(),
        source: 'planetearth.live',
        attribution:
            'Data belongs to the originating agencies (NOAA, NASA, USGS, Copernicus, OpenAQ, GBIF, Global Forest Watch, National Grid ESO, GBIF, NSIDC). ' +
            'This snapshot is provided under the MIT-licensed planetearth.live project. Retain original attribution when redistributing.',
        records: snapshotProvenance(),
    };
}

export function toJson(snapshot: SnapshotPayload): string {
    return JSON.stringify(snapshot, null, 2);
}

const CSV_HEADERS = [
    'id', 'label', 'value', 'unit',
    'source', 'originalSource', 'url',
    'cadence', 'status', 'fetchedAt', 'latencyMs', 'reason',
];

function csvCell(v: unknown): string {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}

export function toCsv(snapshot: SnapshotPayload): string {
    const lines = [
        `# planetearth.live snapshot · schemaVersion=${snapshot.schemaVersion} · generated=${snapshot.generatedAt}`,
        `# ${snapshot.attribution}`,
        CSV_HEADERS.join(','),
    ];
    for (const r of snapshot.records) {
        lines.push([
            csvCell(r.id),
            csvCell(r.label),
            csvCell(r.value ?? ''),
            csvCell(r.unit),
            csvCell(r.source),
            csvCell(r.originalSource ?? ''),
            csvCell(r.url),
            csvCell(r.cadence),
            csvCell(r.status),
            csvCell(r.fetchedAt ? new Date(r.fetchedAt).toISOString() : ''),
            csvCell(r.latencyMs ?? ''),
            csvCell(r.reason ?? ''),
        ].join(','));
    }
    return lines.join('\n') + '\n';
}

/** Trigger a browser download. Browser-only — guarded so unit tests don't break. */
export function downloadSnapshot(format: 'csv' | 'json'): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const snap = buildSnapshot();
    const body = format === 'csv' ? toCsv(snap) : toJson(snap);
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = snap.generatedAt.replace(/[:T]/g, '-').replace(/\.\d+Z$/, 'Z');
    a.href = url;
    a.download = `planetearth-live-snapshot-${stamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
