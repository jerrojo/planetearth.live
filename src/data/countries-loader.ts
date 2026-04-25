/**
 * Country Planet-Lens loader.
 *
 * The /data/countries/ directory is the canonical source. Files:
 *   - _index.json           Lightweight entries (iso, names, lat/lon, score, light)
 *                           — bundled at boot; drives the 30 globe traffic lights.
 *   - _global_actions.json,
 *     _governmental_actions.json,
 *     _personal_actions.json
 *                           — universal top-5 lists per category; bundled at boot.
 *   - data/{iso3}.json      — rich per-country profile (pillars, gaps, actions).
 *                           — lazy-loaded on hover/click via import.meta.glob.
 *
 * All files are imported as ES modules so Vite handles bundling / code splitting.
 * No fetch(), no race conditions, no extra URL routing.
 */

import indexJson from '../../data/countries/_index.json';
import globalActionsJson from '../../data/countries/_global_actions.json';
import governmentalActionsJson from '../../data/countries/_governmental_actions.json';
import personalActionsJson from '../../data/countries/_personal_actions.json';

// ── Types ──────────────────────────────────────────────────────────────

export type TrafficLight = 'green' | 'yellow' | 'red';

export interface CountryIndexEntry {
    iso_a3: string;
    name_en: string;
    name_es: string;
    region: string;
    megadiverse: boolean;
    status: string;
    lat: number;
    lon: number;
    score: number;
    traffic_light: TrafficLight;
}

export interface CountryProfile {
    identity: {
        iso_a3: string;
        name_en: string;
        name_es: string;
        [k: string]: unknown;
    };
    emissions?: Record<string, unknown>;
    energy_mix?: Record<string, unknown>;
    commitments?: Record<string, unknown>;
    reality?: Record<string, unknown>;
    pillars: Record<string, { value: number; note_en?: string; note_es?: string; [k: string]: unknown }>;
    score: {
        value: number;
        traffic_light: TrafficLight;
        confidence?: string;
        [k: string]: unknown;
    };
    top_gaps: Array<{
        pillar?: string;
        title_en?: string;
        title_es?: string;
        current?: string;
        target?: string;
        [k: string]: unknown;
    }>;
    recent_actions?: Array<Record<string, unknown>>;
    intersection?: Record<string, unknown>;
    context?: Record<string, unknown>;
    sources?: Array<Record<string, unknown>>;
    last_updated?: string;
}

export interface ActionItem {
    rank: number;
    title_en: string;
    title_es: string;
    what_en?: string;
    what_es?: string;
    why_matters_en?: string;
    why_matters_es?: string;
    impact_tag?: string;
    status?: string;
    source?: string;
}

export interface ActionList {
    version: string;
    scope: string;
    description?: string;
    last_updated?: string;
    items: ActionItem[];
}

// ── Index + action lists (bundled, always available) ───────────────────

export const COUNTRIES: readonly CountryIndexEntry[] =
    (indexJson as { countries: CountryIndexEntry[] }).countries;

export const GLOBAL_ACTIONS: ActionList = globalActionsJson as unknown as ActionList;
export const GOVERNMENTAL_ACTIONS: ActionList = governmentalActionsJson as unknown as ActionList;
export const PERSONAL_ACTIONS: ActionList = personalActionsJson as unknown as ActionList;

// ── Lazy per-country loaders ───────────────────────────────────────────

// Vite-only: build-time glob gives { path: () => Promise<module> } for each JSON.
const countryLoaders = import.meta.glob<{ default: CountryProfile }>(
    '../../data/countries/data/*.json'
);

// Normalize loader keys to iso_a3 → loader.
const loaderByIso: Record<string, () => Promise<{ default: CountryProfile }>> = {};
for (const [path, loader] of Object.entries(countryLoaders)) {
    const m = path.match(/\/([a-z]{3})\.json$/);
    if (m) loaderByIso[m[1].toUpperCase()] = loader;
}

// In-memory cache: iso3 → profile (hot reload will wipe).
const profileCache = new Map<string, CountryProfile>();

/**
 * Fetch the rich profile for a country. Cached after first load.
 * Returns null if the ISO isn't one of the 30 covered countries.
 */
export async function loadCountry(iso3: string): Promise<CountryProfile | null> {
    const key = iso3.toUpperCase();
    const cached = profileCache.get(key);
    if (cached) return cached;

    const loader = loaderByIso[key];
    if (!loader) return null;

    const mod = await loader();
    profileCache.set(key, mod.default);
    return mod.default;
}

/** Synchronous accessor — returns the cached profile if already loaded. */
export function getCachedCountry(iso3: string): CountryProfile | null {
    return profileCache.get(iso3.toUpperCase()) ?? null;
}

/** Lookup a lightweight index entry by ISO-3 code. */
export function getCountryIndex(iso3: string): CountryIndexEntry | null {
    const key = iso3.toUpperCase();
    return COUNTRIES.find((c) => c.iso_a3 === key) ?? null;
}
