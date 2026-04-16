import * as THREE from 'three';
import { BiomeType, type BiomeParams, type BiomeId } from '../../types';
import { biomeParams } from '../../data/biome-params';
import { getBiome } from './biome-classifier';
import { isLand } from './land-mask';
import { ll2v } from '../../utils/math';

const B = BiomeType;

interface BiomeArrays {
    pos: number[];
    col: number[];
}

export interface TerrainResult {
    biomeGroups: THREE.Points[];
    grassLines: THREE.LineSegments | null;
    oceanPoints: THREE.Points;
}

export function generateTerrain(): TerrainResult {
    const biomeArrays: Record<number, BiomeArrays> = {};
    const grassPos: number[] = [];
    const grassCol: number[] = [];

    // Main terrain scan — 1.8° step produces ~20-30K land particles.
    // These add subtle biome color texture ON TOP of the Blue Marble base map.
    // Too dense (0.4°→ 241K particles) creates an opaque layer that hides the texture.
    // Jitter is proportional to step size so particles don't form a visible grid.
    const STEP = 1.8;
    for (let lat = -85; lat <= 85; lat += STEP) {
        for (let lon = -180; lon <= 180; lon += STEP) {
            const biome = getBiome(lat, lon);
            if (biome === B.OCEAN) continue;
            const p = biomeParams[biome as BiomeId];
            if (!p) continue;

            const jLat = lat + (Math.random() - 0.5) * STEP;
            const jLon = lon + (Math.random() - 0.5) * STEP;
            const r = Array.isArray(p.r) ? p.r[0] + Math.random() * (p.r[1] - p.r[0]) : p.r;
            const v = ll2v(jLat, jLon, r);

            let h: number, s: number, l: number;
            if (p.bsc && Math.random() < p.bsc) {
                h = Math.random() * 0.05;
                s = Math.random() * 0.1;
                l = 0.08 + Math.random() * 0.10;
            } else if (p.wm && p.wh && Math.random() < p.wm) {
                h = p.wh[0] + Math.random() * (p.wh[1] - p.wh[0]);
                s = 0.7 + Math.random() * 0.3;
                l = 0.35 + Math.random() * 0.25;
            } else if (p.ac && p.ah && p.al && Math.random() < p.ac) {
                h = p.ah[0] + Math.random() * (p.ah[1] - p.ah[0]);
                s = 0.7 + Math.random() * 0.3;
                l = p.al[0] + Math.random() * (p.al[1] - p.al[0]);
            } else {
                h = p.h[0] + Math.random() * (p.h[1] - p.h[0]);
                s = p.s[0] + Math.random() * (p.s[1] - p.s[0]);
                l = p.l[0] + Math.random() * (p.l[1] - p.l[0]);
            }
            const col = new THREE.Color().setHSL(h, s, l);
            // Dim terrain particles so they don't overwhelm the land texture on the day side
            // The Pixar tonemap + sRGB gamma amplifies linear colors significantly
            col.multiplyScalar(0.40);

            if (!biomeArrays[biome]) biomeArrays[biome] = { pos: [], col: [] };
            biomeArrays[biome].pos.push(v.x, v.y, v.z);
            biomeArrays[biome].col.push(col.r, col.g, col.b);

            // Grass blades
            if (p.g > 0 && Math.random() < 0.5) {
                for (let gb = 0; gb < p.g; gb++) {
                    const bLat = jLat + (Math.random() - 0.5) * 0.6;
                    const bLon = jLon + (Math.random() - 0.5) * 0.6;
                    const base = ll2v(bLat, bLon, r + 0.003);
                    const tipH = p.gh![0] + Math.random() * (p.gh![1] - p.gh![0]);
                    const tip = ll2v(
                        bLat + (Math.random() - 0.5) * 0.3,
                        bLon + (Math.random() - 0.5) * 0.3,
                        r + 0.003 + tipH
                    );
                    grassPos.push(base.x, base.y, base.z, tip.x, tip.y, tip.z);
                    const ghu = p.ghu || p.h;
                    const bC = new THREE.Color().setHSL(
                        ghu[0] + Math.random() * (ghu[1] - ghu[0]),
                        0.55 + Math.random() * 0.35,
                        0.18 + Math.random() * 0.18
                    );
                    const tC = new THREE.Color().setHSL(
                        ghu[0] + Math.random() * (ghu[1] - ghu[0]) + 0.02,
                        0.4 + Math.random() * 0.3,
                        0.35 + Math.random() * 0.25
                    );
                    grassCol.push(bC.r, bC.g, bC.b, tC.r, tC.g, tC.b);
                }
            }
        }
    }

    // Ocean shimmer — color represents sea surface temperature zones
    // Tropical (|lat|<23): warm turquoise, Temperate (23-60): cool blue, Polar (>60): cold deep blue
    // Sources: NASA MODIS SST climatology, NOAA OISST v2.1
    // Major warm currents shift color warmer; cold currents shift cooler
    const oceanPos: number[] = [];
    const oceanCol: number[] = [];
    for (let lat = -75; lat <= 80; lat += 3.5) {
        for (let lon = -180; lon <= 180; lon += 3.5) {
            if (isLand(lat, lon)) continue;
            const v = ll2v(lat + (Math.random() - 0.5) * 2, lon + (Math.random() - 0.5) * 2, 5.008);
            oceanPos.push(v.x, v.y, v.z);

            const absLat = Math.abs(lat);
            let hue: number, sat: number, lit: number;

            if (absLat < 23) {
                // Tropical: warm turquoise-teal (SST > 25°C)
                hue = 0.48 + Math.random() * 0.06;
                sat = 0.7 + Math.random() * 0.25;
                lit = 0.45 + Math.random() * 0.15;
            } else if (absLat < 60) {
                // Temperate: cooler blue (SST 5-25°C) — extended from 50° to 60°
                // N. Atlantic warmed by Gulf Stream extension to ~60°N
                hue = 0.56 + Math.random() * 0.06;
                sat = 0.55 + Math.random() * 0.3;
                lit = 0.38 + Math.random() * 0.15;
            } else {
                // Polar: cold deep blue-indigo (SST < 5°C)
                hue = 0.62 + Math.random() * 0.05;
                sat = 0.4 + Math.random() * 0.3;
                lit = 0.30 + Math.random() * 0.12;
            }

            // === Warm current offsets (shift hue warmer, increase brightness) ===

            // Gulf Stream + North Atlantic Current (25-60°N, -80 to -20°W)
            if (lat > 25 && lat < 60 && lon > -80 && lon < -20) {
                const strength = lat < 45 ? 1.0 : 0.6; // weakens as North Atlantic Drift
                hue -= 0.06 * strength; sat += 0.1 * strength; lit += 0.08 * strength;
            }
            // Kuroshio + North Pacific Current (25-45°N, 125-180°E)
            if (lat > 25 && lat < 45 && lon > 125 && lon < 180) {
                hue -= 0.05; sat += 0.08; lit += 0.06;
            }
            // Brazil Current (-10 to -35°S, -50 to -30°W)
            if (lat > -35 && lat < -10 && lon > -50 && lon < -30) {
                hue -= 0.04; sat += 0.06; lit += 0.05;
            }
            // Agulhas + Mozambique Current (-40 to -15°S, 25-50°E)
            if (lat > -40 && lat < -15 && lon > 25 && lon < 50) {
                hue -= 0.05; sat += 0.08; lit += 0.06;
            }

            // === Cold current offsets (shift hue cooler, decrease brightness) ===

            // Humboldt/Peru Current (-5 to -35°S, -85 to -70°W) — cold upwelling
            if (lat > -35 && lat < -5 && lon > -85 && lon < -70) {
                hue += 0.04; sat -= 0.05; lit -= 0.06;
            }
            // Benguela Current (-15 to -35°S, 5-18°E) — cold upwelling
            if (lat > -35 && lat < -15 && lon > 5 && lon < 18) {
                hue += 0.04; sat -= 0.05; lit -= 0.05;
            }
            // California Current (25-48°N, -130 to -115°W) — cold
            if (lat > 25 && lat < 48 && lon > -130 && lon < -115) {
                hue += 0.03; sat -= 0.04; lit -= 0.04;
            }

            const c = new THREE.Color().setHSL(hue, Math.min(sat, 1), Math.min(lit, 0.65));
            oceanCol.push(c.r, c.g, c.b);
        }
    }

    const oceanGeo = new THREE.BufferGeometry();
    oceanGeo.setAttribute('position', new THREE.Float32BufferAttribute(oceanPos, 3));
    oceanGeo.setAttribute('color', new THREE.Float32BufferAttribute(oceanCol, 3));
    const oceanPoints = new THREE.Points(oceanGeo, new THREE.PointsMaterial({
        size: 0.02, vertexColors: true, transparent: true, opacity: 0.3,
        blending: THREE.AdditiveBlending, depthWrite: false,
    }));

    // Create per-biome Points
    const biomeGroups: THREE.Points[] = [];
    for (const bid of Object.keys(biomeArrays)) {
        const d = biomeArrays[Number(bid)];
        if (d.pos.length === 0) continue;
        const p = biomeParams[Number(bid) as BiomeId];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(d.col, 3));
        biomeGroups.push(new THREE.Points(geo, new THREE.PointsMaterial({
            size: p.sz, vertexColors: true, transparent: true, opacity: p.op,
            blending: p.bl === 'a' ? THREE.AdditiveBlending : THREE.NormalBlending,
            depthWrite: false,
        })));
    }

    // Grass
    let grassLines: THREE.LineSegments | null = null;
    if (grassPos.length > 0) {
        const gGeo = new THREE.BufferGeometry();
        gGeo.setAttribute('position', new THREE.Float32BufferAttribute(grassPos, 3));
        gGeo.setAttribute('color', new THREE.Float32BufferAttribute(grassCol, 3));
        grassLines = new THREE.LineSegments(gGeo, new THREE.LineBasicMaterial({
            vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false,
        }));
    }

    return { biomeGroups, grassLines, oceanPoints };
}
