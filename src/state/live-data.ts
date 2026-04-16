/**
 * Shared Live Data Store — replaces (window as any) globals
 *
 * Centralized module-level state for live API data that multiple
 * renderers need access to (aurora reads Kp, globe reads events, etc.)
 */

import type { NaturalEvent } from '../services/api-client';

export const liveData = {
    /** Geomagnetic Kp index (0-9) — drives aurora intensity */
    kpIndex: 2,

    /** Active natural events from NASA EONET */
    naturalEvents: [] as NaturalEvent[],

    /** Sea level at The Battery, NYC (meters above MSL) */
    seaLevelNYC: 0,

    /** Global mean sea level rise (mm above 1993 baseline) */
    seaLevelGlobal: 0,

    /** Annual forest loss in hectares (Global Forest Watch / UMD) */
    forestLossHa: 0,

    /** UV Index global average (Open-Meteo multi-city) */
    uvIndex: 0,

    /** Recent biodiversity observations count (GBIF) */
    gbifRecentCount: 0,
};
