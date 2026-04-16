/**
 * Live USGS Earthquake Feed — fetches real seismic events.
 * Source: USGS Earthquake Hazards Program (no auth required).
 * Feed: magnitude 2.5+ events from the last 24 hours (fine-grained feed for pulse-ring
 * visualization; see src/services/api-client.ts for the broader M4.5+/30-day feed).
 */

export interface Earthquake {
    lat: number;
    lon: number;
    depth: number;    // km
    mag: number;       // magnitude
    place: string;
    time: number;      // unix ms
}

/** Minimal GeoJSON feature shape we consume from USGS */
interface UsgsFeature {
    geometry: { coordinates: [number, number, number] };
    properties: { mag: number; place?: string; time: number };
}

interface UsgsFeatureCollection {
    features?: UsgsFeature[];
}

const FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

let cachedQuakes: Earthquake[] = [];
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchEarthquakes(): Promise<Earthquake[]> {
    const now = Date.now();
    if (cachedQuakes.length > 0 && now - lastFetch < CACHE_DURATION) {
        return cachedQuakes;
    }

    try {
        const res = await fetch(FEED_URL);
        if (!res.ok) return cachedQuakes;

        const data = await res.json() as UsgsFeatureCollection;
        cachedQuakes = (data.features ?? []).map((f) => ({
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            depth: f.geometry.coordinates[2],
            mag: f.properties.mag,
            place: f.properties.place ?? '',
            time: f.properties.time,
        }));
        lastFetch = now;
    } catch {
        // Network error — use cache or empty
    }

    return cachedQuakes;
}

/** Get cached earthquakes synchronously (for render loop) */
export function getCachedEarthquakes(): Earthquake[] {
    return cachedQuakes;
}
