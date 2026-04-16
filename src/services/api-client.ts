/**
 * API Client — Live Environmental Data Integration
 *
 * Fetches real-time data from the most credible scientific sources. Every
 * value shown in the dashboard flows through:
 *
 *     HTTP (with retry + timeout)  →  runtime validator  →  provenance record
 *                                  →  cache (IndexedDB)    →  UI state
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ Source                    │ Data                 │ Auth    │ Freq   │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ global-warming.org        │ CO₂ (NOAA Mauna Loa) │ None    │ 30m    │
 * │  (proxy for NOAA/ESRL)    │ Temperature (NASA)   │         │        │
 * │                           │ Methane (NOAA ESRL)  │         │        │
 * │                           │ N₂O (NOAA ESRL)      │         │        │
 * │                           │ Arctic Ice (NSIDC)   │         │        │
 * │                           │ Sea Level (global)   │         │        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ NOAA SWPC                 │ Kp Index (geomag.)   │ None    │ 30m    │
 * │ NASA EONET v3             │ Natural events       │ None    │ 30m    │
 * │ USGS Earthquake Hazards   │ Earthquakes M4.5+    │ None    │ 30m    │
 * │ Open-Meteo Air Quality    │ PM2.5 / US AQI       │ None    │ 1h     │
 * │ NOAA CO-OPS               │ Sea level (Battery)  │ None    │ 6min   │
 * │ UK National Grid ESO      │ Carbon intensity     │ None    │ 30m    │
 * │ Open-Meteo Climate        │ Multi-city temp avg  │ None    │ 1h     │
 * │ Global Forest Watch       │ Tree cover loss (ha) │ None    │ 30m    │
 * │ OpenAQ                    │ PM2.5 global stations│ None    │ 1h     │
 * │ Open-Meteo Forecast       │ UV Index             │ None    │ 6h     │
 * │ GBIF                      │ Biodiversity obs.    │ None    │ 30m    │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Architecture:
 *   • Promise.allSettled() — any single API can fail without affecting others.
 *   • Every successful fetch is persisted to IndexedDB via `cacheMetric()`
 *     so the UI shows a labelled fallback when the upstream is unreachable.
 *   • Every fetch produces a `ProvenanceRecord` (source, latency, timestamp,
 *     validation status) surfaced to users in the data-status panel.
 */

import { TOTAL_APIS } from '../config/constants';
import { cacheMetric, loadFallback } from './cache';
import {
    provenanceSummary,
    recordFailure,
    recordInvalid,
    recordSuccess,
    registerDefaultProvenance,
    snapshotProvenance,
} from './provenance';
import { trackFallbackHit, trackFetchError, trackFetchInvalid, trackFetchOk } from './telemetry';
import {
    validateAirQualityResponse,
    validateArcticResponse,
    validateCO2Response,
    validateCarbonIntensityResponse,
    validateGbifCountResponse,
    validateKpResponse,
    validateMethaneResponse,
    validateNitrousResponse,
    validateSeaLevelGlobalResponse,
    validateSeaLevelLocalResponse,
    validateTemperature2mResponse,
    validateTemperatureResponse,
    validateUvResponse,
} from './validation';

/* ────────────────── Types ────────────────── */

export interface LiveDataResult {
    apisConnected: number;
    co2?: number;
    temperature?: number;
    methane?: number;
    nitrous?: number;
    arcticIce?: number;
    arcticAnomaly?: number;
    kpIndex?: number;
    naturalEvents?: NaturalEvent[];
    pm25?: number;
    globalAQI?: number;
    seaLevelNYC?: number;
    seaLevelGlobal?: number;
    carbonIntensity?: number;
    globalTempAvg?: number;
    forestLossHa?: number;
    uvIndex?: number;
    gbifRecentCount?: number;
}

export interface NaturalEvent {
    id: string;
    title: string;
    category: string;
    lat: number;
    lon: number;
    date: string;
    magnitude?: number;
    magnitudeUnit?: string;
}

interface GfwRow { loss_ha?: number | string; area__ha?: number | string }
interface GfwResponse { data?: GfwRow[]; rows?: GfwRow[] }
interface UsgsFeature {
    id?: string;
    properties: { mag: number; place?: string; title?: string; time: number; code?: string };
    geometry?: { coordinates?: [number, number, number] };
}
interface UsgsResponse { features?: UsgsFeature[] }
interface EonetGeometry { coordinates?: [number, number]; date: string; magnitudeValue?: number; magnitudeUnit?: string }
interface EonetEvent { id: string; title: string; categories?: { title: string }[]; geometry?: EonetGeometry[] }
interface EonetResponse { events?: EonetEvent[] }
interface OpenAqMeasurement { parameter: string; value: number }
interface OpenAqStation { measurements?: OpenAqMeasurement[] }
interface OpenAqResponse { results?: OpenAqStation[] }

/* ────────────────── Fetch Helpers ────────────────── */

const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

interface FetchResult { res: Response; latencyMs: number }

async function fetchWithTimeout(url: string, ms = TIMEOUT_MS): Promise<FetchResult> {
    let lastErr: unknown;
    const t0 = Date.now();
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) {
                if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES) {
                    lastErr = new Error(`HTTP ${res.status} on ${url}`);
                    await sleepWithJitter(attempt);
                    continue;
                }
                throw new Error(`HTTP ${res.status} on ${url}`);
            }
            return { res, latencyMs: Date.now() - t0 };
        } catch (err) {
            clearTimeout(timer);
            lastErr = err;
            if (attempt >= MAX_RETRIES) break;
            await sleepWithJitter(attempt);
        }
    }
    throw lastErr ?? new Error(`Fetch failed: ${url}`);
}

function sleepWithJitter(attempt: number): Promise<void> {
    const base = RETRY_BASE_MS * Math.pow(2, attempt);
    const jitter = base * 0.25 * (Math.random() * 2 - 1);
    return new Promise(resolve => setTimeout(resolve, base + jitter));
}

async function fetchJson(url: string, ms = TIMEOUT_MS): Promise<{ body: unknown; latencyMs: number }> {
    const { res, latencyMs } = await fetchWithTimeout(url, ms);
    const body = await res.json();
    return { body, latencyMs };
}

/** Load-or-fallback helper used for per-metric recovery. */
async function applyFallback(id: string, maxAgeMs: number, assign: (v: number) => void): Promise<boolean> {
    const cached = await loadFallback(id, maxAgeMs);
    if (cached !== null) {
        assign(cached.value);
        trackFallbackHit(id);
        return true;
    }
    return false;
}

/* ────────────────── Main Fetch ────────────────── */

// Register provenance once at module import.
registerDefaultProvenance();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

export async function fetchLiveData(): Promise<LiveDataResult> {
    let apisConnected = 0;
    const result: LiveDataResult = { apisConnected: 0 };

    const results = await Promise.allSettled([
        fetchJson('https://global-warming.org/api/co2-api'),                                                   // 0
        fetchJson('https://global-warming.org/api/temperature-api'),                                            // 1
        fetchJson('https://global-warming.org/api/methane-api'),                                                // 2
        fetchJson('https://global-warming.org/api/nitrous-oxide-api'),                                          // 3
        fetchJson('https://global-warming.org/api/arctic-api'),                                                 // 4
        fetchJson('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'),                       // 5
        fetchJson('https://eonet.gsfc.nasa.gov/api/v3/events?limit=15&status=open'),                            // 6
        // 7: PM2.5 — three-city CAMS proxy
        Promise.allSettled([
            fetchJson('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.71&longitude=-74.01&current=pm2_5,us_aqi'),
            fetchJson('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.61&longitude=77.23&current=pm2_5,us_aqi'),
            fetchJson('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=51.51&longitude=-0.13&current=pm2_5,us_aqi'),
        ]),
        fetchJson('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8518750&product=water_level&datum=MSL&units=metric&time_zone=gmt&format=json'), // 8
        fetchJson('https://api.carbonintensity.org.uk/intensity'),                                              // 9
        fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson'),               // 10
        fetchJson('https://global-warming.org/api/sea-level-api'),                                              // 11
        Promise.allSettled([                                                                                     // 12
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m'),
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=51.51&longitude=-0.13&current=temperature_2m'),
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.69&current=temperature_2m'),
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21&current=temperature_2m'),
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.23&current=temperature_2m'),
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=-23.55&longitude=-46.63&current=temperature_2m'),
        ]),
        fetchJson('https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.11/query?sql=SELECT%20SUM(area__ha)%20AS%20loss_ha%20FROM%20data%20WHERE%20umd_tree_cover_loss__year%20%3E%202022').catch(() => null), // 13
        fetchJson('https://api.openaq.org/v2/latest?parameter=pm25&limit=100&sort=desc&order_by=lastUpdated', 10_000).catch(() => null),                                                                                          // 14
        Promise.allSettled([                                                                                     // 15
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=19.4&longitude=-99.1&daily=uv_index_max&timezone=auto&forecast_days=1'),
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&daily=uv_index_max&timezone=auto&forecast_days=1'),
            fetchJson('https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21&daily=uv_index_max&timezone=auto&forecast_days=1'),
        ]),
        fetchJson('https://api.gbif.org/v1/occurrence/count?year=2024,2026&basisOfRecord=HUMAN_OBSERVATION', 10_000).catch(() => null), // 16
    ]);

    // ── Unary helper: apply a validator to a single endpoint result. ──
    async function applyUnary(
        idx: number,
        id: string,
        validator: (raw: unknown) => import('./validation').ValidationResult<number>,
        assign: (v: number) => void,
        fallbackMaxAgeMs: number,
    ): Promise<void> {
        const r = results[idx];
        if (r.status === 'fulfilled' && r.value) {
            const { body, latencyMs } = r.value as { body: unknown; latencyMs: number };
            const v = validator(body);
            if (v.ok) {
                assign(v.value);
                recordSuccess(id, v.value, latencyMs);
                trackFetchOk(id, latencyMs);
                await cacheMetric(id, v.value);
                apisConnected++;
                return;
            }
            recordInvalid(id, v.reason, latencyMs);
            trackFetchInvalid(id, v.reason, latencyMs);
        } else {
            const reason = r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : 'null response';
            recordFailure(id, reason);
            trackFetchError(id, reason);
        }
        await applyFallback(id, fallbackMaxAgeMs, assign);
    }

    await applyUnary(0, 'co2', validateCO2Response, (v) => { result.co2 = v; }, 14 * DAY);
    await applyUnary(1, 'temperature', validateTemperatureResponse, (v) => { result.temperature = v; }, 120 * DAY);
    await applyUnary(2, 'methane', validateMethaneResponse, (v) => { result.methane = v; }, 120 * DAY);
    await applyUnary(3, 'nitrous', validateNitrousResponse, (v) => { result.nitrous = v; }, 120 * DAY);

    // ── Arctic Ice — richer return (value + anomaly) ──
    {
        const r = results[4];
        if (r.status === 'fulfilled' && r.value) {
            const { body, latencyMs } = r.value as { body: unknown; latencyMs: number };
            const v = validateArcticResponse(body);
            if (v.ok) {
                result.arcticIce = v.value.value;
                result.arcticAnomaly = v.value.anomaly;
                recordSuccess('arcticIce', v.value.value, latencyMs);
                trackFetchOk('arcticIce', latencyMs);
                await cacheMetric('arcticIce', v.value.value);
                apisConnected++;
            } else {
                recordInvalid('arcticIce', v.reason, latencyMs);
                trackFetchInvalid('arcticIce', v.reason, latencyMs);
                await applyFallback('arcticIce', 14 * DAY, (x) => { result.arcticIce = x; });
            }
        } else {
            const reason = r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : 'null response';
            recordFailure('arcticIce', reason);
            trackFetchError('arcticIce', reason);
            await applyFallback('arcticIce', 14 * DAY, (x) => { result.arcticIce = x; });
        }
    }

    await applyUnary(5, 'kpIndex', validateKpResponse, (v) => { result.kpIndex = v; }, 6 * HOUR);

    // ── EONET — count events ──
    {
        const r = results[6];
        if (r.status === 'fulfilled' && r.value) {
            const { body, latencyMs } = r.value as { body: unknown; latencyMs: number };
            const eonet = body as EonetResponse;
            if (eonet?.events && Array.isArray(eonet.events)) {
                const events: NaturalEvent[] = [];
                for (const evt of eonet.events) {
                    if (!evt.geometry || evt.geometry.length === 0) continue;
                    const geo = evt.geometry[evt.geometry.length - 1];
                    if (!geo.coordinates || geo.coordinates.length < 2) continue;
                    events.push({
                        id: evt.id,
                        title: evt.title,
                        category: evt.categories?.[0]?.title ?? 'Unknown',
                        lon: geo.coordinates[0],
                        lat: geo.coordinates[1],
                        date: geo.date,
                        magnitude: geo.magnitudeValue ?? undefined,
                        magnitudeUnit: geo.magnitudeUnit ?? undefined,
                    });
                }
                if (events.length > 0) {
                    result.naturalEvents = events;
                    recordSuccess('naturalEvents', events.length, latencyMs);
                    trackFetchOk('naturalEvents', latencyMs);
                    apisConnected++;
                } else {
                    recordInvalid('naturalEvents', 'empty event list', latencyMs);
                    trackFetchInvalid('naturalEvents', 'empty event list', latencyMs);
                }
            } else {
                recordInvalid('naturalEvents', 'missing events[]', latencyMs);
                trackFetchInvalid('naturalEvents', 'missing events[]', latencyMs);
            }
        } else {
            const reason = r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : 'null response';
            recordFailure('naturalEvents', reason);
            trackFetchError('naturalEvents', reason);
        }
    }

    // ── PM2.5 (CAMS 3-city) ──
    {
        const r = results[7];
        if (r.status === 'fulfilled') {
            type Settled = PromiseSettledResult<{ body: unknown; latencyMs: number }>;
            const cityResults = r.value as Settled[];
            let pm25Sum = 0, aqiSum = 0, count = 0, latencyMax = 0;
            for (const cr of cityResults) {
                if (cr.status === 'fulfilled') {
                    const { body, latencyMs } = cr.value;
                    const v = validateAirQualityResponse(body);
                    if (v.ok) {
                        pm25Sum += v.value.pm25;
                        aqiSum += v.value.usAqi;
                        count++;
                        latencyMax = Math.max(latencyMax, latencyMs);
                    }
                }
            }
            if (count >= 2) {
                result.pm25 = Math.round((pm25Sum / count) * 10) / 10;
                result.globalAQI = Math.round(aqiSum / count);
                recordSuccess('pm25', result.pm25, latencyMax);
                trackFetchOk('pm25', latencyMax);
                await cacheMetric('pm25', result.pm25);
                apisConnected++;
            } else {
                recordInvalid('pm25', 'fewer than 2 cities returned valid data');
                trackFetchInvalid('pm25', 'fewer than 2 cities returned valid data');
                await applyFallback('pm25', 24 * HOUR, (x) => { result.pm25 = x; });
            }
        } else {
            recordFailure('pm25', 'all CAMS endpoints failed');
            trackFetchError('pm25', 'all CAMS endpoints failed');
            await applyFallback('pm25', 24 * HOUR, (x) => { result.pm25 = x; });
        }
    }

    await applyUnary(8, 'seaLevelNYC', validateSeaLevelLocalResponse, (v) => { result.seaLevelNYC = v; }, 2 * HOUR);
    await applyUnary(9, 'carbonIntensity', validateCarbonIntensityResponse, (v) => { result.carbonIntensity = v; }, 12 * HOUR);

    // ── USGS Earthquakes ──
    {
        const r = results[10];
        if (r.status === 'fulfilled' && r.value) {
            const { body, latencyMs } = r.value as { body: unknown; latencyMs: number };
            const quakeData = body as UsgsResponse;
            if (quakeData?.features && Array.isArray(quakeData.features)) {
                const quakeEvents: NaturalEvent[] = [];
                for (const f of quakeData.features) {
                    const props = f.properties;
                    const coords = f.geometry?.coordinates;
                    if (!coords || coords.length < 2) continue;
                    quakeEvents.push({
                        id: f.id ?? `usgs-${props.code ?? ''}`,
                        title: props.title ?? `M${props.mag} Earthquake`,
                        category: 'Earthquake',
                        lon: coords[0],
                        lat: coords[1],
                        date: new Date(props.time).toISOString(),
                        magnitude: props.mag,
                        magnitudeUnit: 'Mw',
                    });
                }
                if (quakeEvents.length > 0) {
                    const existing = result.naturalEvents ?? [];
                    result.naturalEvents = [...existing, ...quakeEvents.slice(0, 30)];
                    recordSuccess('earthquakes', quakeEvents.length, latencyMs);
                    trackFetchOk('earthquakes', latencyMs);
                    apisConnected++;
                } else {
                    recordInvalid('earthquakes', 'empty feature list', latencyMs);
                    trackFetchInvalid('earthquakes', 'empty feature list', latencyMs);
                }
            } else {
                recordInvalid('earthquakes', 'missing features[]', latencyMs);
                trackFetchInvalid('earthquakes', 'missing features[]', latencyMs);
            }
        } else {
            const reason = r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : 'null response';
            recordFailure('earthquakes', reason);
            trackFetchError('earthquakes', reason);
        }
    }

    await applyUnary(11, 'seaLevelGlobal', validateSeaLevelGlobalResponse, (v) => { result.seaLevelGlobal = v; }, 120 * DAY);

    // ── Multi-city temperature ──
    {
        const r = results[12];
        if (r.status === 'fulfilled') {
            type Settled = PromiseSettledResult<{ body: unknown; latencyMs: number }>;
            const cityResults = r.value as Settled[];
            let tempSum = 0, count = 0, latencyMax = 0;
            for (const cr of cityResults) {
                if (cr.status === 'fulfilled') {
                    const { body, latencyMs } = cr.value;
                    const v = validateTemperature2mResponse(body);
                    if (v.ok) {
                        tempSum += v.value;
                        count++;
                        latencyMax = Math.max(latencyMax, latencyMs);
                    }
                }
            }
            if (count >= 3) {
                result.globalTempAvg = Math.round((tempSum / count) * 10) / 10;
                recordSuccess('globalTempAvg', result.globalTempAvg, latencyMax);
                trackFetchOk('globalTempAvg', latencyMax);
                await cacheMetric('globalTempAvg', result.globalTempAvg);
                apisConnected++;
            } else {
                recordInvalid('globalTempAvg', 'fewer than 3 cities returned valid data');
                trackFetchInvalid('globalTempAvg', 'fewer than 3 cities returned valid data');
                await applyFallback('globalTempAvg', 24 * HOUR, (x) => { result.globalTempAvg = x; });
            }
        }
    }

    // ── GFW Forest Loss ──
    {
        const r = results[13];
        if (r?.status === 'fulfilled' && r.value) {
            try {
                const { body, latencyMs } = r.value as { body: unknown; latencyMs: number };
                const data = body as GfwResponse;
                const rows: GfwRow[] = data?.data ?? data?.rows ?? [];
                if (Array.isArray(rows) && rows.length > 0) {
                    const lossHa = parseFloat(String(rows[0]?.loss_ha ?? rows[0]?.area__ha ?? 0));
                    if (Number.isFinite(lossHa) && lossHa > 0) {
                        result.forestLossHa = lossHa;
                        recordSuccess('forestLossHa', lossHa, latencyMs);
                        trackFetchOk('forestLossHa', latencyMs);
                        await cacheMetric('forestLossHa', lossHa);
                        apisConnected++;
                    } else {
                        recordInvalid('forestLossHa', 'non-positive loss_ha');
                        trackFetchInvalid('forestLossHa', 'non-positive loss_ha');
                    }
                } else {
                    recordInvalid('forestLossHa', 'empty rows');
                    trackFetchInvalid('forestLossHa', 'empty rows');
                }
            } catch (err) {
                recordFailure('forestLossHa', String(err));
                trackFetchError('forestLossHa', String(err));
            }
        } else {
            recordFailure('forestLossHa', 'endpoint unreachable');
            trackFetchError('forestLossHa', 'endpoint unreachable');
            await applyFallback('forestLossHa', 400 * DAY, (x) => { result.forestLossHa = x; });
        }
    }

    // ── OpenAQ blended PM2.5 ──
    {
        const r = results[14];
        if (r?.status === 'fulfilled' && r.value) {
            try {
                const { body, latencyMs } = r.value as { body: unknown; latencyMs: number };
                const oaqData = body as OpenAqResponse;
                const oaqResults = oaqData?.results;
                if (Array.isArray(oaqResults) && oaqResults.length > 10) {
                    let sum = 0, count = 0;
                    for (const station of oaqResults) {
                        const measurements = station?.measurements;
                        if (!Array.isArray(measurements)) continue;
                        for (const m of measurements) {
                            if (m.parameter === 'pm25' && typeof m.value === 'number' && m.value >= 0 && m.value < 1000) {
                                sum += m.value;
                                count++;
                            }
                        }
                    }
                    if (count >= 10) {
                        const stationAvg = Math.round((sum / count) * 10) / 10;
                        const blended = result.pm25 !== undefined
                            ? Math.round((result.pm25 * 0.4 + stationAvg * 0.6) * 10) / 10
                            : stationAvg;
                        result.pm25 = blended;
                        recordSuccess('openAq', stationAvg, latencyMs);
                        trackFetchOk('openAq', latencyMs);
                        apisConnected++;
                    } else {
                        recordInvalid('openAq', `only ${count} valid measurements`);
                        trackFetchInvalid('openAq', `only ${count} valid measurements`);
                    }
                } else {
                    recordInvalid('openAq', 'fewer than 10 stations returned');
                    trackFetchInvalid('openAq', 'fewer than 10 stations returned');
                }
            } catch (err) {
                recordFailure('openAq', String(err));
                trackFetchError('openAq', String(err));
            }
        } else {
            recordFailure('openAq', 'endpoint unreachable');
            trackFetchError('openAq', 'endpoint unreachable');
        }
    }

    // ── UV Index (3-latitude proxy) ──
    {
        const r = results[15];
        if (r.status === 'fulfilled') {
            type Settled = PromiseSettledResult<{ body: unknown; latencyMs: number }>;
            const uvResults = r.value as Settled[];
            let uvSum = 0, uvCount = 0, latencyMax = 0;
            for (const cr of uvResults) {
                if (cr.status === 'fulfilled') {
                    const { body, latencyMs } = cr.value;
                    const v = validateUvResponse(body);
                    if (v.ok) {
                        uvSum += v.value;
                        uvCount++;
                        latencyMax = Math.max(latencyMax, latencyMs);
                    }
                }
            }
            if (uvCount >= 2) {
                result.uvIndex = Math.round((uvSum / uvCount) * 10) / 10;
                recordSuccess('uvIndex', result.uvIndex, latencyMax);
                trackFetchOk('uvIndex', latencyMax);
                await cacheMetric('uvIndex', result.uvIndex);
                apisConnected++;
            } else {
                recordInvalid('uvIndex', 'fewer than 2 cities returned valid UV data');
                trackFetchInvalid('uvIndex', 'fewer than 2 cities returned valid UV data');
                await applyFallback('uvIndex', 24 * HOUR, (x) => { result.uvIndex = x; });
            }
        }
    }

    // ── GBIF biodiversity count ──
    {
        const r = results[16];
        if (r?.status === 'fulfilled' && r.value) {
            const { body, latencyMs } = r.value as { body: unknown; latencyMs: number };
            const v = validateGbifCountResponse(body);
            if (v.ok) {
                result.gbifRecentCount = v.value;
                recordSuccess('gbifRecentCount', v.value, latencyMs);
                trackFetchOk('gbifRecentCount', latencyMs);
                await cacheMetric('gbifRecentCount', v.value);
                apisConnected++;
            } else {
                recordInvalid('gbifRecentCount', v.reason, latencyMs);
                trackFetchInvalid('gbifRecentCount', v.reason, latencyMs);
            }
        } else {
            recordFailure('gbifRecentCount', 'endpoint unreachable');
            trackFetchError('gbifRecentCount', 'endpoint unreachable');
        }
    }

    result.apisConnected = apisConnected;
    return result;
}

/* ────────────────── Status Text ────────────────── */

export function getStatusText(apisConnected: number): { text: string; connected: boolean } {
    if (apisConnected >= 9) {
        return { text: `LIVE — ${apisConnected}/${TOTAL_APIS} fuentes (NOAA, NASA, USGS, CAMS, GFW, GBIF)`, connected: true };
    } else if (apisConnected >= 5) {
        return { text: `PARCIAL — ${apisConnected}/${TOTAL_APIS} fuentes activas`, connected: true };
    } else if (apisConnected >= 1) {
        return { text: `MÍNIMO — ${apisConnected}/${TOTAL_APIS} API conectada`, connected: true };
    }
    return { text: 'OFFLINE — datos base marzo 2026', connected: false };
}

/* ────────────────── Exports for UI status panel ────────────────── */

export { snapshotProvenance, provenanceSummary };
export type { ProvenanceRecord } from './provenance';
