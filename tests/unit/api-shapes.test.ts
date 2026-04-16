import { describe, it, expect } from 'vitest';
import { getStatusText } from '../../src/services/api-client';

/**
 * Surface-level tests for the public API of api-client. We can't realistically mock
 * all 17 endpoints here (that's the job of a future integration test suite),
 * but we can lock down the contract of `getStatusText`.
 */
describe('getStatusText', () => {
    it('returns OFFLINE when zero APIs connected', () => {
        const { text, connected } = getStatusText(0);
        expect(connected).toBe(false);
        expect(text).toMatch(/OFFLINE/);
    });

    it('returns MÍNIMO when 1-4 APIs connected', () => {
        const { text, connected } = getStatusText(3);
        expect(connected).toBe(true);
        expect(text).toMatch(/M[ÍI]NIMO/);
    });

    it('returns PARCIAL when 5-8 APIs connected', () => {
        const { text, connected } = getStatusText(6);
        expect(connected).toBe(true);
        expect(text).toMatch(/PARCIAL/);
    });

    it('returns LIVE when 9+ APIs connected', () => {
        const { text, connected } = getStatusText(12);
        expect(connected).toBe(true);
        expect(text).toMatch(/LIVE/);
    });
});
