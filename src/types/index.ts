import type { Vector3, Line } from 'three';

/**
 * Stable indices for the 12 planetary-impact categories.
 * Order follows docs/FRAMEWORK.md. Using the enum instead of raw 0..11 makes
 * call sites grep-friendly and type-safe.
 */
export const CategoryId = {
  CLIMATE_ENERGY: 0,
  BIODIVERSITY: 1,
  WATER_OCEANS: 2,
  ANIMALS: 3,
  FOOD_SYSTEMS: 4,
  SPACE_EXISTENCE: 5,
  HEALTH: 6,
  TECH_AI: 7,
  ECONOMY: 8,
  EDUCATION: 9,
  GOVERNANCE: 10,
  CONSCIOUSNESS: 11,
} as const;

export type CategoryIdValue = typeof CategoryId[keyof typeof CategoryId];

/**
 * Stable indices for the dashboard metrics. Order matches src/services/metrics.ts.
 * Lets UI / state / services refer to metrics by name (MetricId.CO2) instead of
 * by brittle numeric offsets.
 */
export const MetricId = {
  CO2: 0,
  TEMPERATURE: 1,
  METHANE: 2,
  NITROUS: 3,
  ARCTIC_ICE: 4,
  SEA_LEVEL_GLOBAL: 5,
  SEA_LEVEL_NYC: 6,
  KP_INDEX: 7,
  PM25: 8,
  CARBON_INTENSITY: 9,
  FOREST_LOSS: 10,
  UV_INDEX: 11,
  GBIF_OBSERVATIONS: 12,
} as const;

export type MetricIdValue = typeof MetricId[keyof typeof MetricId];

export const BiomeType = {
  OCEAN: 0, TROPICAL_RAIN: 1, TEMPERATE_FOR: 2, BOREAL_FOR: 3,
  SAVANNA: 4, GRASSLAND: 5, STEPPE: 6, HOT_DESERT: 7, COLD_DESERT: 8,
  MOUNTAIN: 9, VOLCANIC: 10, TROP_COAST: 11, WHITE_SAND: 12, BLACK_SAND: 13,
  SALT_FLAT: 14, WETLAND: 15, CENOTE: 16, TUNDRA: 17, ICE_CAP: 18,
  SNOW_GLACIER: 19, RIVER_LAKE: 20,
} as const;

export type BiomeId = typeof BiomeType[keyof typeof BiomeType];

/**
 * Biome rendering parameters — compact keys keep the data table scannable.
 *
 * Core fields (required for every biome):
 *   h   — HSL hue range            [min, max] in 0..1 fraction of the wheel
 *   s   — HSL saturation range     [min, max] in 0..1
 *   l   — HSL lightness range      [min, max] in 0..1
 *   sz  — particle size            world units (~Earth radius = 5.0)
 *   r   — orbit radius             number OR [min, max] for variable height
 *   op  — opacity                  0..1
 *   bl  — blending mode            'a' = additive, 'n' = normal
 *   g   — grass tier               0 = none, 1 = sparse, 2 = moderate, 3 = dense
 *
 * Grass overlay (optional — used when g >= 1):
 *   gh  — grass height range       [min, max] world units above surface
 *   ghu — grass hue range          [min, max] in 0..1
 *
 * Water overlay (optional — wetlands, cenotes, river/lake biomes):
 *   wm  — water mixing ratio       0..1 blend of water color into base
 *   wh  — water hue range          [min, max] in 0..1
 *
 * Ash/accent overlay (optional — volcanic, scorched biomes):
 *   ac  — accent chance            0..1 probability a particle takes accent look
 *   ah  — accent hue range         [min, max] in 0..1 (usually reds/oranges)
 *   al  — accent lightness range   [min, max] in 0..1
 *   bsc — base-scale reduction     0..1 how much to shrink base particles
 *         where accents dominate (1.0 = unchanged, 0.5 = half size)
 */
export interface BiomeParams {
  h: [number, number];
  s: [number, number];
  l: [number, number];
  sz: number;
  r: number | [number, number];
  op: number;
  bl: 'a' | 'n';
  g: number;
  gh?: [number, number];
  ghu?: [number, number];
  wm?: number;
  wh?: [number, number];
  ac?: number;
  ah?: [number, number];
  al?: [number, number];
  bsc?: number;
}

export interface ActionItem {
  text: string;
  tier?: 'S' | 'A' | 'B' | 'C';
  startHere?: boolean;
}

export interface Category {
  id: number;
  name: string;
  subtitle: string;
  color: string;
  global: ActionItem[];
  individual: ActionItem[];
  impact: string;
  relatedMetrics: number[];   // indices into metrics array
}

export interface MetricDef {
  label: string;
  value: number;
  rate: number;
  source?: string;
  uncertainty?: string;
  el?: HTMLElement;
  // Reference frames
  baseline?: number;
  baselineLabel?: string;
  safeLimit?: number;
  safeLimitLabel?: string;
  target2030?: number;
  target2030Label?: string;
  humanRate: string;
  direction: 'bad-up' | 'bad-down' | 'good-up' | 'good-down';
}

export interface FireflyData {
  radius: number;
  speed: number;
  phase: number;
  tilt: number;
  tiltPhase: number;
}

/** CO₂ emission particle — spawns from industrial zone, rises outward */
export interface EmissionParticle {
  lat: number;
  lon: number;
  birthRadius: number;
  age: number;
  maxAge: number;
  speed: number;
  drift: [number, number]; // lateral drift in lat/lon degrees
}

export interface ShootingStarData {
  mesh: Line;
  dir: Vector3;
  age: number;
  maxAge: number;
}

