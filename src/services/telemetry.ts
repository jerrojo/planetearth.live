/**
 * Lightweight, opt-out telemetry for API health.
 *
 * Philosophy
 * ──────────
 * planetearth.live collects no personal data. Ever. The only observability we
 * care about is whether public APIs are up or down, and how fast they are, so
 * we can update the data-source catalogue when an endpoint breaks.
 *
 * This module logs events to the console in dev mode and buffers them in
 * memory in prod. If the site owner wants to wire a real sink (like a
 * self-hosted Plausible or an RUM endpoint) they can subscribe with
 * `onEvent()` — NO endpoint is called from this file.
 *
 * See docs/PRIVACY.md for the full statement.
 */

export type TelemetryKind = 'fetch.ok' | 'fetch.error' | 'fetch.invalid' | 'fallback.hit';

export interface TelemetryEvent {
    kind: TelemetryKind;
    metric: string;
    latencyMs?: number;
    reason?: string;
    at: number;
}

const buffer: TelemetryEvent[] = [];
const MAX_BUFFER = 500;
type Listener = (ev: TelemetryEvent) => void;
const listeners = new Set<Listener>();

const isDev = (() => {
    // Vite sets import.meta.env.DEV; node/test env won't have it.
    try {
        const meta = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
        return !!meta?.DEV;
    } catch {
        return false;
    }
})();

function emit(kind: TelemetryKind, metric: string, extra?: { latencyMs?: number; reason?: string }): void {
    const ev: TelemetryEvent = { kind, metric, at: Date.now(), ...extra };
    buffer.push(ev);
    if (buffer.length > MAX_BUFFER) buffer.shift();
    if (isDev) {
        // eslint-disable-next-line no-console
        console.debug('[telemetry]', kind, metric, extra ?? '');
    }
    for (const l of listeners) {
        try { l(ev); } catch { /* listener error should never crash the app */ }
    }
}

export function trackFetchOk(metric: string, latencyMs: number): void {
    emit('fetch.ok', metric, { latencyMs });
}
export function trackFetchError(metric: string, reason: string, latencyMs?: number): void {
    emit('fetch.error', metric, { reason, latencyMs });
}
export function trackFetchInvalid(metric: string, reason: string, latencyMs?: number): void {
    emit('fetch.invalid', metric, { reason, latencyMs });
}
export function trackFallbackHit(metric: string): void {
    emit('fallback.hit', metric);
}

/** Subscribe to the stream of events. Returns an unsubscribe function. */
export function onEvent(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/** Read a snapshot of the buffer (most-recent-last). For exports & tests. */
export function snapshotTelemetry(): TelemetryEvent[] {
    return [...buffer];
}

/** Clear everything. Test-only in practice. */
export function clearTelemetry(): void {
    buffer.length = 0;
}
