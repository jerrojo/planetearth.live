import * as THREE from 'three';
import { EARTH_AXIAL_TILT } from '../../config/constants';

/**
 * Day/Night Terminator — realistic shadow based on real solar position.
 * Sun direction computed from UTC date/time using solar declination + hour angle.
 * City lights use NASA Blue Marble texture sampling to mask ocean areas —
 * lights only appear where the underlying texture shows land (luminance > threshold).
 * Sources: Meeus (1991) "Astronomical Algorithms", USNO solar position equations.
 */
export interface DayNightContext {
    material: THREE.ShaderMaterial;
}

// Cached vector for sun direction (avoids per-frame allocation)
const _sunDir = new THREE.Vector3();
let _lastSunUpdate = 0;

/**
 * Compute sun direction in world space from current UTC time.
 * Uses simplified solar position: declination from day-of-year, hour angle from UTC hour.
 * Throttled: only recalculates once per second (sun barely moves).
 */
export function computeSunDirection(): THREE.Vector3 {
    const now = Date.now();
    if (now - _lastSunUpdate < 1000) return _sunDir;
    _lastSunUpdate = now;

    const date = new Date(now);
    const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const dayOfYear = (now - startOfYear.getTime()) / 86400000;

    // Solar declination: δ = −ε·cos(2π(N+10)/365.25)
    // Peaks +23.44° at summer solstice (day ~172), −23.44° at winter solstice
    const declination = -EARTH_AXIAL_TILT * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365.25);

    // Hour angle: sun crosses Greenwich meridian at 12:00 UTC
    // 15°/hour westward, converted to radians
    const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const hourAngle = ((hours - 12) / 24) * 2 * Math.PI;

    // Sun direction vector (Y = north pole)
    _sunDir.set(
        -Math.cos(declination) * Math.sin(hourAngle),
        Math.sin(declination),
        Math.cos(declination) * Math.cos(hourAngle)
    ).normalize();

    return _sunDir;
}

export function createDayNight(globeGroup: THREE.Group): DayNightContext {
    // Load earth texture for land/ocean discrimination in city lights
    // Land pixels have higher luminance & green/brown tones; ocean is dark blue
    const earthTex = new THREE.TextureLoader().load('/textures/earth-blue-marble.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.SphereGeometry(5.02, 64, 64);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uSunDir: { value: computeSunDirection().clone() },
            uEarthTex: { value: earthTex },
        },
        vertexShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec2 vUv;
            void main() {
                // World-space normal for correct sun dot product
                vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uSunDir;
            uniform sampler2D uEarthTex;
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec2 vUv;

            void main() {
                float dotSun = dot(normalize(vNormal), uSunDir);

                // Terminator with civil/nautical/astronomical twilight zones
                // Civil twilight: sun 0° to −6° below horizon (smoothstep −0.1 to 0.0)
                // Nautical: −6° to −12° (smoothstep −0.2 to −0.1)
                // Smooth blend across ~18° of twilight
                float shadow = smoothstep(-0.2, 0.15, dotSun);

                // Night side: deep blue-black, not pure black (atmospheric scattering)
                vec3 nightTint = vec3(0.02, 0.04, 0.12);
                vec3 dayTint = vec3(0.0);

                vec3 color = mix(nightTint, dayTint, shadow);
                float alpha = (1.0 - shadow) * 0.55;

                // === City lights: LAND-MASKED using earth texture ===
                // Sample the Blue Marble texture to discriminate land vs ocean.
                // Ocean pixels are very dark blue (low R, low G, moderate B).
                // Land pixels have higher overall luminance and more green/red.
                vec3 earthColor = texture2D(uEarthTex, vUv).rgb;
                float earthLuma = dot(earthColor, vec3(0.2126, 0.7152, 0.0722));
                // Land detection: luminance threshold + green-blue ratio
                // Ocean: R≈0.02, G≈0.05, B≈0.15 → luma≈0.06, ratio≈0.33
                // Land:  R≈0.15, G≈0.25, B≈0.10 → luma≈0.21, ratio≈2.5
                float gbRatio = earthColor.g / max(earthColor.b, 0.01);
                float isLand = smoothstep(0.08, 0.14, earthLuma) * smoothstep(0.4, 1.0, gbRatio);
                // Boost detection for bright features (snow, sand, ice)
                isLand = max(isLand, smoothstep(0.18, 0.25, earthLuma));

                float nightIntensity = 1.0 - shadow;
                float sparkle = fract(sin(dot(vWorldPos.xz * 50.0, vec2(12.9898, 78.233))) * 43758.5453);
                float cityLight = step(0.97, sparkle) * nightIntensity * isLand * 0.4;
                color += vec3(1.0, 0.9, 0.6) * cityLight;

                gl_FragColor = vec4(color, alpha + cityLight * 0.3);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
    });

    const mesh = new THREE.Mesh(geo, material);
    globeGroup.add(mesh);

    return { material };
}

export function updateDayNight(ctx: DayNightContext): void {
    // Recompute sun direction from real UTC time (throttled to 1/sec internally)
    const dir = computeSunDirection();
    ctx.material.uniforms.uSunDir.value.copy(dir);
}
