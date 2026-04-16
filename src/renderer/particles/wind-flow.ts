/**
 * Wind Flow Visualization — atmospheric circulation particles on globe surface.
 *
 * Procedural wind field based on real atmospheric circulation patterns:
 *   - Trade winds (0-30° lat): easterly
 *   - Westerlies (30-60° lat): westerly, jet stream meandering
 *   - Polar easterlies (60-90° lat): easterly
 *   - Hadley/Ferrel/Polar cell meridional components
 *   - Longitude-dependent monsoon and wave patterns
 *
 * Technique: CPU-advected particles rendered as Points with vertex colors.
 * Inspired by earth.nullschool.net (Cameron Beccario).
 */
import * as THREE from 'three';
import { ll2v } from '../../utils/math';
import { windSpeedColor } from '../../utils/color-scales';

const WIND_COUNT = 18000;
const WIND_RADIUS = 5.035; // just above globe surface, below clouds

interface WindParticle {
    lat: number;
    lon: number;
    age: number;
    maxAge: number;
}

/**
 * Procedural wind field — returns [u, v] in degrees/second.
 * u = east-west (positive = eastward), v = north-south (positive = northward).
 * Based on idealized general circulation + longitude perturbations.
 */
function getWind(lat: number, lon: number, t: number): [number, number] {
    const absLat = Math.abs(lat);
    const latSign = lat >= 0 ? 1 : -1;
    const lonRad = lon * Math.PI / 180;

    // Zonal wind (u) — three-cell Hadley/Ferrel/Polar pattern
    // Sources: Held & Hou (1980), Hartmann (2015) "Global Physical Climatology"
    let u: number;
    if (absLat < 30) {
        // Trade winds: easterly, peak ~15° (~6 m/s)
        u = -6 * Math.sin(absLat / 30 * Math.PI);
    } else if (absLat < 60) {
        // Westerlies: peak ~45°, strongest surface wind belt (~10 m/s)
        u = 10 * Math.sin((absLat - 30) / 30 * Math.PI);
    } else {
        // Polar easterlies: weaker (~3 m/s)
        u = -3 * Math.sin((absLat - 60) / 30 * Math.PI);
    }

    // Subtropical jet stream (~30-35° lat) — 60-100 m/s aloft, shown as ~8 m/s surface effect
    // Gaussian peaked at 32° latitude, strong in winter hemisphere
    if (absLat > 25 && absLat < 40) {
        const subtropJet = 8 * Math.exp(-((absLat - 32) * (absLat - 32)) / 20);
        u += subtropJet;
    }

    // Polar front jet meandering (Rossby waves, ~55-65°) — adds sinusoidal variation
    // Wavenumber 4-6 typical for mid-latitudes
    if (absLat > 40 && absLat < 70) {
        const jetStrength = Math.sin((absLat - 40) / 30 * Math.PI);
        u += 5 * jetStrength * Math.sin(lonRad * 4 + t * 0.02);
    }

    // Meridional wind (v) — Hadley/Ferrel cell circulation
    let v = 1.5 * Math.sin(absLat / 30 * Math.PI * 3) * latSign;

    // Monsoon effect (Indian Ocean, boreal summer)
    // Southwest monsoon: strong cross-equatorial flow Jun-Sep
    if (lat > 0 && lat < 30 && lon > 60 && lon < 100) {
        u += 4; // southwest monsoon (eastward component)
        v += 3; // northward flow
    }

    // West African monsoon (lat 5-15°N, lon -15 to 15°E)
    if (lat > 5 && lat < 15 && lon > -15 && lon < 15) {
        v += 2; // southerly flow into Sahel
    }

    // ITCZ convergence with REAL seasonal migration
    // ITCZ follows the thermal equator: ~5°S in January (austral summer), ~10°N in July
    // Source: Schneider et al. (2014) "Migrations and dynamics of the ITCZ", Nature
    const now = new Date();
    const dayOfYear = (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86400000;
    // Peak north (~10°N) around day 200 (July 19), peak south (~5°S) around day 20 (Jan 20)
    const itczCenter = 2.5 + 7.5 * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365.25);
    const distFromITCZ = Math.abs(lat - itczCenter);
    if (distFromITCZ < 12) {
        const convergence = 2.5 * (1 - distFromITCZ / 12);
        v -= (lat > itczCenter ? 1 : -1) * convergence;
    }

    // Add gentle turbulence for visual realism
    u += Math.sin(lat * 0.3 + lon * 0.2 + t * 0.5) * 1.5;
    v += Math.cos(lat * 0.2 + lon * 0.3 + t * 0.4) * 1.0;

    return [u, v];
}

function windSpeed(u: number, v: number): number {
    return Math.sqrt(u * u + v * v);
}

function spawnWindParticle(): WindParticle {
    return {
        lat: Math.random() * 160 - 80, // -80 to 80
        lon: Math.random() * 360 - 180,
        age: 0,
        maxAge: 3 + Math.random() * 5, // 3-8 seconds
    };
}

export interface WindFlowContext {
    particles: WindParticle[];
    positions: Float32Array;
    colors: Float32Array;
    alphas: Float32Array;
    geometry: THREE.BufferGeometry;
}

export function createWindFlow(scene: THREE.Scene): WindFlowContext {
    const particles: WindParticle[] = [];
    const positions = new Float32Array(WIND_COUNT * 3);
    const colors = new Float32Array(WIND_COUNT * 3);
    const alphas = new Float32Array(WIND_COUNT);

    for (let i = 0; i < WIND_COUNT; i++) {
        const p = spawnWindParticle();
        p.age = Math.random() * p.maxAge; // stagger
        particles.push(p);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
            attribute float aAlpha;
            varying float vAlpha;
            varying vec3 vColor;
            void main() {
                vAlpha = aAlpha;
                vColor = color;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = max(1.0, 2.5 * (200.0 / -mv.z));
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            varying float vAlpha;
            varying vec3 vColor;
            void main() {
                // Soft circular point
                float d = length(gl_PointCoord - 0.5) * 2.0;
                if (d > 1.0) discard;
                float alpha = smoothstep(1.0, 0.3, d) * vAlpha;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
    });

    scene.add(new THREE.Points(geometry, mat));

    return { particles, positions, colors, alphas, geometry };
}

export function updateWindFlow(ctx: WindFlowContext, t: number, dt: number, motionScale: number): void {
    const scaledDt = dt * motionScale;

    for (let i = 0; i < ctx.particles.length; i++) {
        const p = ctx.particles[i];
        p.age += scaledDt;

        if (p.age >= p.maxAge) {
            Object.assign(p, spawnWindParticle());
        }

        // Advect particle by wind field
        const [u, v] = getWind(p.lat, p.lon, t);
        const speed = windSpeed(u, v);

        // Convert degrees/second to position update
        // Scale factor: at equator, 1° lon ≈ 111km. At higher latitudes, shrink lon step.
        const cosLat = Math.cos(p.lat * Math.PI / 180);
        p.lon += u * scaledDt * 0.15 / Math.max(cosLat, 0.1);
        p.lat += v * scaledDt * 0.15;

        // Wrap longitude, clamp latitude
        if (p.lon > 180) p.lon -= 360;
        if (p.lon < -180) p.lon += 360;
        p.lat = Math.max(-85, Math.min(85, p.lat));

        // Project to 3D
        const pos = ll2v(p.lat, p.lon, WIND_RADIUS);
        ctx.positions[i * 3] = pos.x;
        ctx.positions[i * 3 + 1] = pos.y;
        ctx.positions[i * 3 + 2] = pos.z;

        // Color by wind speed
        const [r, g, b] = windSpeedColor(speed);
        ctx.colors[i * 3] = r;
        ctx.colors[i * 3 + 1] = g;
        ctx.colors[i * 3 + 2] = b;

        // Alpha: fade in at birth, fade out at death
        const life = p.age / p.maxAge;
        const fadeIn = Math.min(life * 5, 1); // first 20%
        const fadeOut = Math.min((1 - life) * 5, 1); // last 20%
        ctx.alphas[i] = fadeIn * fadeOut * 0.6;
    }

    ctx.geometry.attributes.position.needsUpdate = true;
    ctx.geometry.attributes.color.needsUpdate = true;
    (ctx.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
}
