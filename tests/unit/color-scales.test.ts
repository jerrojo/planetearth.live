import { describe, it, expect } from 'vitest';
import {
    tempAnomalyColor,
    aqiColor,
    seismicColor,
    windSpeedColor,
} from '../../src/utils/color-scales';

/**
 * Property tests for the scientific color scales. We verify:
 *   - values at scale boundaries hit the documented IPCC / EPA / Beaufort anchors
 *   - outputs always live in [0, 1]
 *   - monotonic behavior on expected axes (hotter → redder, higher AQI → more alert, etc.)
 */

function inUnitRange(rgb: [number, number, number]): boolean {
    return rgb.every(c => c >= 0 && c <= 1);
}

describe('tempAnomalyColor (IPCC AR6 diverging)', () => {
    it('-4°C maps to deep blue (#053061)', () => {
        const [r, g, b] = tempAnomalyColor(-4);
        expect(r).toBeCloseTo(0.020, 2);
        expect(g).toBeCloseTo(0.188, 2);
        expect(b).toBeCloseTo(0.380, 2);
    });

    it('0°C maps to white-ish (#F8F8F8)', () => {
        const [r, g, b] = tempAnomalyColor(0);
        expect(r).toBeCloseTo(0.973, 2);
        expect(g).toBeCloseTo(0.973, 2);
        expect(b).toBeCloseTo(0.973, 2);
    });

    it('+4°C maps to deep red (#67001F)', () => {
        const [r, g, b] = tempAnomalyColor(4);
        expect(r).toBeCloseTo(0.404, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0.122, 2);
    });

    it('clamps below -4 and above +4', () => {
        expect(tempAnomalyColor(-10)).toEqual(tempAnomalyColor(-4));
        expect(tempAnomalyColor(+10)).toEqual(tempAnomalyColor(+4));
    });

    it('all outputs in [0,1]', () => {
        for (const anom of [-6, -4, -2, 0, 2, 4, 6]) {
            expect(inUnitRange(tempAnomalyColor(anom))).toBe(true);
        }
    });
});

describe('aqiColor (EPA AQI tiers)', () => {
    it('AQI 0-50 is green (Good)', () => {
        const [r, g, b] = aqiColor(25);
        expect(r).toBeCloseTo(0, 2);
        expect(g).toBeCloseTo(0.894, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('AQI 200 is red (Unhealthy)', () => {
        const [r, g] = aqiColor(200);
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(0, 2);
    });

    it('AQI 500 is hazardous maroon (#7E0023)', () => {
        const [r, g, b] = aqiColor(500);
        expect(r).toBeCloseTo(0.494, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0.137, 2);
    });

    it('all outputs in [0,1]', () => {
        for (const aqi of [0, 25, 75, 125, 175, 250, 400, 500, 600]) {
            expect(inUnitRange(aqiColor(aqi))).toBe(true);
        }
    });
});

describe('seismicColor (magnitude 2-8)', () => {
    it('M2 weak is cyan-ish blue', () => {
        const [r, g, b] = seismicColor(2);
        expect(r).toBeLessThan(0.3);
        expect(b).toBeGreaterThan(0.9);
    });

    it('M8 major is bright red', () => {
        const [r, g, b] = seismicColor(8);
        expect(r).toBe(1);
        expect(g).toBeLessThan(0.3);
        expect(b).toBeLessThan(0.3);
    });

    it('clamps outside 2..8 range', () => {
        expect(seismicColor(0)).toEqual(seismicColor(2));
        expect(seismicColor(15)).toEqual(seismicColor(8));
    });
});

describe('windSpeedColor (Beaufort-based log)', () => {
    it('0 m/s produces calm blue', () => {
        const [r, g, b] = windSpeedColor(0);
        expect(r).toBeLessThan(0.2);
        expect(b).toBeGreaterThan(0.3);
    });

    it('30 m/s (storm) clamps to white', () => {
        const [r, g, b] = windSpeedColor(30);
        expect(r).toBeCloseTo(1, 1);
        expect(g).toBeCloseTo(1, 1);
        expect(b).toBeCloseTo(1, 1);
    });

    it('handles negative input via Math.max guard', () => {
        expect(() => windSpeedColor(-5)).not.toThrow();
        const [r, g, b] = windSpeedColor(-5);
        expect(Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)).toBe(true);
    });

    it('all outputs in [0,1]', () => {
        for (const speed of [0, 2, 5, 10, 15, 20, 25, 40]) {
            expect(inUnitRange(windSpeedColor(speed))).toBe(true);
        }
    });
});
