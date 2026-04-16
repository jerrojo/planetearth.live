/**
 * Scientific Color Scales — IPCC AR6 + EPA AQI standards.
 * Sources: IPCC-WG1/colormaps, Crameri (2020), EPA AirNow.
 */

/** Linearly interpolate between two RGB colors */
function lerpRGB(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ];
}

/** Sample a color scale at position t (0..1) — returns [r, g, b] in 0..1 range */
function sampleScale(stops: [number, number, number][], t: number): [number, number, number] {
    const clamped = Math.max(0, Math.min(1, t));
    const idx = clamped * (stops.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, stops.length - 1);
    return lerpRGB(stops[lo], stops[hi], idx - lo);
}

// ─── IPCC AR6 Temperature Anomaly (diverging: cold blue → white → hot red) ───
const TEMP_ANOMALY_STOPS: [number, number, number][] = [
    [0.020, 0.188, 0.380],  // #053061  -4°C
    [0.220, 0.392, 0.545],  // #386AB2  -3°C
    [0.380, 0.639, 0.796],  // #61A3CB  -2°C
    [0.698, 0.816, 0.902],  // #B2D0E6  -1°C
    [0.973, 0.973, 0.973],  // #F8F8F8   0°C
    [0.929, 0.804, 0.757],  // #EDCDC1  +1°C
    [0.859, 0.475, 0.412],  // #DB7969  +2°C
    [0.761, 0.267, 0.259],  // #C24442  +3°C
    [0.404, 0.000, 0.122],  // #67001F  +4°C
];

/** Temperature anomaly: value in °C (range -4 to +4), returns [r,g,b] 0..1 */
export function tempAnomalyColor(anomalyC: number): [number, number, number] {
    const t = (anomalyC + 4) / 8; // map -4..+4 → 0..1
    return sampleScale(TEMP_ANOMALY_STOPS, t);
}

// ─── EPA AQI Color Scale ───
const AQI_STOPS: { max: number; color: [number, number, number] }[] = [
    { max: 50,  color: [0.000, 0.894, 0.000] },  // #00E400 Good
    { max: 100, color: [1.000, 1.000, 0.000] },  // #FFFF00 Moderate
    { max: 150, color: [1.000, 0.494, 0.000] },  // #FF7E00 USG
    { max: 200, color: [1.000, 0.000, 0.000] },  // #FF0000 Unhealthy
    { max: 300, color: [0.561, 0.247, 0.592] },  // #8F3F97 Very Unhealthy
    { max: 500, color: [0.494, 0.000, 0.137] },  // #7E0023 Hazardous
];

/** AQI index (0-500) → [r,g,b] 0..1 */
export function aqiColor(aqi: number): [number, number, number] {
    for (let i = 0; i < AQI_STOPS.length; i++) {
        if (aqi <= AQI_STOPS[i].max) {
            if (i === 0) return AQI_STOPS[0].color;
            const prev = AQI_STOPS[i - 1];
            const curr = AQI_STOPS[i];
            const t = (aqi - prev.max) / (curr.max - prev.max);
            return lerpRGB(prev.color, curr.color, t);
        }
    }
    return AQI_STOPS[AQI_STOPS.length - 1].color;
}

// ─── Seismic magnitude → color (blue-cyan to red for strong) ───
const SEISMIC_STOPS: [number, number, number][] = [
    [0.251, 0.753, 1.000],  // #40C0FF  mag 2-3 (weak)
    [0.400, 0.900, 0.600],  // #66E699  mag 4 (light)
    [1.000, 0.878, 0.125],  // #FFE020  mag 5 (moderate)
    [1.000, 0.502, 0.000],  // #FF8000  mag 6 (strong)
    [1.000, 0.188, 0.188],  // #FF3030  mag 7+ (major)
];

/** Earthquake magnitude (2-8) → [r,g,b] 0..1 */
export function seismicColor(mag: number): [number, number, number] {
    const t = (Math.max(2, Math.min(8, mag)) - 2) / 6;
    return sampleScale(SEISMIC_STOPS, t);
}

// ─── Wind speed → color (Beaufort-based logarithmic scaling) ───
// Most wind speeds cluster 0-15 m/s (Beaufort 0-7). Linear 0-30 wastes color range.
// Logarithmic scaling allocates more color resolution to common speeds.
// Beaufort: 0-3 calm/gentle (0-5 m/s), 4-6 moderate/strong (5-14 m/s),
//           7-9 gale (14-24 m/s), 10+ storm/hurricane (24+ m/s)
const WIND_STOPS: [number, number, number][] = [
    [0.102, 0.200, 0.400],  // #1A3366  Beaufort 0-1: calm
    [0.200, 0.400, 0.700],  // #3366B3  Beaufort 2-3: light/gentle breeze
    [0.300, 0.700, 0.850],  // #4DB3D9  Beaufort 4: moderate
    [0.500, 0.900, 0.700],  // #80E6B3  Beaufort 5-6: fresh/strong
    [0.850, 0.950, 0.550],  // #D9F28C  Beaufort 7-8: gale
    [1.000, 1.000, 1.000],  // #FFFFFF  Beaufort 9+: storm
];

/** Wind speed (m/s) → [r,g,b] 0..1 using logarithmic Beaufort-based mapping */
export function windSpeedColor(speed: number): [number, number, number] {
    // Logarithmic mapping: more color resolution for 0-15 m/s range
    // log(1+speed) maps: 0→0, 5→1.79, 10→2.40, 15→2.77, 25→3.26, 30→3.43
    const t = Math.min(Math.log(1 + Math.max(0, speed)) / Math.log(31), 1);
    return sampleScale(WIND_STOPS, t);
}
