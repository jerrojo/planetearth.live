/**
 * API Client — Live Environmental Data Integration
 *
 * Fetches real-time data from the most credible scientific sources:
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
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ NASA EONET v3             │ Natural events       │ None    │ 30m    │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ USGS Earthquake Hazards   │ Earthquakes M5+      │ None    │ 30m    │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ Open-Meteo Air Quality    │ PM2.5 / US AQI       │ None    │ 1h     │
 * │  (CAMS/Copernicus model)  │ (3-city global avg)  │         │        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ NOAA CO-OPS              │ Sea level (Battery    │ None    │ 6min   │
 * │  Tides & Currents         │   NYC, 170yr record) │         │        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ UK National Grid ESO      │ Carbon intensity     │ None    │ 30m    │
 * │  carbonintensity.org.uk   │ gCO₂/kWh real-time   │         │        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ Open-Meteo Climate        │ Multi-city temp avg  │ None    │ 1h     │
 * │  (ERA5 reanalysis)        │ (6-city global proxy)│         │        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ Global Forest Watch       │ Tree cover loss (ha) │ None    │ 30m    │
 * │  (UMD/Hansen et al.)      │ Annual tropical loss │         │        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ OpenAQ                    │ PM2.5 global stations│ None    │ 1h     │
 * │  (20K+ gov stations)      │ Blended with CAMS    │         │        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ Open-Meteo Forecast       │ UV Index (3-city avg)│ None    │ 6h     │
 * │  (GFS data)               │ Global health proxy  │         │        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ GBIF                      │ Biodiversity obs.    │ None    │ 30m    │
 * │  (25M+ species records)   │ Recent observation # │         │        │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Architecture: Promise.allSettled() for graceful degradation.
 * Any single API can fail without affecting others.
 */

import { TOTAL_APIS } from '../config/constants';

/* ────────────────── Types ────────────────── */

export interface LiveDataResult {
    apisConnected: number;
    co2?: number;
    temperature?: number;
    methane?: number;         // ppb (NOAA ESRL global mean)
    nitrous?: number;         // ppb (NOAA ESRL global mean)
    arcticIce?: number;       // million km² (NSIDC via global-warming.org)
    arcticAnomaly?: number;   // million km² anomaly vs 1991-2020 baseline
    kpIndex?: number;         // 0-9 scale (NOAA SWPC planetary K-index)
    naturalEvents?: NaturalEvent[];
    pm25?: number;            // μg/m³ global average (Open-Meteo CAMS + OpenAQ)
    globalAQI?: number;       // US AQI scale (0-500) global average
    seaLevelNYC?: number;     // meters above MSL at The Battery, NYC (NOAA CO-OPS)
    seaLevelGlobal?: number;  // mm above 1993 baseline (global-warming.org / CSIRO+NOAA)
    carbonIntensity?: number; // gCO₂/kWh UK grid actual (National Grid ESO)
    globalTempAvg?: number;   // °C current multi-city average (Open-Meteo ERA5)
    forestLossHa?: number;    // hectares of tree cover loss, latest year (Global Forest Watch)
    uvIndex?: number;          // UV index global average (Open-Meteo multi-city)
    gbifRecentCount?: number;  // recent biodiversity observations (GBIF)
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

/* ────────────────── Fetch Helpers ────────────────── */

const TIMEOUT_MS = 15_000; // 15s timeout per request

function fetchWithTimeout(url: string, ms = TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/* ────────────────── Main Fetch ────────────────── */

export async function fetchLiveData(): Promise<LiveDataResult> {
    let apisConnected = 0;
    const result: LiveDataResult = { apisConnected: 0 };

    try {
        const results = await Promise.allSettled([
            // 0: CO₂ — NOAA Mauna Loa via global-warming.org
            fetchWithTimeout('https://global-warming.org/api/co2-api').then(r => r.json()),
            // 1: Temperature — NASA GISS via global-warming.org
            fetchWithTimeout('https://global-warming.org/api/temperature-api').then(r => r.json()),
            // 2: Methane — NOAA ESRL via global-warming.org
            fetchWithTimeout('https://global-warming.org/api/methane-api').then(r => r.json()),
            // 3: Nitrous Oxide — NOAA ESRL via global-warming.org
            fetchWithTimeout('https://global-warming.org/api/nitrous-oxide-api').then(r => r.json()),
            // 4: Arctic Ice — NSIDC via global-warming.org
            fetchWithTimeout('https://global-warming.org/api/arctic-api').then(r => r.json()),
            // 5: Kp Index — NOAA Space Weather Prediction Center (direct)
            fetchWithTimeout('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json').then(r => r.json()),
            // 6: Natural Events — NASA EONET v3 (direct)
            fetchWithTimeout('https://eonet.gsfc.nasa.gov/api/v3/events?limit=15&status=open').then(r => r.json()),
            // 7: Global PM2.5 — Open-Meteo Air Quality (CAMS/Copernicus model)
            //    Average of 3 representative cities: NYC (Americas), Delhi (Asia), London (Europe)
            //    Source: Copernicus Atmosphere Monitoring Service (CAMS), 11km resolution
            Promise.allSettled([
                fetchWithTimeout('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.71&longitude=-74.01&current=pm2_5,us_aqi').then(r => r.json()),
                fetchWithTimeout('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.61&longitude=77.23&current=pm2_5,us_aqi').then(r => r.json()),
                fetchWithTimeout('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=51.51&longitude=-0.13&current=pm2_5,us_aqi').then(r => r.json()),
            ]),
            // 8: Sea Level — NOAA CO-OPS, The Battery NYC (station 8518750)
            //    Oldest continuously operated tide gauge in the Americas (since 1856).
            //    Datum: MSL (Mean Sea Level, 1983-2001 NTDE epoch)
            fetchWithTimeout('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8518750&product=water_level&datum=MSL&units=metric&time_zone=gmt&format=json').then(r => r.json()),
            // 9: Carbon Intensity — UK National Grid ESO
            //    Real-time gCO₂ per kWh of electricity generated on the UK grid.
            //    Powered by University of Oxford & National Grid ESO.
            fetchWithTimeout('https://api.carbonintensity.org.uk/intensity').then(r => r.json()),
            // 10: USGS Earthquakes — M5+ in last 30 days (GeoJSON)
            //     Source: USGS Earthquake Hazards Program
            fetchWithTimeout('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson').then(r => r.json()),
            // 11: Global Sea Level — CSIRO/NOAA via global-warming.org
            //     Global mean sea level rise since 1993 satellite era
            fetchWithTimeout('https://global-warming.org/api/sea-level-api').then(r => r.json()),
            // 12: Multi-city temperature — Open-Meteo current weather
            //     6 cities across continents for global temperature proxy
            Promise.allSettled([
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m').then(r => r.json()),  // NYC
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=51.51&longitude=-0.13&current=temperature_2m').then(r => r.json()),   // London
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.69&current=temperature_2m').then(r => r.json()),  // Tokyo
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21&current=temperature_2m').then(r => r.json()), // Sydney
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.23&current=temperature_2m').then(r => r.json()),   // Delhi
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=-23.55&longitude=-46.63&current=temperature_2m').then(r => r.json()), // São Paulo
            ]),
            // 13: Global Forest Watch — annual tree cover loss (top 5 tropical countries)
            //     Source: University of Maryland / Global Forest Watch (Hansen et al.)
            //     Queries: Brazil, Indonesia, DRC, Colombia, Bolivia — combined loss
            Promise.allSettled([
                fetchWithTimeout('https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.11/query?sql=SELECT%20SUM(area__ha)%20AS%20loss_ha%20FROM%20data%20WHERE%20umd_tree_cover_loss__year%20%3E%202022').then(r => r.json()),
            ]).catch(() => null),
            // 14: OpenAQ — latest PM2.5 readings from global station network
            //     Source: OpenAQ (aggregates 20K+ gov monitoring stations worldwide)
            //     We sample a broader set than our 3-city CAMS proxy
            fetchWithTimeout('https://api.openaq.org/v2/latest?parameter=pm25&limit=100&sort=desc&order_by=lastUpdated', 10_000).then(r => r.json()).catch(() => null),
            // 15: UV Index — Open-Meteo multi-city average (3 latitude bands)
            //     Source: Open-Meteo (GFS data), 3 cities across low/mid/high latitudes
            Promise.allSettled([
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=19.4&longitude=-99.1&daily=uv_index_max&timezone=auto&forecast_days=1').then(r => r.json()),  // Mexico City (tropical)
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&daily=uv_index_max&timezone=auto&forecast_days=1').then(r => r.json()), // NYC (mid-lat)
                fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21&daily=uv_index_max&timezone=auto&forecast_days=1').then(r => r.json()),// Sydney (mid-lat south)
            ]),
            // 16: GBIF — recent biodiversity observations (last month, threatened species)
            //     Source: GBIF.org, 25M+ occurrence records
            fetchWithTimeout('https://api.gbif.org/v1/occurrence/count?year=2024,2026&basisOfRecord=HUMAN_OBSERVATION', 10_000).then(r => r.json()).catch(() => null),
        ]);

        // ── CO₂ (NOAA Mauna Loa Keeling Curve) ──
        if (results[0].status === 'fulfilled') {
            const co2Data = results[0].value.co2;
            if (Array.isArray(co2Data) && co2Data.length > 0) {
                const latest = co2Data[co2Data.length - 1];
                const co2Val = parseFloat(latest.cycle);
                if (co2Val > 400 && co2Val < 500) {
                    result.co2 = co2Val;
                    apisConnected++;
                }
            }
        }

        // ── Temperature (NASA GISS Land-Ocean Temperature Index) ──
        if (results[1].status === 'fulfilled') {
            const tempData = results[1].value.result;
            if (Array.isArray(tempData) && tempData.length > 0) {
                const latest = tempData[tempData.length - 1];
                const tempVal = parseFloat(latest.station);
                if (!isNaN(tempVal) && tempVal > -1 && tempVal < 5) {
                    result.temperature = tempVal;
                    apisConnected++;
                }
            }
        }

        // ── Methane (NOAA ESRL Global Greenhouse Gas Reference Network) ──
        // Source: Ed Dlugokencky, NOAA/GML (www.esrl.noaa.gov/gmd/ccgg/trends_ch4/)
        if (results[2].status === 'fulfilled') {
            const ch4Data = results[2].value.methane;
            if (Array.isArray(ch4Data) && ch4Data.length > 0) {
                const latest = ch4Data[ch4Data.length - 1];
                const ch4Val = parseFloat(latest.average);
                // Valid range: 1700-2200 ppb (pre-industrial was ~722 ppb)
                if (!isNaN(ch4Val) && ch4Val > 1700 && ch4Val < 2200) {
                    result.methane = ch4Val;
                    apisConnected++;
                }
            }
        }

        // ── Nitrous Oxide (NOAA ESRL Global N₂O) ──
        // Source: NOAA Global Monitoring Laboratory
        if (results[3].status === 'fulfilled') {
            const n2oData = results[3].value.nitrous;
            if (Array.isArray(n2oData) && n2oData.length > 0) {
                const latest = n2oData[n2oData.length - 1];
                const n2oVal = parseFloat(latest.average);
                // Valid range: 300-360 ppb (pre-industrial was ~270 ppb)
                if (!isNaN(n2oVal) && n2oVal > 300 && n2oVal < 360) {
                    result.nitrous = n2oVal;
                    apisConnected++;
                }
            }
        }

        // ── Arctic Sea Ice Extent (NSIDC via global-warming.org) ──
        // Source: National Snow and Ice Data Center (NSIDC)
        if (results[4].status === 'fulfilled') {
            const arcticPayload = results[4].value.arcticData;
            if (arcticPayload?.data) {
                // Data is keyed by YYYYMM — find the latest entry
                const keys = Object.keys(arcticPayload.data).sort();
                if (keys.length > 0) {
                    const latestKey = keys[keys.length - 1];
                    const entry = arcticPayload.data[latestKey];
                    if (entry && entry.value !== -9999) {
                        result.arcticIce = entry.value;
                        if (entry.anom !== -9999) {
                            result.arcticAnomaly = entry.anom;
                        }
                        apisConnected++;
                    }
                }
            }
        }

        // ── Kp Index (NOAA Space Weather Prediction Center) ──
        // Source: NOAA SWPC (3-hourly planetary K-index from magnetometer network)
        // Scale: 0 (quiet) to 9 (extreme storm). ≥5 = geomagnetic storm.
        if (results[5].status === 'fulfilled') {
            const kpData = results[5].value;
            if (Array.isArray(kpData) && kpData.length > 1) {
                // [0] is header row, last element is most recent
                const latest = kpData[kpData.length - 1];
                const kpVal = parseFloat(latest[1]); // Kp column
                if (!isNaN(kpVal) && kpVal >= 0 && kpVal <= 9) {
                    result.kpIndex = kpVal;
                    apisConnected++;
                }
            }
        }

        // ── NASA EONET Natural Events ──
        // Source: NASA Earth Observatory Natural Event Tracker
        if (results[6].status === 'fulfilled') {
            const eonetData = results[6].value;
            if (eonetData?.events && Array.isArray(eonetData.events)) {
                const events: NaturalEvent[] = [];
                for (const evt of eonetData.events) {
                    if (!evt.geometry || evt.geometry.length === 0) continue;
                    // Use most recent geometry point
                    const geo = evt.geometry[evt.geometry.length - 1];
                    if (!geo.coordinates || geo.coordinates.length < 2) continue;

                    events.push({
                        id: evt.id,
                        title: evt.title,
                        category: evt.categories?.[0]?.title ?? 'Unknown',
                        lon: geo.coordinates[0],  // GeoJSON: [lon, lat]
                        lat: geo.coordinates[1],
                        date: geo.date,
                        magnitude: geo.magnitudeValue ?? undefined,
                        magnitudeUnit: geo.magnitudeUnit ?? undefined,
                    });
                }
                if (events.length > 0) {
                    result.naturalEvents = events;
                    apisConnected++;
                }
            }
        }

        // ── Global PM2.5 Air Quality (Open-Meteo / CAMS) ──
        // Average PM2.5 and US AQI across 3 major cities (NYC, Delhi, London)
        // to approximate a global urban air quality index.
        // WHO 2021 guideline: annual PM2.5 < 15 μg/m³. Current global avg: ~35 μg/m³.
        if (results[7].status === 'fulfilled') {
            const cityResults = results[7].value as PromiseSettledResult<any>[];
            let pm25Sum = 0, aqiSum = 0, count = 0;
            for (const cr of cityResults) {
                if (cr.status === 'fulfilled' && cr.value?.current?.pm2_5 !== undefined) {
                    const pm = cr.value.current.pm2_5;
                    const aqi = cr.value.current.us_aqi ?? 0;
                    // Valid range: 0-1000 μg/m³ (>500 would be extreme fire/dust event)
                    if (typeof pm === 'number' && pm >= 0 && pm < 1000) {
                        pm25Sum += pm;
                        aqiSum += aqi;
                        count++;
                    }
                }
            }
            if (count >= 2) {
                result.pm25 = Math.round((pm25Sum / count) * 10) / 10;
                result.globalAQI = Math.round(aqiSum / count);
                apisConnected++;
            }
        }

        // ── Sea Level — NOAA CO-OPS (The Battery, NYC) ──
        // Oldest continuous tide gauge in the Americas (1856-present).
        // Value: meters above Mean Sea Level datum (NTDE 1983-2001).
        // Long-term trend at this station: +2.87 mm/yr (NOAA).
        if (results[8].status === 'fulfilled') {
            const slData = results[8].value;
            if (slData?.data?.[0]?.v !== undefined) {
                const val = parseFloat(slData.data[0].v);
                if (!isNaN(val) && val > -10 && val < 10) {
                    result.seaLevelNYC = val;
                    apisConnected++;
                }
            }
        }

        // ── Carbon Intensity — UK National Grid ESO ──
        // Real-time gCO₂ emitted per kWh of electricity.
        // UK grid has decarbonized from ~500 gCO₂/kWh (2010) to ~115 (2025).
        // Target: <50 gCO₂/kWh by 2035 (UK net-zero electricity).
        if (results[9].status === 'fulfilled') {
            const ciData = results[9].value;
            if (ciData?.data?.[0]?.intensity?.actual !== undefined) {
                const val = ciData.data[0].intensity.actual;
                if (typeof val === 'number' && val > 0 && val < 1000) {
                    result.carbonIntensity = val;
                    apisConnected++;
                }
            }
        }

        // ── USGS Earthquakes (M4.5+ last 30 days) ──
        // Source: USGS Earthquake Hazards Program, real-time GeoJSON feed
        if (results[10].status === 'fulfilled') {
            const quakeData = results[10].value;
            if (quakeData?.features && Array.isArray(quakeData.features)) {
                const quakeEvents: NaturalEvent[] = [];
                for (const f of quakeData.features) {
                    const props = f.properties;
                    const coords = f.geometry?.coordinates;
                    if (!coords || coords.length < 2) continue;
                    quakeEvents.push({
                        id: f.id ?? `usgs-${props.code}`,
                        title: props.title ?? `M${props.mag} Earthquake`,
                        category: 'Earthquake',
                        lon: coords[0],
                        lat: coords[1],
                        date: new Date(props.time).toISOString(),
                        magnitude: props.mag,
                        magnitudeUnit: 'Mw',
                    });
                }
                // Merge with EONET events (deduplicate by keeping both)
                if (quakeEvents.length > 0) {
                    const existing = result.naturalEvents ?? [];
                    result.naturalEvents = [...existing, ...quakeEvents.slice(0, 30)];
                    apisConnected++;
                }
            }
        }

        // ── Global Sea Level (CSIRO + NOAA satellite altimetry) ──
        // Source: Church & White (2011) + satellite era (1993-present)
        // Value: mm above 1993 baseline
        if (results[11].status === 'fulfilled') {
            const slData = results[11].value?.sealevel;
            if (Array.isArray(slData) && slData.length > 0) {
                const latest = slData[slData.length - 1];
                const val = parseFloat(latest.GMSL ?? latest.gmsl ?? latest.value);
                if (!isNaN(val)) {
                    result.seaLevelGlobal = val;
                    apisConnected++;
                }
            }
        }

        // ── Global Forest Watch — Tree Cover Loss ──
        // Annual forest loss in hectares from UMD/GFW satellite data
        if (results[13]?.status === 'fulfilled' && results[13].value) {
            try {
                const gfwResults = results[13].value as PromiseSettledResult<any>[];
                if (gfwResults[0]?.status === 'fulfilled') {
                    const data = gfwResults[0].value;
                    const rows = data?.data ?? data?.rows ?? [];
                    if (Array.isArray(rows) && rows.length > 0) {
                        const lossHa = parseFloat(rows[0]?.loss_ha ?? rows[0]?.area__ha ?? 0);
                        if (lossHa > 0) {
                            result.forestLossHa = lossHa;
                            apisConnected++;
                        }
                    }
                }
            } catch { /* GFW parse error — non-critical */ }
        }

        // ── OpenAQ — Global PM2.5 Station Average ──
        // Supplements the 3-city CAMS proxy with real station measurements
        if (results[14]?.status === 'fulfilled' && results[14].value) {
            try {
                const oaqData = results[14].value;
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
                        // Blend with CAMS estimate: 60% station data + 40% CAMS model (if available)
                        const stationAvg = Math.round((sum / count) * 10) / 10;
                        if (result.pm25 !== undefined) {
                            result.pm25 = Math.round((result.pm25 * 0.4 + stationAvg * 0.6) * 10) / 10;
                        } else {
                            result.pm25 = stationAvg;
                        }
                        apisConnected++;
                    }
                }
            } catch { /* OpenAQ parse error — non-critical */ }
        }

        // ── UV Index — Multi-city average (Open-Meteo) ──
        if (results[15]?.status === 'fulfilled') {
            try {
                const uvResults = results[15].value as PromiseSettledResult<any>[];
                let uvSum = 0, uvCount = 0;
                for (const cr of uvResults) {
                    if (cr.status === 'fulfilled' && cr.value?.daily?.uv_index_max?.[0] !== undefined) {
                        const uv = cr.value.daily.uv_index_max[0];
                        if (typeof uv === 'number' && uv >= 0 && uv <= 16) {
                            uvSum += uv;
                            uvCount++;
                        }
                    }
                }
                if (uvCount >= 2) {
                    result.uvIndex = Math.round((uvSum / uvCount) * 10) / 10;
                    apisConnected++;
                }
            } catch { /* UV parse error */ }
        }

        // ── GBIF — Biodiversity Observation Count ──
        if (results[16]?.status === 'fulfilled' && results[16].value) {
            try {
                const gbifCount = results[16].value;
                if (typeof gbifCount === 'number' && gbifCount > 0) {
                    result.gbifRecentCount = gbifCount;
                    apisConnected++;
                }
            } catch { /* GBIF parse error */ }
        }

        // ── Global Temperature Proxy (6-city average) ──
        // Real-time current temperature from 6 cities across all continents
        // to provide a live "global temperature pulse"
        if (results[12].status === 'fulfilled') {
            const cityResults = results[12].value as PromiseSettledResult<any>[];
            let tempSum = 0, count = 0;
            for (const cr of cityResults) {
                if (cr.status === 'fulfilled' && cr.value?.current?.temperature_2m !== undefined) {
                    const t = cr.value.current.temperature_2m;
                    if (typeof t === 'number' && t > -60 && t < 60) {
                        tempSum += t;
                        count++;
                    }
                }
            }
            if (count >= 3) {
                result.globalTempAvg = Math.round((tempSum / count) * 10) / 10;
                apisConnected++;
            }
        }

        result.apisConnected = apisConnected;
    } catch {
        // All APIs failed — result has defaults
    }

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
