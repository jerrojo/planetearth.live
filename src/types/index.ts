import type { Vector3, Line } from 'three';

export const BiomeType = {
  OCEAN: 0, TROPICAL_RAIN: 1, TEMPERATE_FOR: 2, BOREAL_FOR: 3,
  SAVANNA: 4, GRASSLAND: 5, STEPPE: 6, HOT_DESERT: 7, COLD_DESERT: 8,
  MOUNTAIN: 9, VOLCANIC: 10, TROP_COAST: 11, WHITE_SAND: 12, BLACK_SAND: 13,
  SALT_FLAT: 14, WETLAND: 15, CENOTE: 16, TUNDRA: 17, ICE_CAP: 18,
  SNOW_GLACIER: 19, RIVER_LAKE: 20,
} as const;

export type BiomeId = typeof BiomeType[keyof typeof BiomeType];

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

