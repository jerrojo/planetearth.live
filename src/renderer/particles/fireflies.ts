import * as THREE from 'three';
import { FIREFLY_COUNT } from '../../config/constants';
import type { EmissionParticle } from '../../types';
import { ll2v } from '../../utils/math';
import { isLand } from '../globe/land-mask';

/**
 * High-emission industrial zones — weighted by actual CO₂ share.
 * Source: Global Carbon Project 2024 (fossil CO₂ + cement)
 *   China ~31%, US ~14%, India ~8%, EU ~7%, Russia ~5%,
 *   Japan ~3%, Iran ~2%, S.Korea ~2%, Saudi ~2%, Brazil ~1%
 */
const EMISSION_ZONES: { lat: [number, number]; lon: [number, number]; weight: number }[] = [
    { lat: [28, 42], lon: [105, 122], weight: 31 },   // China industrial belt (31%)
    { lat: [28, 45], lon: [-95, -72], weight: 14 },    // US East Coast + Gulf (14%)
    { lat: [20, 32], lon: [72, 90], weight: 8 },       // India Gangetic plain (8%)
    { lat: [46, 54], lon: [2, 15], weight: 7 },        // EU Rhine-Ruhr + Benelux (7%)
    { lat: [52, 66], lon: [60, 95], weight: 5 },       // Russia Urals + Siberia (5%)
    { lat: [33, 40], lon: [130, 145], weight: 3 },     // Japan industrial belt (3%)
    { lat: [25, 35], lon: [46, 56], weight: 4 },       // Iran + Saudi + Gulf states (4%)
    { lat: [33, 37], lon: [126, 130], weight: 2 },     // South Korea (2%)
    { lat: [-25, -20], lon: [-48, -42], weight: 1 },   // Brazil São Paulo industrial (1%)
];

// Build weighted lookup for zone selection
const totalWeight = EMISSION_ZONES.reduce((s, z) => s + z.weight, 0);
const cumulativeWeights: number[] = [];
let cumul = 0;
for (const z of EMISSION_ZONES) {
    cumul += z.weight;
    cumulativeWeights.push(cumul / totalWeight);
}

function pickZone(): typeof EMISSION_ZONES[0] {
    const r = Math.random();
    for (let i = 0; i < cumulativeWeights.length; i++) {
        if (r < cumulativeWeights[i]) return EMISSION_ZONES[i];
    }
    return EMISSION_ZONES[0];
}

function spawnParticle(): EmissionParticle {
    const zone = pickZone();
    // Retry until we land on actual land (not ocean) — max 10 attempts
    let lat: number, lon: number;
    let tries = 0;
    do {
        lat = zone.lat[0] + Math.random() * (zone.lat[1] - zone.lat[0]);
        lon = zone.lon[0] + Math.random() * (zone.lon[1] - zone.lon[0]);
        tries++;
    } while (!isLand(lat, lon) && tries < 10);

    return {
        lat, lon,
        birthRadius: 5.06 + Math.random() * 0.04,
        age: 0,
        maxAge: 6 + Math.random() * 8,
        speed: 0.08 + Math.random() * 0.12,
        drift: [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3],
    };
}

export interface FireflyContext {
    particles: EmissionParticle[];
    positions: Float32Array;
    colors: Float32Array;
    geometry: THREE.BufferGeometry;
    material: THREE.PointsMaterial;
}

export function createFireflies(scene: THREE.Scene): FireflyContext {
    const particles: EmissionParticle[] = [];
    const positions = new Float32Array(FIREFLY_COUNT * 3);
    const colors = new Float32Array(FIREFLY_COUNT * 3);

    for (let i = 0; i < FIREFLY_COUNT; i++) {
        const p = spawnParticle();
        p.age = Math.random() * p.maxAge; // stagger initial ages
        particles.push(p);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Soft radial glow texture
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, 'rgba(255,200,120,1)');
    grad.addColorStop(0.3, 'rgba(200,180,150,0.5)');
    grad.addColorStop(0.6, 'rgba(150,150,150,0.15)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);

    const material = new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(canvas),
        size: 0.2,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    scene.add(new THREE.Points(geometry, material));

    return { particles, positions, colors, geometry, material };
}

let _prevT = 0;
export function updateFireflies(ctx: FireflyContext, t: number, motionScale: number): void {
    // Frame-rate independent: derive dt from elapsed time, not hardcoded 60fps assumption
    const dt = _prevT > 0 ? Math.min(t - _prevT, 0.1) : 0.016;
    _prevT = t;
    for (let i = 0; i < ctx.particles.length; i++) {
        const p = ctx.particles[i];
        p.age += dt * motionScale;

        if (p.age >= p.maxAge) {
            // Respawn
            const fresh = spawnParticle();
            Object.assign(p, fresh);
        }

        const life = p.age / p.maxAge; // 0..1
        const radius = p.birthRadius + life * 1.8 * p.speed / 0.1;
        const lat = p.lat + p.drift[0] * life;
        const lon = p.lon + p.drift[1] * life;
        const v = ll2v(lat, lon, radius);

        ctx.positions[i * 3] = v.x;
        ctx.positions[i * 3 + 1] = v.y;
        ctx.positions[i * 3 + 2] = v.z;

        // Color transition: amber → grey-brown → faded grey
        let r: number, g: number, b: number;
        if (life < 0.3) {
            // Birth: warm amber
            const t2 = life / 0.3;
            r = 1.0 - t2 * 0.3;
            g = 0.7 - t2 * 0.1;
            b = 0.3 - t2 * 0.1;
        } else if (life < 0.7) {
            // Mid: grey-brown
            const t2 = (life - 0.3) / 0.4;
            r = 0.7 - t2 * 0.2;
            g = 0.6 - t2 * 0.15;
            b = 0.2 + t2 * 0.15;
        } else {
            // End: faded grey
            const t2 = (life - 0.7) / 0.3;
            r = 0.5 - t2 * 0.1;
            g = 0.45 - t2 * 0.1;
            b = 0.35 - t2 * 0.05;
        }
        ctx.colors[i * 3] = r;
        ctx.colors[i * 3 + 1] = g;
        ctx.colors[i * 3 + 2] = b;
    }
    ctx.geometry.attributes.position.needsUpdate = true;
    ctx.geometry.attributes.color.needsUpdate = true;

    // Fade opacity based on particle density feel
    ctx.material.opacity = 0.5 + Math.sin(t * 0.25) * 0.15 * motionScale;
}
