/**
 * Per-metric provenance registry.
 *
 * "Trust, but verify." — every number the dashboard shows should be traceable,
 * in real time, to:
 *   - the originating agency (NOAA, NASA, USGS, …),
 *   - the exact URL it was fetched from,
 *   - when it was fetched (so staleness is visible),
 *   - how long the round-trip took,
 *   - whether validation accepted or rejected it.
 *
 * This module is the single source of truth for that audit trail. The UI can
 * render a "data status panel" from it, the CSV/JSON export embeds it, and
 * integration tests can assert that every metric has a current entry.
 */

export type ProvenanceStatus = 'ok' | 'stale' | 'invalid' | 'offline' | 'pending';

export interface ProvenanceRecord {
    /** Stable metric identifier (matches MetricId enum where applicable). */
    id: string;
    /** Human-readable metric label in its native language. */
    label: string;
    /** Agency or aggregator that produced the number. */
    source: string;
    /** Original scientific attribution (NOAA, NASA, …) when `source` is an aggregator. */
    originalSource?: string;
    /** Exact URL fetched. Never include credentials. */
    url: string;
    /** The accepted value or `null` if the fetch failed or was rejected. */
    value: number | null;
    /** Unit string for display and CSV export ("ppm", "°C", …). */
    unit: string;
    /** Millisecond timestamp of the most recent successful fetch (Date.now()). */
    fetchedAt: number | null;
    /** Round-trip time in ms for the most recent attempt. */
    latencyMs: number | null;
    /** Expected update cadence ("daily", "3h", …). Used to compute staleness. */
    cadence: string;
    /** Milliseconds after which a value becomes "stale" (typically 2× cadence). */
    staleAfterMs: number;
    /** Discriminator for UI badges and tests. */
    status: ProvenanceStatus;
    /** If status is 'invalid' / 'offline', a short reason for the operator. */
    reason?: string;
}

const registry = new Map<string, ProvenanceRecord>();

/** Register (or overwrite) metadata for a metric. Call at boot. */
export function registerProvenance(rec: Omit<ProvenanceRecord, 'value' | 'fetchedAt' | 'latencyMs' | 'status'>): void {
    registry.set(rec.id, {
        ...rec,
        value: null,
        fetchedAt: null,
        latencyMs: null,
        status: 'pending',
    });
}

/** Record a successful, validated fetch. */
export function recordSuccess(id: string, value: number, latencyMs: number, at = Date.now()): void {
    const r = registry.get(id);
    if (!r) return;
    r.value = value;
    r.fetchedAt = at;
    r.latencyMs = latencyMs;
    r.status = 'ok';
    r.reason = undefined;
}

/** Record a validation failure (data fetched but rejected by `validation.ts`). */
export function recordInvalid(id: string, reason: string, latencyMs: number | null = null): void {
    const r = registry.get(id);
    if (!r) return;
    r.latencyMs = latencyMs;
    r.status = 'invalid';
    r.reason = reason;
}

/** Record a network/HTTP failure. */
export function recordFailure(id: string, reason: string, latencyMs: number | null = null): void {
    const r = registry.get(id);
    if (!r) return;
    r.latencyMs = latencyMs;
    r.status = 'offline';
    r.reason = reason;
}

/** Re-evaluate staleness for every metric. Call from a timer or before export. */
export function refreshStaleness(now = Date.now()): void {
    for (const r of registry.values()) {
        if (r.status === 'ok' && r.fetchedAt !== null && now - r.fetchedAt > r.staleAfterMs) {
            r.status = 'stale';
        }
    }
}

/** Snapshot of all records, ordered by id for deterministic output. */
export function snapshotProvenance(): ProvenanceRecord[] {
    refreshStaleness();
    return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function getProvenance(id: string): ProvenanceRecord | undefined {
    return registry.get(id);
}

export function clearProvenance(): void {
    registry.clear();
}

/** Aggregate counts for the status badge. */
export function provenanceSummary(): { total: number; ok: number; stale: number; invalid: number; offline: number; pending: number } {
    refreshStaleness();
    const summary = { total: 0, ok: 0, stale: 0, invalid: 0, offline: 0, pending: 0 };
    for (const r of registry.values()) {
        summary.total++;
        summary[r.status]++;
    }
    return summary;
}

/* ────────────────── Default registrations ──────────────────
 * Canonical list of every live metric shown on planetearth.live, wired to the
 * exact endpoint in api-client.ts. If you add a new metric, add it here too
 * so the data-status panel shows it.
 */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function registerDefaultProvenance(): void {
    registerProvenance({
        id: 'co2', label: 'CO₂', unit: 'ppm',
        source: 'global-warming.org', originalSource: 'NOAA GML (Mauna Loa)',
        url: 'https://global-warming.org/api/co2-api',
        cadence: 'daily', staleAfterMs: 2 * DAY,
    });
    registerProvenance({
        id: 'temperature', label: 'Global temperature anomaly', unit: '°C',
        source: 'global-warming.org', originalSource: 'NASA GISS LOTI',
        url: 'https://global-warming.org/api/temperature-api',
        cadence: 'monthly', staleAfterMs: 45 * DAY,
    });
    registerProvenance({
        id: 'methane', label: 'Methane (CH₄)', unit: 'ppb',
        source: 'global-warming.org', originalSource: 'NOAA GML',
        url: 'https://global-warming.org/api/methane-api',
        cadence: 'monthly', staleAfterMs: 45 * DAY,
    });
    registerProvenance({
        id: 'nitrous', label: 'Nitrous oxide (N₂O)', unit: 'ppb',
        source: 'global-warming.org', originalSource: 'NOAA GML',
        url: 'https://global-warming.org/api/nitrous-oxide-api',
        cadence: 'monthly', staleAfterMs: 45 * DAY,
    });
    registerProvenance({
        id: 'arcticIce', label: 'Global sea-ice extent', unit: '10⁶ km²',
        source: 'global-warming.org', originalSource: 'NSIDC',
        url: 'https://global-warming.org/api/arctic-api',
        cadence: 'daily', staleAfterMs: 3 * DAY,
    });
    registerProvenance({
        id: 'kpIndex', label: 'Planetary Kp index', unit: '0-9',
        source: 'NOAA SWPC',
        url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
        cadence: '3h', staleAfterMs: 6 * HOUR,
    });
    registerProvenance({
        id: 'naturalEvents', label: 'Open natural events', unit: 'count',
        source: 'NASA EONET v3',
        url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open',
        cadence: 'hourly', staleAfterMs: 2 * HOUR,
    });
    registerProvenance({
        id: 'pm25', label: 'PM2.5 (blended)', unit: 'µg/m³',
        source: 'Open-Meteo CAMS + OpenAQ',
        originalSource: 'Copernicus CAMS / OpenAQ ground stations',
        url: 'https://air-quality-api.open-meteo.com/v1/air-quality',
        cadence: 'hourly', staleAfterMs: 3 * HOUR,
    });
    registerProvenance({
        id: 'seaLevelNYC', label: 'Sea level — The Battery, NYC', unit: 'm (MSL)',
        source: 'NOAA CO-OPS station 8518750',
        url: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter',
        cadence: '6min', staleAfterMs: 30 * MIN,
    });
    registerProvenance({
        id: 'carbonIntensity', label: 'UK grid carbon intensity', unit: 'gCO₂/kWh',
        source: 'National Grid ESO / Univ. of Oxford',
        url: 'https://api.carbonintensity.org.uk/intensity',
        cadence: '30min', staleAfterMs: 2 * HOUR,
    });
    registerProvenance({
        id: 'earthquakes', label: 'Earthquakes M4.5+ (30d)', unit: 'events',
        source: 'USGS Earthquake Hazards Program',
        url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson',
        cadence: 'live', staleAfterMs: HOUR,
    });
    registerProvenance({
        id: 'seaLevelGlobal', label: 'Global mean sea level', unit: 'mm (since 1993)',
        source: 'global-warming.org', originalSource: 'CSIRO / NOAA satellite altimetry',
        url: 'https://global-warming.org/api/sea-level-api',
        cadence: 'monthly', staleAfterMs: 60 * DAY,
    });
    registerProvenance({
        id: 'globalTempAvg', label: 'Current multi-city temperature', unit: '°C',
        source: 'Open-Meteo', originalSource: 'GFS / ERA5',
        url: 'https://api.open-meteo.com/v1/forecast',
        cadence: 'hourly', staleAfterMs: 3 * HOUR,
    });
    registerProvenance({
        id: 'forestLossHa', label: 'Tree cover loss (tropical top 5)', unit: 'hectares/yr',
        source: 'Global Forest Watch', originalSource: 'University of Maryland (Hansen et al.)',
        url: 'https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.11',
        cadence: 'annual', staleAfterMs: 400 * DAY,
    });
    registerProvenance({
        id: 'openAq', label: 'OpenAQ PM2.5 (station mean)', unit: 'µg/m³',
        source: 'OpenAQ',
        url: 'https://api.openaq.org/v2/latest?parameter=pm25',
        cadence: 'hourly', staleAfterMs: 3 * HOUR,
    });
    registerProvenance({
        id: 'uvIndex', label: 'UV Index (3-latitude proxy)', unit: '0-16',
        source: 'Open-Meteo', originalSource: 'GFS',
        url: 'https://api.open-meteo.com/v1/forecast?daily=uv_index_max',
        cadence: '6h', staleAfterMs: 12 * HOUR,
    });
    registerProvenance({
        id: 'gbifRecentCount', label: 'GBIF biodiversity observations', unit: 'records',
        source: 'GBIF',
        url: 'https://api.gbif.org/v1/occurrence/count',
        cadence: 'hourly', staleAfterMs: 6 * HOUR,
    });
}
