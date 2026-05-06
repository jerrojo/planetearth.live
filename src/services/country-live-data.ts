/**
 * Country live-data fetchers.
 *
 * Each function pulls the current state of one Planet-Lens pillar for a single
 * country from a public API and returns a 0–100 score (same scale as the
 * static profile values). Returns null when the source is unreachable or the
 * country isn't covered — the country panel falls back to the static value
 * silently in that case.
 *
 * Currently wired:
 *   - climate     ← OWID CO2-per-capita (latest year available)
 *   - pollution   ← Open-Meteo air quality (PM2.5 at country capital)
 *   - forests_land ← Global Forest Watch tree-cover loss (% of forest, last 3y)
 *
 * Not wired (yet):
 *   - biodiversity   (GBIF observation count is a research-intensity proxy,
 *                     not biodiversity itself — keeping static value)
 *   - protected_areas (Protected Planet API needs token; static is fine)
 *   - agriculture    (no good public per-country API)
 *   - env_governance (Climate Action Tracker is HTML-only; static is fine)
 *
 * All fetches are best-effort with timeouts; any failure resolves to null.
 */

export interface LiveValue {
    /** 0–100 score on the same scale the static profile uses. */
    score: number;
    /** Raw upstream value (for tooltip / debug). */
    raw: number;
    /** Human-readable unit ("tCO₂/capita", "µg/m³", "%"). */
    unit: string;
    /** Reporting year or measurement timestamp. */
    asOf: string;
    /** Direct URL to the upstream record. */
    source: string;
}

// ── timeout-wrapped fetch ──────────────────────────────────────────────

async function fetchJson<T = unknown>(url: string, timeoutMs = 6000): Promise<T | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    } finally {
        clearTimeout(t);
    }
}

// ── score mappings (tunable) ───────────────────────────────────────────

/** CO2/capita (tCO₂) → 0–100 climate score. */
function scoreClimateFromCO2PerCapita(tco2: number): number {
    // 2.0 t/capita ≈ 1.5°C-aligned average → 100
    // 16.0 t/capita ≈ Saudi/USA territory → 0
    const score = 100 - (tco2 - 2) * (100 / 14);
    return Math.max(0, Math.min(100, Math.round(score)));
}

/** PM2.5 (µg/m³) → 0–100 pollution score (higher score = cleaner air). */
function scorePollutionFromPM25(pm25: number): number {
    // WHO 2021 guideline: 5 µg/m³ → 100
    // 25 µg/m³ (interim target 4) → 30
    // 35+ µg/m³ → 0
    if (pm25 <= 5) return 100;
    if (pm25 >= 35) return 0;
    const score = 100 - ((pm25 - 5) / 30) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
}

/** Tree-cover loss as % of country forest area over recent window → score. */
function scoreForestsFromLossPct(lossPct: number): number {
    // 0% loss → 100
    // 1% / window → 60
    // 5% / window → 0
    if (lossPct <= 0) return 100;
    if (lossPct >= 5) return 0;
    const score = 100 - lossPct * 20;
    return Math.max(0, Math.min(100, Math.round(score)));
}

// ── OWID CO2 per capita ────────────────────────────────────────────────

interface OwidPoint { year: number; co2_per_capita?: number }
interface OwidEntry { iso_code: string; data: OwidPoint[] }

let owidCache: Record<string, OwidEntry> | null = null;
let owidPromise: Promise<Record<string, OwidEntry> | null> | null = null;

async function loadOwid(): Promise<Record<string, OwidEntry> | null> {
    if (owidCache) return owidCache;
    if (!owidPromise) {
        owidPromise = fetchJson<Record<string, OwidEntry>>(
            'https://nyc3.digitaloceanspaces.com/owid-public/data/co2/owid-co2-data.json',
            12_000,
        ).then(data => {
            if (data) owidCache = data;
            return data;
        });
    }
    return owidPromise;
}

export async function fetchClimateLive(iso3: string): Promise<LiveValue | null> {
    const all = await loadOwid();
    if (!all) return null;
    const entry = all[iso3.toUpperCase()];
    if (!entry?.data) return null;
    // Walk back from the latest year until we find a populated co2_per_capita.
    const points = [...entry.data].reverse();
    const hit = points.find(p => typeof p.co2_per_capita === 'number');
    if (!hit || hit.co2_per_capita === undefined) return null;
    return {
        score: scoreClimateFromCO2PerCapita(hit.co2_per_capita),
        raw: hit.co2_per_capita,
        unit: 'tCO₂/cap',
        asOf: String(hit.year),
        source: 'https://ourworldindata.org/co2-emissions',
    };
}

// ── Open-Meteo PM2.5 at country capital ────────────────────────────────

interface OpenMeteoAQ {
    current?: { pm2_5?: number; time?: string };
}

export async function fetchPollutionLive(lat: number, lon: number): Promise<LiveValue | null> {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5`;
    const r = await fetchJson<OpenMeteoAQ>(url);
    const pm = r?.current?.pm2_5;
    if (typeof pm !== 'number') return null;
    return {
        score: scorePollutionFromPM25(pm),
        raw: Math.round(pm * 10) / 10,
        unit: 'µg/m³ PM₂.₅',
        asOf: r?.current?.time ?? new Date().toISOString().slice(0, 10),
        source: 'https://open-meteo.com/en/docs/air-quality-api',
    };
}

// ── GFW tree-cover loss per ISO ────────────────────────────────────────

interface GfwResponse {
    data?: Array<{ loss_ha?: number; area_ha?: number }>;
}

export async function fetchForestsLive(iso3: string): Promise<LiveValue | null> {
    // Loss in the last 3 reporting years (2022-2024) divided by extent.
    // GFW's open SQL endpoint:
    //   data-api.globalforestwatch.org/dataset/{ds}/v1.x/query?sql=…
    const lossSql = encodeURIComponent(
        `SELECT SUM(area__ha) AS loss_ha FROM data ` +
        `WHERE umd_tree_cover_loss__year > 2021 AND iso = '${iso3}'`,
    );
    const extentSql = encodeURIComponent(
        `SELECT SUM(area__ha) AS area_ha FROM data WHERE iso = '${iso3}'`,
    );
    const lossUrl = `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.11/query?sql=${lossSql}`;
    const extentUrl = `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_extent_2000__30/v202209/query?sql=${extentSql}`;

    const [lossRes, extentRes] = await Promise.all([
        fetchJson<GfwResponse>(lossUrl, 9_000),
        fetchJson<GfwResponse>(extentUrl, 9_000),
    ]);
    const loss = lossRes?.data?.[0]?.loss_ha;
    const extent = extentRes?.data?.[0]?.area_ha;
    if (typeof loss !== 'number' || typeof extent !== 'number' || extent <= 0) return null;
    const lossPct = (loss / extent) * 100;
    return {
        score: scoreForestsFromLossPct(lossPct),
        raw: Math.round(lossPct * 100) / 100,
        unit: '% lost (2022–24)',
        asOf: '2024',
        source: 'https://www.globalforestwatch.org/',
    };
}

// ── Aggregate fetcher used by the country panel ───────────────────────

export interface LivePillars {
    climate?: LiveValue;
    pollution?: LiveValue;
    forests_land?: LiveValue;
}

/** Fire all three live fetches in parallel for one country. */
export async function fetchLivePillars(
    iso3: string,
    capitalLat: number,
    capitalLon: number,
): Promise<LivePillars> {
    const [climate, pollution, forests] = await Promise.all([
        fetchClimateLive(iso3),
        fetchPollutionLive(capitalLat, capitalLon),
        fetchForestsLive(iso3),
    ]);
    const out: LivePillars = {};
    if (climate) out.climate = climate;
    if (pollution) out.pollution = pollution;
    if (forests) out.forests_land = forests;
    return out;
}
