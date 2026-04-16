/**
 * Runtime validation for external API responses.
 *
 * Why this module exists
 * ──────────────────────
 * Every number shown on planetearth.live is fetched live from a public agency
 * (NOAA, NASA, USGS, Copernicus, GFW, GBIF, etc.). Agencies occasionally:
 *
 *   - Rename fields (e.g. `us_aqi` → `us_aqi_pm2_5`).
 *   - Return sentinel values (`-9999`, `null`, empty arrays).
 *   - Publish obviously-wrong data during station outages (e.g. CO₂ = 0).
 *   - Wrap errors in a 200 OK body with `{"error": "..."}`.
 *
 * Without runtime checks a renamed field would silently become `NaN` on the
 * dashboard and nobody would notice. The goal of this module is to make every
 * metric PASS THROUGH a named, testable validator before it can reach the UI.
 *
 * Design choices
 * ──────────────
 * - Zero external dependencies. A 4kB validator beats pulling in zod (~13kB
 *   minified) for a project with a fixed, small set of schemas.
 * - Each validator returns a discriminated result `{ ok: true, value } | { ok: false, reason }`
 *   so callers can attribute failures to the right source in the status panel.
 * - Sanity bounds come from IPCC AR6, NOAA GML, NSIDC and WHO 2021 — see
 *   `docs/METHODOLOGY.md` for the reference for each bound.
 * - Bounds are LOOSE on purpose. The goal is to reject "obviously broken" data
 *   (CO₂ = 0 ppm, PM2.5 = -1), not to enforce climatological precision.
 *
 * This file is pure and side-effect free — safe to import from tests.
 */

/* ────────────────── Result type ────────────────── */

export type ValidationResult<T> =
    | { ok: true; value: T }
    | { ok: false; reason: string };

export function ok<T>(value: T): ValidationResult<T> {
    return { ok: true, value };
}

export function fail<T>(reason: string): ValidationResult<T> {
    return { ok: false, reason };
}

/* ────────────────── Primitive guards ────────────────── */

export function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

export function isNonEmptyArray<T>(v: unknown): v is T[] {
    return Array.isArray(v) && v.length > 0;
}

export function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse a number that an API might send as either a number or a string
 * (global-warming.org sends numeric strings, OpenAQ sends real numbers).
 */
export function parseNumericLoose(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/* ────────────────── Sanity bounds (cite: docs/METHODOLOGY.md) ────────────────── */

/**
 * All bounds are (inclusive min, inclusive max). Anything outside is rejected
 * as unphysical. These are deliberately LOOSER than the plausible range — if a
 * future observation nudges past them we want to know via a failing test, not
 * hide a real signal.
 *
 * Source: see §"Sanity bounds" in docs/METHODOLOGY.md
 */
export const BOUNDS = {
    /** Mauna Loa CO₂, 2000–present (NOAA GML). Pre-industrial ≈280; 2026 ≈429. */
    CO2_PPM: [380, 600] as const,
    /** GISTEMP annual anomaly °C, baseline 1951-1980. Current ≈+1.45. */
    TEMP_ANOMALY_C: [-1, 5] as const,
    /** CH₄ ppb, NOAA GML global mean. Pre-industrial ≈722; current ≈1946. */
    CH4_PPB: [1500, 2500] as const,
    /** N₂O ppb, NOAA GML global mean. Pre-industrial ≈270; current ≈339. */
    N2O_PPB: [280, 400] as const,
    /** NSIDC global sea-ice extent (10⁶ km²). Seasonal range ≈[4, 25]. */
    ARCTIC_ICE_MKM2: [0, 30] as const,
    /** Kp planetary index (NOAA SWPC, 0–9 scale). */
    KP_INDEX: [0, 9] as const,
    /** PM2.5 µg/m³ ambient. Cleanest Antarctic ≈0.1; severe wildfire events >500. */
    PM25_UGM3: [0, 1000] as const,
    /** US AQI scale (EPA). */
    AQI: [0, 500] as const,
    /** Water level relative to MSL datum (m). Battery NYC historical range ≈[-2, 3]. */
    SEA_LEVEL_LOCAL_M: [-10, 10] as const,
    /** Global mean sea level anomaly (mm relative to 1993 baseline). ~110 mm in 2025. */
    SEA_LEVEL_GLOBAL_MM: [-50, 500] as const,
    /** Grid carbon intensity (gCO₂ per kWh). Paris grid ≈50; coal-heavy grids ≈900. */
    CARBON_INTENSITY_GCO2_KWH: [0, 1500] as const,
    /** Annual tropical tree-cover loss (hectares) summed across top-5 countries. */
    FOREST_LOSS_HA: [0, 50_000_000] as const,
    /** UV Index (WHO scale 0–16+; values above 13 are rare outside tropics at altitude). */
    UV_INDEX: [0, 20] as const,
    /** GBIF global human-observation count for a ~12-month window. */
    GBIF_COUNT: [1_000_000, 10_000_000_000] as const,
    /** Surface temperature °C. Antarctic minima ≈-90; Death Valley ≈+57. */
    SURFACE_TEMP_C: [-90, 70] as const,
    /** Earthquake magnitude (USGS, moment magnitude Mw). Largest recorded 9.5 (Chile 1960). */
    EARTHQUAKE_MAG: [-2, 10] as const,
} as const;

export function withinBounds(v: number, bounds: readonly [number, number]): boolean {
    return v >= bounds[0] && v <= bounds[1];
}

/* ────────────────── Per-source validators ──────────────────
 * Each validator is intentionally named after its upstream source so failures
 * appearing in telemetry can be attributed ("validateCO2Response failed on
 * global-warming.org:latest.cycle"). All signatures are `(raw: unknown) => ValidationResult<T>`.
 */

/** global-warming.org `/api/co2-api` — NOAA Mauna Loa Keeling Curve daily. */
export function validateCO2Response(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('co2: non-object payload');
    const arr = (raw as { co2?: unknown }).co2;
    if (!isNonEmptyArray<{ cycle?: unknown; trend?: unknown }>(arr)) return fail('co2: empty series');
    const latest = arr[arr.length - 1];
    const v = parseNumericLoose(latest.cycle ?? latest.trend);
    if (v === null) return fail('co2: latest.cycle not numeric');
    if (!withinBounds(v, BOUNDS.CO2_PPM)) return fail(`co2: ${v} ppm out of bounds`);
    return ok(v);
}

/** global-warming.org `/api/temperature-api` — NASA GISS LOTI monthly. */
export function validateTemperatureResponse(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('temp: non-object payload');
    const arr = (raw as { result?: unknown }).result;
    if (!isNonEmptyArray<{ station?: unknown; land?: unknown }>(arr)) return fail('temp: empty series');
    const latest = arr[arr.length - 1];
    const v = parseNumericLoose(latest.station ?? latest.land);
    if (v === null) return fail('temp: latest.station not numeric');
    if (!withinBounds(v, BOUNDS.TEMP_ANOMALY_C)) return fail(`temp: ${v}°C out of bounds`);
    return ok(v);
}

/** global-warming.org `/api/methane-api` — NOAA ESRL global monthly mean. */
export function validateMethaneResponse(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('ch4: non-object payload');
    const arr = (raw as { methane?: unknown }).methane;
    if (!isNonEmptyArray<{ average?: unknown; trend?: unknown }>(arr)) return fail('ch4: empty series');
    const latest = arr[arr.length - 1];
    const v = parseNumericLoose(latest.average ?? latest.trend);
    if (v === null) return fail('ch4: latest.average not numeric');
    if (!withinBounds(v, BOUNDS.CH4_PPB)) return fail(`ch4: ${v} ppb out of bounds`);
    return ok(v);
}

/** global-warming.org `/api/nitrous-oxide-api` — NOAA GML global monthly mean. */
export function validateNitrousResponse(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('n2o: non-object payload');
    const arr = (raw as { nitrous?: unknown }).nitrous;
    if (!isNonEmptyArray<{ average?: unknown; trend?: unknown }>(arr)) return fail('n2o: empty series');
    const latest = arr[arr.length - 1];
    const v = parseNumericLoose(latest.average ?? latest.trend);
    if (v === null) return fail('n2o: latest.average not numeric');
    if (!withinBounds(v, BOUNDS.N2O_PPB)) return fail(`n2o: ${v} ppb out of bounds`);
    return ok(v);
}

/** global-warming.org `/api/arctic-api` — NSIDC sea-ice extent keyed by YYYYMM. */
export interface ArcticIceResult { value: number; anomaly?: number; yyyymm: string }
export function validateArcticResponse(raw: unknown): ValidationResult<ArcticIceResult> {
    if (!isObject(raw)) return fail('arctic: non-object payload');
    const payload = (raw as { arcticData?: unknown }).arcticData;
    if (!isObject(payload)) return fail('arctic: missing arcticData');
    const data = (payload as { data?: unknown }).data;
    if (!isObject(data)) return fail('arctic: missing data dict');
    const keys = Object.keys(data).sort();
    if (keys.length === 0) return fail('arctic: empty data dict');
    const latestKey = keys[keys.length - 1];
    const entry = (data as Record<string, unknown>)[latestKey];
    if (!isObject(entry)) return fail(`arctic: ${latestKey} not an object`);
    const value = parseNumericLoose(entry.value);
    if (value === null || value === -9999) return fail('arctic: sentinel or missing value');
    if (!withinBounds(value, BOUNDS.ARCTIC_ICE_MKM2)) return fail(`arctic: ${value} Mkm² out of bounds`);
    const anomRaw = parseNumericLoose(entry.anom);
    const anomaly = anomRaw !== null && anomRaw !== -9999 ? anomRaw : undefined;
    return ok({ value, anomaly, yyyymm: latestKey });
}

/** NOAA SWPC planetary K-index JSON. First row is a header. */
export function validateKpResponse(raw: unknown): ValidationResult<number> {
    if (!Array.isArray(raw) || raw.length < 2) return fail('kp: non-array or empty');
    const latest = raw[raw.length - 1];
    if (!Array.isArray(latest) || latest.length < 2) return fail('kp: malformed row');
    const v = parseNumericLoose(latest[1]);
    if (v === null) return fail('kp: Kp column not numeric');
    if (!withinBounds(v, BOUNDS.KP_INDEX)) return fail(`kp: ${v} out of 0-9 scale`);
    return ok(v);
}

/** Open-Meteo air-quality `/v1/air-quality`. */
export interface AirQualityPoint { pm25: number; usAqi: number }
export function validateAirQualityResponse(raw: unknown): ValidationResult<AirQualityPoint> {
    if (!isObject(raw)) return fail('aq: non-object payload');
    const current = (raw as { current?: unknown }).current;
    if (!isObject(current)) return fail('aq: missing current block');
    const pm = parseNumericLoose(current.pm2_5);
    if (pm === null) return fail('aq: current.pm2_5 missing');
    if (!withinBounds(pm, BOUNDS.PM25_UGM3)) return fail(`aq: PM2.5 ${pm} µg/m³ out of bounds`);
    const aqi = parseNumericLoose(current.us_aqi) ?? 0;
    return ok({ pm25: pm, usAqi: Math.max(0, Math.min(BOUNDS.AQI[1], aqi)) });
}

/** Open-Meteo forecast `/v1/forecast?current=temperature_2m`. */
export function validateTemperature2mResponse(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('t2m: non-object payload');
    const current = (raw as { current?: unknown }).current;
    if (!isObject(current)) return fail('t2m: missing current');
    const t = parseNumericLoose(current.temperature_2m);
    if (t === null) return fail('t2m: temperature_2m missing');
    if (!withinBounds(t, BOUNDS.SURFACE_TEMP_C)) return fail(`t2m: ${t}°C out of bounds`);
    return ok(t);
}

/** Open-Meteo forecast `/v1/forecast?daily=uv_index_max`. */
export function validateUvResponse(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('uv: non-object payload');
    const daily = (raw as { daily?: unknown }).daily;
    if (!isObject(daily)) return fail('uv: missing daily block');
    const arr = (daily as { uv_index_max?: unknown }).uv_index_max;
    if (!Array.isArray(arr) || arr.length === 0) return fail('uv: uv_index_max empty');
    const v = parseNumericLoose(arr[0]);
    if (v === null) return fail('uv: uv_index_max[0] not numeric');
    if (!withinBounds(v, BOUNDS.UV_INDEX)) return fail(`uv: ${v} out of bounds`);
    return ok(v);
}

/** NOAA CO-OPS `/api/prod/datagetter` — water level at The Battery NYC. */
export function validateSeaLevelLocalResponse(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('sl-local: non-object payload');
    const arr = (raw as { data?: unknown }).data;
    if (!isNonEmptyArray<{ v?: unknown }>(arr)) return fail('sl-local: empty data[]');
    const v = parseNumericLoose(arr[0].v);
    if (v === null) return fail('sl-local: data[0].v not numeric');
    if (!withinBounds(v, BOUNDS.SEA_LEVEL_LOCAL_M)) return fail(`sl-local: ${v} m out of bounds`);
    return ok(v);
}

/** global-warming.org `/api/sea-level-api` — CSIRO+NOAA satellite altimetry. */
export function validateSeaLevelGlobalResponse(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('sl-global: non-object payload');
    const arr = (raw as { sealevel?: unknown }).sealevel;
    if (!isNonEmptyArray<{ GMSL?: unknown; gmsl?: unknown; value?: unknown }>(arr)) {
        return fail('sl-global: empty sealevel[]');
    }
    const latest = arr[arr.length - 1];
    const v = parseNumericLoose(latest.GMSL ?? latest.gmsl ?? latest.value);
    if (v === null) return fail('sl-global: latest value not numeric');
    if (!withinBounds(v, BOUNDS.SEA_LEVEL_GLOBAL_MM)) return fail(`sl-global: ${v} mm out of bounds`);
    return ok(v);
}

/** carbonintensity.org.uk `/intensity`. */
export function validateCarbonIntensityResponse(raw: unknown): ValidationResult<number> {
    if (!isObject(raw)) return fail('ci: non-object payload');
    const data = (raw as { data?: unknown }).data;
    if (!isNonEmptyArray<{ intensity?: unknown }>(data)) return fail('ci: empty data[]');
    const intensity = data[0].intensity;
    if (!isObject(intensity)) return fail('ci: missing intensity block');
    const actual = parseNumericLoose(intensity.actual);
    if (actual === null) return fail('ci: intensity.actual not numeric');
    if (!withinBounds(actual, BOUNDS.CARBON_INTENSITY_GCO2_KWH)) return fail(`ci: ${actual} gCO₂/kWh out of bounds`);
    return ok(actual);
}

/** GBIF `/v1/occurrence/count` returns a raw integer in the response body. */
export function validateGbifCountResponse(raw: unknown): ValidationResult<number> {
    const v = parseNumericLoose(raw);
    if (v === null) return fail('gbif: non-numeric response');
    if (!withinBounds(v, BOUNDS.GBIF_COUNT)) return fail(`gbif: ${v} out of bounds`);
    return ok(v);
}
