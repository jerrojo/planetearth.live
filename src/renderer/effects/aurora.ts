import * as THREE from 'three';
import { liveData } from '../../state/live-data';

/**
 * Aurora Borealis/Australis — scientifically-grounded polar light simulation.
 *
 * Physics model:
 *   - Auroral oval centered at ~67° geomagnetic latitude (quiet, Kp≈2)
 *   - Oval expands equatorward during geomagnetic storms (Kp 5-9 → 60-55°)
 *   - Color distribution: green (557.7nm OI) dominates ~70% of visible aurora,
 *     blue (427.8nm N₂⁺) ~20%, red/purple only during intense storms (Kp>6)
 *   - Curtain height: 100-300km altitude (0.016-0.047 Earth radii above surface)
 *
 * Sources: Akasofu (1964), Feldstein & Starkov (1967), NOAA SWPC Kp index
 */
export interface AuroraContext {
    material: THREE.ShaderMaterial;
    meshNorth: THREE.Points;
    meshSouth: THREE.Points;
}

const AURORA_POINTS = window.innerWidth < 768 ? 400 : 800;

/**
 * Simulate a pseudo-Kp index that varies over time.
 * Real Kp data comes from NOAA SWPC every 3 hours; here we model
 * a quasi-periodic substorm cycle (~3h period) with random "storms."
 */
function pseudoKpIndex(time: number): number {
    // Base quiet level: Kp ≈ 2
    const base = 2.0;
    // Substorm cycle (~3 hour period in sim-time)
    const substorm = Math.sin(time * 0.09) * 0.5 + 0.5; // 0-1
    // Occasional "storm" enhancement (rare, slow)
    const storm = Math.pow(Math.sin(time * 0.013) * 0.5 + 0.5, 4) * 5; // 0-5
    return Math.min(9, base + substorm * 1.5 + storm);
}

/**
 * Create aurora OVAL positioned around the GEOMAGNETIC pole, not geographic pole.
 * The geomagnetic north pole is at ~80.7°N, 72.7°W (2024 IGRF-13 model).
 * The geomagnetic south pole is at ~80.7°S, 107.3°E.
 * Colatitude offset = 90° - 80.7° = 9.3° from geographic pole.
 *
 * The Feldstein-Starkov auroral oval is NOT a circle — it's elongated:
 *   - Nightside (magnetic midnight): ~67° geomagnetic lat (equatorward)
 *   - Dayside (magnetic noon):       ~77° geomagnetic lat (poleward)
 *   - Dawn/dusk:                     ~72° geomagnetic lat (intermediate)
 * Source: Feldstein & Starkov (1967), Holzworth & Meng (1975)
 *
 * We also store a "local time" parameter per point so the shader can
 * make the nightside brighter (where substorm aurora concentrates).
 */
function createAuroraRing(radius: number, latCenter: number): {
    positions: Float32Array;
    randoms: Float32Array;
} {
    const positions = new Float32Array(AURORA_POINTS * 3);
    const randoms = new Float32Array(AURORA_POINTS * 3);

    // Geomagnetic pole offset — 9.3° colatitude (IGRF-13 epoch 2024)
    const isNorth = latCenter > 0;
    const tiltAngle = (9.3 * Math.PI) / 180; // corrected from 11° to 9.3°
    const tiltLon = isNorth ? (-72.7 * Math.PI) / 180 : (107.3 * Math.PI) / 180;

    const cosT = Math.cos(tiltAngle);
    const sinT = Math.sin(tiltAngle);
    const cosL = Math.cos(tiltLon);
    const sinL = Math.sin(tiltLon);

    // Feldstein oval: latitude varies with magnetic local time (MLT)
    // MLT=0 (midnight): most equatorward, MLT=12 (noon): most poleward
    const latMidnight = Math.abs(latCenter);          // 67° — equatorward
    const latNoon     = Math.abs(latCenter) + 10;     // 77° — poleward
    const sign = latCenter > 0 ? 1 : -1;

    for (let i = 0; i < AURORA_POINTS; i++) {
        // "lon" here acts as magnetic local time around the oval
        // lon=0 → midnight sector, lon=π → noon sector
        const lon = (i / AURORA_POINTS) * Math.PI * 2;
        const latOffset = (Math.random() - 0.5) * 0.12;

        // Feldstein oval shape: cosine variation from midnight to noon
        // cos(lon)=1 at midnight → use latMidnight (equatorward)
        // cos(lon)=-1 at noon → use latNoon (poleward)
        const mltFactor = Math.cos(lon) * 0.5 + 0.5; // 1 at midnight, 0 at noon
        const ovalLat = latNoon + (latMidnight - latNoon) * mltFactor;
        const lat = (sign * (ovalLat + latOffset * 25) * Math.PI) / 180;

        let x = radius * Math.cos(lat) * Math.cos(lon);
        let y = radius * Math.sin(lat);
        let z = radius * Math.cos(lat) * Math.sin(lon);

        // Rodrigues' rotation: tilt from geographic to geomagnetic axis
        // Rotation axis = perpendicular to tilt direction in XZ plane
        const ax = -sinL, az = cosL;
        const dotA = ax * x + az * z;
        const crossX = -az * y;
        const crossY = az * x - ax * z;
        const crossZ = ax * y;

        const x2 = x * cosT + crossX * sinT + ax * dotA * (1 - cosT);
        const y2 = y * cosT + crossY * sinT;
        const z2 = z * cosT + crossZ * sinT + az * dotA * (1 - cosT);

        positions[i * 3] = x2;
        positions[i * 3 + 1] = y2;
        positions[i * 3 + 2] = z2;

        // randoms.x = general randomness, randoms.y = size seed,
        // randoms.z = magnetic local time fraction (0=midnight, 1=noon)
        // used by shader to brighten nightside aurora
        randoms[i * 3] = Math.random();
        randoms[i * 3 + 1] = Math.random();
        randoms[i * 3 + 2] = mltFactor; // store MLT for nightside brightening
    }

    return { positions, randoms };
}

export function createAurora(scene: THREE.Object3D): AuroraContext {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uIntensity: { value: 1.0 },
            uKp: { value: 2.0 },
        },
        vertexShader: /* glsl */ `
            attribute vec3 aRandom;
            uniform float uTime;
            uniform float uIntensity;
            uniform float uKp;
            varying float vAlpha;
            varying vec3 vColor;

            void main() {
                vec3 pos = position;

                // Flowing wave animation (curtain undulation)
                float wave1 = sin(uTime * 0.4 + aRandom.x * 20.0 + pos.x * 0.5) * 0.15;
                float wave2 = cos(uTime * 0.3 + aRandom.y * 15.0 + pos.z * 0.4) * 0.12;
                float wave3 = sin(uTime * 0.6 + aRandom.z * 10.0) * 0.08;

                // Vertical curtain rise and fall
                pos.y += (wave1 + wave2) * 1.2;
                pos.x += wave3 * 0.3;
                pos.z += wave2 * 0.3;

                float heightPulse = 0.8 + 0.4 * sin(uTime * 0.2 + aRandom.x * 6.28);
                pos *= 1.0 + wave1 * 0.05 * heightPulse;

                // Kp-dependent oval expansion: higher Kp pushes aurora equatorward
                // Feldstein-Starkov: oval shifts from ~67° to ~55° mag lat (Kp=9)
                // ΔΛ ≈ 1.7° per Kp unit → compress Y to push points equatorward
                float kpExpand = 1.0 - (uKp - 2.0) * 0.018;
                pos.y *= kpExpand;

                // === Scientifically-grounded color distribution ===
                // Green (557.7nm OI): dominant emission, ~70% of visible aurora
                // Blue (427.8nm N₂⁺): common, ~20%
                // Red/purple: only during intense storms (Kp > 6), ~10%
                float colorMix = sin(uTime * 0.3 + aRandom.x * 12.0) * 0.5 + 0.5;
                // Pixar warm-shifted aurora: slightly golden-green, softer blue
                vec3 green  = vec3(0.25, 0.92, 0.45);  // 557.7nm OI — dominant green emission
                vec3 blue   = vec3(0.15, 0.45, 0.85);  // 427.8nm N₂⁺ — first negative band
                vec3 teal   = vec3(0.18, 0.78, 0.65);  // green-blue transition
                vec3 purple = vec3(0.55, 0.2, 0.75);   // N₂ Vegard-Kaplan band (rare)
                vec3 red    = vec3(0.85, 0.15, 0.18);  // 630.0nm OI — high-altitude red emission

                float band = fract(aRandom.x * 3.0 + uTime * 0.05);

                // Storm intensity determines color mix
                float stormFactor = smoothstep(4.0, 7.0, uKp); // 0 at Kp<4, 1 at Kp>7

                if (band < 0.50) {
                    // Dominant green 557.7nm OI (~50% of particles)
                    vColor = mix(green, teal, colorMix * 0.4);
                } else if (band < 0.72) {
                    // Green-blue transition (~22%)
                    vColor = mix(teal, blue, colorMix);
                } else if (band < 0.85) {
                    // Blue 427.8nm N₂⁺ band (~13%)
                    vColor = mix(blue, mix(blue, purple, stormFactor), colorMix);
                } else if (band < 0.93) {
                    // Red 630.0nm OI — high-altitude emission (~8%)
                    // Only visible during moderate-strong storms (Kp > 4)
                    // At low Kp, these particles appear as faint green instead
                    float redFactor = smoothstep(3.0, 6.0, uKp);
                    vColor = mix(green * 0.7, red, redFactor * colorMix);
                } else {
                    // Purple N₂ Vegard-Kaplan — rare, intense storms only (~7%)
                    vColor = mix(blue, purple, stormFactor * colorMix);
                }

                // Kp-dependent brightness: stronger storms = brighter aurora
                float kpBrightness = 0.6 + 0.4 * smoothstep(1.0, 6.0, uKp);

                // Nightside brightening: aRandom.z = MLT factor (1=midnight, 0=noon)
                // Most aurora activity is on the nightside (magnetic midnight sector)
                // Dayside aurora exists but is typically 3-5x fainter
                float mltFactor = aRandom.z; // 1 at midnight, 0 at noon
                float nightBright = 0.15 + 0.85 * smoothstep(0.2, 0.7, mltFactor);

                // Pulsating opacity with substorm-like brightening
                vAlpha = (0.3 + 0.7 * abs(sin(uTime * 0.25 + aRandom.y * 8.0)))
                       * uIntensity * kpBrightness * nightBright
                       * (0.5 + 0.5 * sin(mltFactor * 6.28 + uTime * 0.4));

                vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = (2.5 + aRandom.y * 4.0) * (120.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: /* glsl */ `
            varying float vAlpha;
            varying vec3 vColor;

            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                if (d > 1.0) discard;

                // Soft gaussian falloff for ethereal curtain look
                float alpha = exp(-d * d * 3.0) * vAlpha;

                gl_FragColor = vec4(vColor, alpha * 0.6);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    // North aurora (centered ~67° geomagnetic latitude)
    const northData = createAuroraRing(5.3, 67);
    const northGeo = new THREE.BufferGeometry();
    northGeo.setAttribute('position', new THREE.BufferAttribute(northData.positions, 3));
    northGeo.setAttribute('aRandom', new THREE.BufferAttribute(northData.randoms, 3));
    const meshNorth = new THREE.Points(northGeo, material);
    scene.add(meshNorth);

    // South aurora (centered ~−67° geomagnetic latitude)
    const southData = createAuroraRing(5.3, -67);
    const southGeo = new THREE.BufferGeometry();
    southGeo.setAttribute('position', new THREE.BufferAttribute(southData.positions, 3));
    southGeo.setAttribute('aRandom', new THREE.BufferAttribute(southData.randoms, 3));
    const meshSouth = new THREE.Points(southGeo, material);
    scene.add(meshSouth);

    return { material, meshNorth, meshSouth };
}

export function updateAurora(ctx: AuroraContext, time: number, motionScale: number): void {
    const t = time * motionScale;
    ctx.material.uniforms.uTime.value = t;

    // Use REAL Kp index from NOAA SWPC when available (set by api-client.ts → app.ts)
    // Falls back to pseudo-Kp simulation when API hasn't loaded yet
    const kp = liveData.kpIndex > 0 ? liveData.kpIndex : pseudoKpIndex(time);
    ctx.material.uniforms.uKp.value = kp;
}
