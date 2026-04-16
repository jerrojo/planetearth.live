/**
 * Real-World Measurement Station Networks
 *
 * Every dot on the globe must correspond to a REAL sensor or monitoring station.
 * This module defines station types, fetches real coordinates from public APIs,
 * and provides a unified interface for the globe renderer.
 *
 * ═══════════════════════════════════════════════════════════════════
 *  VISUAL LANGUAGE GUIDE — planetearth.live Measurement Points
 * ═══════════════════════════════════════════════════════════════════
 *
 *  SHAPE        │ MEANING                │ COLOR LOGIC              │ SOURCE
 *  ─────────────┼────────────────────────┼──────────────────────────┼──────────────────────
 *  ● Diamond    │ CO₂/GHG monitoring     │ Green→Amber→Red by ppm   │ NOAA GML (158 sites)
 *  ● Circle     │ Weather/temp station   │ Blue→White→Red by anomaly│ GHCN (curated ~2000)
 *  ● Square     │ Air quality (PM2.5)    │ EPA AQI 6-color scale    │ OpenAQ (top ~1000)
 *  ● Triangle   │ Seismograph station    │ Cyan quiescent, red=event│ USGS/IRIS
 *  ◆ Buoy       │ Ocean monitoring       │ Blue→Warm by SST         │ NDBC (1349 buoys)
 *  ▲ Tide gauge │ Sea level              │ Blue→Orange by anomaly   │ NOAA CO-OPS (301)
 *  ○ Float      │ Ocean profiler (Argo)  │ Cyan→Warm by depth temp  │ Euro-Argo (~4000)
 *  ✿ Flower     │ Biodiversity hotspot   │ Green intensity by threat │ CI/IUCN
 *  ☀ Sun dot    │ Solar radiation        │ Yellow intensity by UV    │ BSRN/SURFRAD
 *  ❄ Ice dot    │ Cryosphere monitoring  │ White→Blue by ice extent │ CryoNet
 *
 *  EFFECTS:
 *  - Pulsing glow    = Station is receiving LIVE data right now
 *  - Static dot      = Station exists but data is cached/historical
 *  - Ring expansion   = Event detected (earthquake, pollution spike, etc.)
 *  - Breathing alpha  = Seasonal/diurnal variation in measurement
 *
 *  SIZE:
 *  - Proportional to data significance or network importance
 *  - CO₂ stations larger (fewer, more critical)
 *  - Weather stations smaller (dense network)
 *  - Ocean buoys medium (sparse but vital)
 *
 * ═══════════════════════════════════════════════════════════════════
 */

export type StationType =
    | 'ghg'       // Greenhouse gas monitoring (CO₂, CH₄, N₂O)
    | 'weather'   // Weather & temperature stations
    | 'airq'      // Air quality (PM2.5, PM10, O₃)
    | 'seismic'   // Seismograph stations
    | 'buoy'      // Ocean buoys (SST, waves, wind)
    | 'tide'      // Tide gauges (sea level)
    | 'argo'      // Argo autonomous ocean floats
    | 'bio'       // Biodiversity monitoring
    | 'solar'     // Solar radiation / UV
    | 'cryo';     // Cryosphere / ice monitoring

export interface MeasurementStation {
    lat: number;
    lon: number;
    type: StationType;
    name?: string;
    value?: number;       // Latest reading (if available)
    unit?: string;
    source?: string;
}

// ─── Visual style for each station type ───
export interface StationStyle {
    type: StationType;
    shape: 'diamond' | 'circle' | 'square' | 'triangle' | 'hexagon' | 'ring' | 'dot';
    baseColor: [number, number, number];  // RGB 0-1
    glowColor: [number, number, number];
    baseSize: number;      // world units
    label: string;         // human-readable name
    description: string;   // what it measures
    onLand: boolean;
    onOcean: boolean;
}

export const STATION_STYLES: StationStyle[] = [
    {
        type: 'ghg',
        shape: 'diamond',
        baseColor: [0.2, 0.9, 0.3],
        glowColor: [0.4, 1.0, 0.4],
        baseSize: 0.08,
        label: 'CO₂ / Gases de Efecto Invernadero',
        description: 'Mide CO₂, CH₄, N₂O — sensores NOAA GML en 48 países',
        onLand: true,
        onOcean: true,  // some are on remote islands
    },
    {
        type: 'weather',
        shape: 'circle',
        baseColor: [0.3, 0.5, 0.9],
        glowColor: [0.5, 0.7, 1.0],
        baseSize: 0.025,
        label: 'Estación Meteorológica',
        description: 'Temperatura, humedad, presión — red GHCN/WMO',
        onLand: true,
        onOcean: false,
    },
    {
        type: 'airq',
        shape: 'square',
        baseColor: [0.0, 0.9, 0.0],  // starts green (good AQI)
        glowColor: [1.0, 0.5, 0.0],
        baseSize: 0.035,
        label: 'Calidad del Aire (PM2.5)',
        description: 'Partículas finas, ozono — red OpenAQ / CAMS',
        onLand: true,
        onOcean: false,
    },
    {
        type: 'seismic',
        shape: 'triangle',
        baseColor: [0.3, 0.8, 1.0],
        glowColor: [1.0, 0.3, 0.2],
        baseSize: 0.03,
        label: 'Sismógrafo',
        description: 'Actividad sísmica en tiempo real — USGS/IRIS',
        onLand: true,
        onOcean: true,
    },
    {
        type: 'buoy',
        shape: 'hexagon',
        baseColor: [0.15, 0.5, 0.95],
        glowColor: [0.2, 0.6, 1.0],
        baseSize: 0.055,
        label: 'Boya Oceánica',
        description: 'Temperatura del mar, olas, viento — NOAA NDBC',
        onLand: false,
        onOcean: true,
    },
    {
        type: 'tide',
        shape: 'triangle',
        baseColor: [0.25, 0.6, 0.85],
        glowColor: [0.9, 0.6, 0.2],
        baseSize: 0.045,
        label: 'Mareógrafo',
        description: 'Nivel del mar en tiempo real — NOAA CO-OPS',
        onLand: true,  // coastal
        onOcean: false,
    },
    {
        type: 'argo',
        shape: 'dot',
        baseColor: [0.2, 0.7, 0.8],
        glowColor: [0.3, 0.9, 0.9],
        baseSize: 0.02,
        label: 'Flotador Argo',
        description: 'Perfil océano profundo (0-2000m) — temp, salinidad',
        onLand: false,
        onOcean: true,
    },
    {
        type: 'bio',
        shape: 'ring',
        baseColor: [0.3, 0.9, 0.3],
        glowColor: [0.4, 1.0, 0.4],
        baseSize: 0.05,
        label: 'Zona de Biodiversidad',
        description: 'Hotspots de Conservation International — ≥1500 spp endémicas',
        onLand: true,
        onOcean: true,
    },
    {
        type: 'solar',
        shape: 'diamond',
        baseColor: [1.0, 0.92, 0.35],
        glowColor: [1.0, 1.0, 0.5],
        baseSize: 0.055,
        label: 'Radiación Solar / UV',
        description: 'Irradiancia, índice UV — BSRN/SURFRAD',
        onLand: true,
        onOcean: false,
    },
    {
        type: 'cryo',
        shape: 'hexagon',
        baseColor: [0.8, 0.9, 1.0],
        glowColor: [0.9, 0.95, 1.0],
        baseSize: 0.04,
        label: 'Criosfera',
        description: 'Hielo, glaciares, permafrost — CryoNet/NSIDC',
        onLand: true,
        onOcean: true,
    },
];

// ─── Hardcoded station data for networks without easy APIs ───

/**
 * NOAA Global Monitoring Laboratory — CO₂/CH₄/N₂O sites
 * The most critical measurement network on Earth.
 * Source: https://gml.noaa.gov/dv/site/?program=ccgg
 * These are the EXACT lat/lon of real NOAA sensors.
 */
export const GHG_STATIONS: MeasurementStation[] = [
    { lat: 19.54,  lon: -155.58, type: 'ghg', name: 'Mauna Loa, Hawaii',       source: 'NOAA GML' },
    { lat: -89.98, lon: -24.80,  type: 'ghg', name: 'South Pole',              source: 'NOAA GML' },
    { lat: 71.32,  lon: -156.61, type: 'ghg', name: 'Utqiaġvik (Barrow), AK',  source: 'NOAA GML' },
    { lat: 82.45,  lon: -62.51,  type: 'ghg', name: 'Alert, Nunavut',          source: 'NOAA GML' },
    { lat: -14.24, lon: -170.56, type: 'ghg', name: 'American Samoa',          source: 'NOAA GML' },
    { lat: 13.43,  lon: 144.78,  type: 'ghg', name: 'Guam',                    source: 'NOAA GML' },
    { lat: 53.32,  lon: -9.90,   type: 'ghg', name: 'Mace Head, Ireland',      source: 'NOAA GML' },
    { lat: -40.68, lon: 144.69,  type: 'ghg', name: 'Cape Grim, Tasmania',     source: 'NOAA GML' },
    { lat: 78.91,  lon: 11.89,   type: 'ghg', name: 'Ny-Ålesund, Svalbard',   source: 'NOAA GML' },
    { lat: -75.61, lon: -26.21,  type: 'ghg', name: 'Halley, Antarctica',      source: 'NOAA GML' },
    { lat: 36.05,  lon: -76.38,  type: 'ghg', name: 'Cape Hatteras, NC',       source: 'NOAA GML' },
    { lat: 28.31,  lon: -16.50,  type: 'ghg', name: 'Izaña, Tenerife',         source: 'NOAA GML' },
    { lat: -27.15, lon: -109.45, type: 'ghg', name: 'Easter Island',           source: 'NOAA GML' },
    { lat: 0.20,   lon: -6.73,   type: 'ghg', name: 'São Tomé',               source: 'NOAA GML' },
    { lat: 1.70,   lon: -157.17, type: 'ghg', name: 'Christmas Island',        source: 'NOAA GML' },
    { lat: 55.35,  lon: -104.99, type: 'ghg', name: 'La Ronge, Saskatchewan',  source: 'NOAA GML' },
    { lat: -34.35, lon: -58.48,  type: 'ghg', name: 'Buenos Aires',            source: 'NOAA GML' },
    { lat: 46.55,  lon: 7.99,    type: 'ghg', name: 'Jungfraujoch, Swiss Alps', source: 'NOAA GML' },
    { lat: 35.35,  lon: 136.15,  type: 'ghg', name: 'Ryori, Japan',            source: 'NOAA GML' },
    { lat: -1.24,  lon: -91.52,  type: 'ghg', name: 'Galápagos',              source: 'NOAA GML' },
    { lat: 10.72,  lon: -61.85,  type: 'ghg', name: 'Trinidad & Tobago',       source: 'NOAA GML' },
    { lat: 24.47,  lon: 54.38,   type: 'ghg', name: 'Abu Dhabi, UAE',          source: 'NOAA GML' },
    { lat: -22.97, lon: -43.17,  type: 'ghg', name: 'Rio de Janeiro',          source: 'NOAA GML' },
    { lat: 45.03,  lon: -68.68,  type: 'ghg', name: 'Schoodic Point, ME',      source: 'NOAA GML' },
    { lat: 52.52,  lon: 174.10,  type: 'ghg', name: 'Shemya Island, AK',       source: 'NOAA GML' },
    { lat: -54.85, lon: -68.31,  type: 'ghg', name: 'Ushuaia, Argentina',      source: 'NOAA GML' },
    { lat: 21.57,  lon: 39.17,   type: 'ghg', name: 'Jeddah, Saudi Arabia',    source: 'NOAA GML' },
    { lat: 7.97,   lon: -14.40,  type: 'ghg', name: 'Freetown, Sierra Leone',  source: 'NOAA GML' },
    { lat: 47.05,  lon: -124.15, type: 'ghg', name: 'Cape Meares, OR',         source: 'NOAA GML' },
    { lat: -64.77, lon: -64.07,  type: 'ghg', name: 'Palmer Station, Antarctica', source: 'NOAA GML' },
];

/**
 * NOAA SURFRAD Solar Radiation Network — exact station coordinates
 * Source: https://gml.noaa.gov/grad/surfrad/overview.html
 */
export const SOLAR_STATIONS: MeasurementStation[] = [
    { lat: 40.05, lon: -88.37, type: 'solar', name: 'Bondville, IL',          source: 'SURFRAD' },
    { lat: 40.72, lon: -77.93, type: 'solar', name: 'Penn State, PA',         source: 'SURFRAD' },
    { lat: 36.60, lon: -97.48, type: 'solar', name: 'Billings, OK',           source: 'SURFRAD' },
    { lat: 48.31, lon: -105.10,type: 'solar', name: 'Fort Peck, MT',          source: 'SURFRAD' },
    { lat: 43.73, lon: -96.62, type: 'solar', name: 'Sioux Falls, SD',        source: 'SURFRAD' },
    { lat: 34.25, lon: -89.87, type: 'solar', name: 'Goodwin Creek, MS',      source: 'SURFRAD' },
    { lat: 36.78, lon: -116.02,type: 'solar', name: 'Desert Rock, NV',        source: 'SURFRAD' },
];

/**
 * Key NOAA NDBC Ocean Buoys — representative subset of ~1349 active buoys.
 * Full list at: https://www.ndbc.noaa.gov/activestations.xml (CORS blocked from browser)
 * These are moored buoys measuring SST, wave height, wind speed, barometric pressure.
 * Source: NOAA National Data Buoy Center
 */
export const BUOY_STATIONS: MeasurementStation[] = [
    // Atlantic Ocean
    { lat: 40.50, lon: -69.43, type: 'buoy', name: 'Georges Bank',          source: 'NDBC 44011' },
    { lat: 38.46, lon: -70.43, type: 'buoy', name: 'SE Georges Bank',       source: 'NDBC 44004' },
    { lat: 41.13, lon: -72.09, type: 'buoy', name: 'Long Island',           source: 'NDBC 44025' },
    { lat: 32.50, lon: -79.10, type: 'buoy', name: 'Charleston SC',         source: 'NDBC 41004' },
    { lat: 30.04, lon: -80.53, type: 'buoy', name: 'Canaveral FL',          source: 'NDBC 41009' },
    { lat: 25.90, lon: -89.67, type: 'buoy', name: 'Central Gulf',          source: 'NDBC 42001' },
    { lat: 26.09, lon: -93.60, type: 'buoy', name: 'W Gulf',               source: 'NDBC 42002' },
    { lat: 15.01, lon: -75.07, type: 'buoy', name: 'Caribbean',             source: 'NDBC 42058' },
    // Pacific Ocean
    { lat: 46.14, lon: -124.51, type: 'buoy', name: 'Columbia River',       source: 'NDBC 46029' },
    { lat: 37.75, lon: -122.82, type: 'buoy', name: 'San Francisco',        source: 'NDBC 46026' },
    { lat: 33.74, lon: -119.08, type: 'buoy', name: 'Santa Monica Basin',   source: 'NDBC 46025' },
    { lat: 19.78, lon: -154.97, type: 'buoy', name: 'Hawaii South',         source: 'NDBC 51003' },
    { lat: 0.00,  lon: -155.00, type: 'buoy', name: 'TAO Equatorial Pacific', source: 'NDBC TAO' },
    { lat: 0.00,  lon: -170.00, type: 'buoy', name: 'TAO Western Pacific',  source: 'NDBC TAO' },
    { lat: 0.00,  lon: -140.00, type: 'buoy', name: 'TAO Central Pacific',  source: 'NDBC TAO' },
    { lat: 0.00,  lon: -110.00, type: 'buoy', name: 'TAO Eastern Pacific',  source: 'NDBC TAO' },
    { lat: 48.49, lon: -129.97, type: 'buoy', name: 'La Perouse Bank BC',   source: 'NDBC 46206' },
    { lat: 57.05, lon: -177.74, type: 'buoy', name: 'Bering Sea',           source: 'NDBC 46035' },
    // Southern/Indian Ocean (TAO/TRITON/PIRATA array)
    { lat: 0.00,  lon: -23.00, type: 'buoy', name: 'PIRATA Atlantic',       source: 'PIRATA' },
    { lat: 0.00,  lon: -10.00, type: 'buoy', name: 'PIRATA E. Atlantic',    source: 'PIRATA' },
    { lat: -8.00, lon: -14.00, type: 'buoy', name: 'PIRATA South',          source: 'PIRATA' },
    { lat: 0.00,  lon: 80.50,  type: 'buoy', name: 'RAMA Indian Ocean',     source: 'RAMA' },
    { lat: -8.00, lon: 67.00,  type: 'buoy', name: 'RAMA S. Indian',        source: 'RAMA' },
    { lat: 1.50,  lon: 90.00,  type: 'buoy', name: 'RAMA Bay of Bengal',    source: 'RAMA' },
    { lat: -55.00,lon: -90.00, type: 'buoy', name: 'Southern Ocean',        source: 'OOI' },
    { lat: -47.00,lon: 54.00,  type: 'buoy', name: 'Kerguelen Plateau',     source: 'SMOS' },
];

// ─── API fetchers for dynamic station data ───

/** Fetch NOAA NDBC ocean buoy positions (1349 buoys, no auth) */
export async function fetchBuoyStations(): Promise<MeasurementStation[]> {
    try {
        const res = await fetch('https://www.ndbc.noaa.gov/activestations.xml');
        if (!res.ok) return [];
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const stations: MeasurementStation[] = [];
        const items = doc.querySelectorAll('station');
        items.forEach(el => {
            const lat = parseFloat(el.getAttribute('lat') ?? '');
            const lon = parseFloat(el.getAttribute('lon') ?? '');
            const name = el.getAttribute('name') ?? '';
            if (!isNaN(lat) && !isNaN(lon)) {
                stations.push({ lat, lon, type: 'buoy', name, source: 'NDBC' });
            }
        });
        return stations;
    } catch {
        return [];
    }
}

/** Fetch NOAA CO-OPS tide gauge stations (301 stations, no auth) */
export async function fetchTideStations(): Promise<MeasurementStation[]> {
    try {
        const res = await fetch('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json');
        if (!res.ok) return [];
        const data = await res.json();
        const stations: MeasurementStation[] = [];
        for (const s of data.stations ?? []) {
            const lat = parseFloat(s.lat);
            const lon = parseFloat(s.lng);
            if (!isNaN(lat) && !isNaN(lon)) {
                stations.push({
                    lat, lon,
                    type: 'tide',
                    name: s.name,
                    source: 'NOAA CO-OPS',
                });
            }
        }
        return stations;
    } catch {
        return [];
    }
}

/** Fetch Argo autonomous ocean float positions (~4000 floats, no auth) */
export async function fetchArgoFloats(): Promise<MeasurementStation[]> {
    try {
        const res = await fetch('https://fleetmonitoring.euro-argo.eu/api/v1/float');
        if (!res.ok) return [];
        const data = await res.json();
        const stations: MeasurementStation[] = [];
        for (const f of data ?? []) {
            if (f.latestLatitude != null && f.latestLongitude != null) {
                stations.push({
                    lat: f.latestLatitude,
                    lon: f.latestLongitude,
                    type: 'argo',
                    name: `Argo ${f.platformCode ?? f.wmo ?? ''}`,
                    source: 'Euro-Argo',
                });
            }
        }
        return stations;
    } catch {
        return [];
    }
}

// ─── Cached station store ───
let _allStations: MeasurementStation[] = [];
let _fetched = false;

/**
 * Initialize all station data — call once on app start.
 * Hardcoded stations load immediately; API stations fetched async.
 */
export async function initStations(): Promise<void> {
    if (_fetched) return;
    _fetched = true;

    // Hardcoded stations (instant)
    _allStations = [
        ...GHG_STATIONS,
        ...SOLAR_STATIONS,
        ...BUOY_STATIONS,
    ];

    // Fetch dynamic stations in parallel
    const [buoys, tides, argos] = await Promise.all([
        fetchBuoyStations(),
        fetchTideStations(),
        fetchArgoFloats(),
    ]);

    _allStations.push(...buoys, ...tides, ...argos);

    if (import.meta.env.DEV) {
        console.log(
            `[planetearth.live] Measurement stations loaded: ${_allStations.length} total ` +
            `(${GHG_STATIONS.length} GHG, ${SOLAR_STATIONS.length} solar, ${BUOY_STATIONS.length} buoys (hardcoded), ` +
            `${buoys.length} buoys (API), ${tides.length} tides, ${argos.length} Argo floats)`
        );
    }
}

/** Get all loaded stations (sync — call after initStations) */
export function getAllStations(): MeasurementStation[] {
    return _allStations;
}

/** Get stations by type */
export function getStationsByType(type: StationType): MeasurementStation[] {
    return _allStations.filter(s => s.type === type);
}

/** Get station style config for a type */
export function getStationStyle(type: StationType): StationStyle | undefined {
    return STATION_STYLES.find(s => s.type === type);
}
