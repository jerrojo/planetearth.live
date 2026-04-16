import { describe, it, expect } from 'vitest';
import { formatMetricValue, formatPop } from '../../src/utils/format';

describe('formatMetricValue', () => {
    it('uses T suffix for >1e12', () => {
        expect(formatMetricValue(2.5e12)).toBe('2.500T');
    });

    it('uses B suffix for >1e9', () => {
        expect(formatMetricValue(8.119e9)).toBe('8.12B');
    });

    it('uses M suffix for >1e6', () => {
        expect(formatMetricValue(1.5e6)).toBe('1.5M');
    });

    it('uses 0 decimals for values >1000', () => {
        expect(formatMetricValue(1234)).toBe('1234');
    });

    it('uses 2 decimals for small values', () => {
        expect(formatMetricValue(7.314)).toBe('7.31');
    });
});

describe('formatPop', () => {
    it('accepts an explicit locale', () => {
        // Both en-US and es-MX use a comma as the thousands separator; we just verify
        // locale-aware formatting runs without throwing and produces a non-empty string.
        const usResult = formatPop(8_119_000_000, 'en-US');
        expect(usResult.length).toBeGreaterThan(5);
        expect(usResult).not.toContain('.'); // commas, not dots, for en-US thousands
    });

    it('falls back to a locale when none is provided', () => {
        expect(() => formatPop(1_234_567)).not.toThrow();
    });
});
