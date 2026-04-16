import { describe, it, expect } from 'vitest';
import { CategoryId, MetricId, BiomeType } from '../../src/types';

/**
 * Lock the stable numeric ordering of CategoryId / MetricId / BiomeType.
 * Downstream code (data/categories.ts, metrics.ts, api-client parsers, etc.)
 * depends on these offsets matching the 0..N contract. Changing any value here
 * is a breaking change and should be done deliberately with a migration.
 */
describe('CategoryId (12 planetary-impact categories)', () => {
    it('spans 0..11 in docs/FRAMEWORK.md order', () => {
        expect(CategoryId.CLIMATE_ENERGY).toBe(0);
        expect(CategoryId.BIODIVERSITY).toBe(1);
        expect(CategoryId.WATER_OCEANS).toBe(2);
        expect(CategoryId.ANIMALS).toBe(3);
        expect(CategoryId.FOOD_SYSTEMS).toBe(4);
        expect(CategoryId.SPACE_EXISTENCE).toBe(5);
        expect(CategoryId.HEALTH).toBe(6);
        expect(CategoryId.TECH_AI).toBe(7);
        expect(CategoryId.ECONOMY).toBe(8);
        expect(CategoryId.EDUCATION).toBe(9);
        expect(CategoryId.GOVERNANCE).toBe(10);
        expect(CategoryId.CONSCIOUSNESS).toBe(11);
    });

    it('has no duplicate values', () => {
        const values = Object.values(CategoryId);
        expect(new Set(values).size).toBe(values.length);
    });

    it('has exactly 12 entries', () => {
        expect(Object.keys(CategoryId)).toHaveLength(12);
    });
});

describe('MetricId (dashboard metrics)', () => {
    it('starts at 0 and has contiguous offsets', () => {
        const values = Object.values(MetricId).sort((a, b) => a - b);
        values.forEach((v, i) => expect(v).toBe(i));
    });

    it('has no duplicates', () => {
        const values = Object.values(MetricId);
        expect(new Set(values).size).toBe(values.length);
    });
});

describe('BiomeType', () => {
    it('OCEAN is 0 (particles use this as the no-land sentinel)', () => {
        expect(BiomeType.OCEAN).toBe(0);
    });
});
