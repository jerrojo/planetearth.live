import { describe, it, expect } from 'vitest';
import {
    BOUNDS,
    ok,
    fail,
    parseNumericLoose,
    withinBounds,
    validateCO2Response,
    validateTemperatureResponse,
    validateMethaneResponse,
    validateNitrousResponse,
    validateArcticResponse,
    validateKpResponse,
    validateAirQualityResponse,
    validateTemperature2mResponse,
    validateUvResponse,
    validateSeaLevelLocalResponse,
    validateSeaLevelGlobalResponse,
    validateCarbonIntensityResponse,
    validateGbifCountResponse,
} from '../../src/services/validation';

describe('validation primitives', () => {
    it('parseNumericLoose handles numbers, numeric strings, and rejects others', () => {
        expect(parseNumericLoose(42)).toBe(42);
        expect(parseNumericLoose('42.5')).toBe(42.5);
        expect(parseNumericLoose('abc')).toBeNull();
        expect(parseNumericLoose(null)).toBeNull();
        expect(parseNumericLoose(undefined)).toBeNull();
        expect(parseNumericLoose(NaN)).toBeNull();
    });

    it('withinBounds is inclusive on both ends', () => {
        expect(withinBounds(280, [280, 400])).toBe(true);
        expect(withinBounds(400, [280, 400])).toBe(true);
        expect(withinBounds(279.9, [280, 400])).toBe(false);
        expect(withinBounds(400.1, [280, 400])).toBe(false);
    });

    it('ok/fail produce the expected discriminated results', () => {
        const okv = ok(5);
        expect(okv.ok).toBe(true);
        if (okv.ok) expect(okv.value).toBe(5);

        const failv = fail<number>('broken');
        expect(failv.ok).toBe(false);
        if (!failv.ok) expect(failv.reason).toBe('broken');
    });
});

describe('CO₂ validator', () => {
    it('accepts a well-formed response', () => {
        const raw = { co2: [{ cycle: '421.3', trend: '420.9' }] };
        const r = validateCO2Response(raw);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toBeCloseTo(421.3, 4);
    });

    it('rejects empty series', () => {
        const r = validateCO2Response({ co2: [] });
        expect(r.ok).toBe(false);
    });

    it('rejects out-of-bounds values (sensor fault → 0 ppm)', () => {
        const r = validateCO2Response({ co2: [{ cycle: 0 }] });
        expect(r.ok).toBe(false);
    });

    it('rejects a non-object payload', () => {
        const r = validateCO2Response('nope' as unknown);
        expect(r.ok).toBe(false);
    });
});

describe('Temperature validator', () => {
    it('accepts a GISTEMP-shaped response', () => {
        const r = validateTemperatureResponse({ result: [{ station: '1.45' }] });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toBeCloseTo(1.45, 4);
    });

    it('rejects out-of-bounds anomalies (+10°C is unphysical)', () => {
        const r = validateTemperatureResponse({ result: [{ station: 10 }] });
        expect(r.ok).toBe(false);
    });
});

describe('Methane / N₂O validators', () => {
    it('accept values in the current observed range', () => {
        expect(validateMethaneResponse({ methane: [{ average: '1946' }] }).ok).toBe(true);
        expect(validateNitrousResponse({ nitrous: [{ average: '339' }] }).ok).toBe(true);
    });

    it('reject pre-industrial-era sentinels that would indicate a bug', () => {
        expect(validateMethaneResponse({ methane: [{ average: 722 }] }).ok).toBe(false);
        expect(validateNitrousResponse({ nitrous: [{ average: 100 }] }).ok).toBe(false);
    });
});

describe('Arctic sea-ice validator', () => {
    it('accepts a real-shape response and yields value + yyyymm', () => {
        const raw = { arcticData: { data: { '202603': { value: 14.2, anom: -0.9 } } } };
        const r = validateArcticResponse(raw);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.value).toBeCloseTo(14.2, 4);
            expect(r.value.yyyymm).toBe('202603');
            expect(r.value.anomaly).toBeCloseTo(-0.9, 4);
        }
    });

    it('rejects the NSIDC -9999 sentinel', () => {
        const raw = { arcticData: { data: { '202603': { value: -9999 } } } };
        expect(validateArcticResponse(raw).ok).toBe(false);
    });

    it('rejects an empty data dict', () => {
        const raw = { arcticData: { data: {} } };
        expect(validateArcticResponse(raw).ok).toBe(false);
    });
});

describe('Kp index validator', () => {
    it('accepts the documented SWPC JSON shape (header row + data rows)', () => {
        const raw = [
            ['time_tag', 'Kp', 'a_running'],
            ['2026-04-16 00:00:00', 3, 12],
            ['2026-04-16 03:00:00', 4, 12],
        ];
        const r = validateKpResponse(raw);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toBe(4);
    });

    it('rejects values outside the 0-9 scale', () => {
        const raw = [['time_tag', 'Kp'], ['2026-04-16 00:00:00', 11]];
        expect(validateKpResponse(raw).ok).toBe(false);
    });
});

describe('Air-quality validator (CAMS via Open-Meteo)', () => {
    it('accepts a current-block with PM2.5 and US AQI', () => {
        const raw = { current: { pm2_5: 12.4, us_aqi: 52 } };
        const r = validateAirQualityResponse(raw);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.pm25).toBeCloseTo(12.4, 4);
            expect(r.value.usAqi).toBe(52);
        }
    });

    it('clamps absurd AQI values into the EPA 0–500 scale', () => {
        const raw = { current: { pm2_5: 900, us_aqi: 9999 } };
        const r = validateAirQualityResponse(raw);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value.usAqi).toBeLessThanOrEqual(BOUNDS.AQI[1]);
    });

    it('rejects negative PM2.5 (sensor fault)', () => {
        const raw = { current: { pm2_5: -5 } };
        expect(validateAirQualityResponse(raw).ok).toBe(false);
    });
});

describe('Temperature_2m (Open-Meteo forecast)', () => {
    it('accepts a plausible city temperature', () => {
        expect(validateTemperature2mResponse({ current: { temperature_2m: 22.5 } }).ok).toBe(true);
    });

    it('rejects thermodynamically impossible temperatures', () => {
        expect(validateTemperature2mResponse({ current: { temperature_2m: -200 } }).ok).toBe(false);
    });
});

describe('UV, sea-level, carbon-intensity, GBIF validators', () => {
    it('validates UV daily payload', () => {
        expect(validateUvResponse({ daily: { uv_index_max: [6.5] } }).ok).toBe(true);
        expect(validateUvResponse({ daily: { uv_index_max: [50] } }).ok).toBe(false);
    });

    it('validates local (NOAA CO-OPS) sea level', () => {
        expect(validateSeaLevelLocalResponse({ data: [{ v: '0.53' }] }).ok).toBe(true);
        expect(validateSeaLevelLocalResponse({ data: [{ v: '100' }] }).ok).toBe(false);
    });

    it('validates global sea level (GMSL mm)', () => {
        const raw = { sealevel: [{ GMSL: '112.3' }] };
        expect(validateSeaLevelGlobalResponse(raw).ok).toBe(true);
    });

    it('validates UK grid carbon intensity', () => {
        const raw = { data: [{ intensity: { actual: 120 } }] };
        expect(validateCarbonIntensityResponse(raw).ok).toBe(true);
    });

    it('validates GBIF numeric-count response', () => {
        expect(validateGbifCountResponse(2_300_000_000).ok).toBe(true);
        expect(validateGbifCountResponse(12).ok).toBe(false);
    });
});

describe('BOUNDS constants', () => {
    it('are pairs in [min, max] order and reflect current-era reality', () => {
        for (const [name, pair] of Object.entries(BOUNDS)) {
            const [lo, hi] = pair;
            expect(lo, `${name} lo vs hi`).toBeLessThan(hi);
        }
        // A smoke test: ~429 ppm CO₂ today, well inside bounds.
        expect(withinBounds(429, BOUNDS.CO2_PPM)).toBe(true);
        // IPCC AR6 baseline anomaly (+1.2°C current) is inside the TEMP_ANOMALY_C band.
        expect(withinBounds(1.2, BOUNDS.TEMP_ANOMALY_C)).toBe(true);
    });
});
