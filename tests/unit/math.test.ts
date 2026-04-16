import { describe, it, expect } from 'vitest';
import { ll2v } from '../../src/utils/math';

/**
 * Sanity tests for the lat/lon → Cartesian converter used throughout the renderer.
 * Verifies known points (equator, poles, prime meridian) and radius scaling.
 */
describe('ll2v (lat/lon to Vector3)', () => {
    const EPS = 1e-9;

    it('equator @ lon 0 lies on +x-axis (per project convention)', () => {
        const v = ll2v(0, 0, 1);
        expect(v.x).toBeCloseTo(1, 9);
        expect(v.y).toBeCloseTo(0, 9);
        expect(v.z).toBeCloseTo(0, 9);
    });

    it('north pole lies at +y', () => {
        const v = ll2v(90, 0, 1);
        expect(v.x).toBeCloseTo(0, 9);
        expect(v.y).toBeCloseTo(1, 9);
        expect(v.z).toBeCloseTo(0, 9);
    });

    it('south pole lies at -y', () => {
        const v = ll2v(-90, 0, 1);
        expect(v.x).toBeCloseTo(0, 9);
        expect(v.y).toBeCloseTo(-1, 9);
        expect(v.z).toBeCloseTo(0, 9);
    });

    it('radius scales output magnitude', () => {
        const v = ll2v(0, 0, 5);
        expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(5, 9);
    });

    it('every lat/lon on unit sphere has unit magnitude', () => {
        for (const lat of [-80, -40, 0, 40, 80]) {
            for (const lon of [-180, -90, 0, 90, 179]) {
                const v = ll2v(lat, lon, 1);
                expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 9);
            }
        }
    });

    it('lat/lon 180 degrees apart are antipodal on the sphere', () => {
        const a = ll2v(30, 20, 1);
        const b = ll2v(-30, 20 + 180, 1);
        expect(a.x + b.x).toBeCloseTo(0, EPS);
        expect(a.y + b.y).toBeCloseTo(0, EPS);
        expect(a.z + b.z).toBeCloseTo(0, EPS);
    });
});
