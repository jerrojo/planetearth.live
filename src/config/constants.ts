// === Population: UN DESA World Population Prospects 2024 revision ===
// Base: 8.119B on Jan 1, 2026 (UN medium variant)
// Net growth: ~67M/year (births minus deaths), decelerating from peak ~87M in 1989
// Source: https://population.un.org/wpp/
export const POP_BASE = 8_119_000_000;
export const POP_EPOCH = new Date('2026-01-01T00:00:00Z').getTime();
export const POP_RATE = 2.12; // persons/second ≈ 67M/year (UN DESA 2024 medium variant)
export const THRESHOLD = 0.035;

// === Astronomy ===
export const EARTH_AXIAL_TILT = 23.44 * Math.PI / 180; // obliquity of ecliptic (radians)
export const SIDEREAL_DAY_S = 86164.1; // sidereal day in seconds
export const TROPICAL_YEAR_S = 365.2422 * 86400; // tropical year in seconds

// === Rendering ===
export const STAR_COUNT = 6000; // ~6000 stars visible to naked eye (mag ≤ 6.5, Yale BSC)
export const FIREFLY_COUNT = 120;
export const MAX_PULSES = 20;
export const TOTAL_APIS = 17;

export const MASK_W = 720;
export const MASK_H = 360;

export const ORBIT_R = 8.2;

export const METRIC_UPDATE_INTERVAL = 100; // ms, throttle DOM writes to ~10 FPS
export const POPULATION_UPDATE_INTERVAL = 1000; // ms
export const API_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
