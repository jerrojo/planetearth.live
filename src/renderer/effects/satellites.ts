/**
 * Starlink satellite constellation — live positions from Celestrak TLE data.
 *
 * Pulls the latest Starlink orbital elements from Celestrak's public GP endpoint
 * every 6 hours, propagates each satellite's position with a simple Kepler
 * solver (good enough for visual fidelity at globe zoom levels — no J2 drag),
 * and renders the ~6000-strong constellation as a Points cloud.
 *
 * This is an editorial/visual layer, not a tracking tool. Positions are
 * accurate to within a few km — invisible at our camera distance but well
 * outside what anyone should use for navigation.
 *
 * Sources:
 *   - Celestrak GP (https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json)
 *   - IAU 1982 GMST formula for ECI → ECEF rotation
 *
 * Toggleable via Settings → Layers → Satellites. Fetched lazily when the user
 * first enables the layer, so the default landing has zero network + zero GPU
 * impact from this feature.
 */
import * as THREE from 'three';
import { ll2v } from '../../utils/math';

const GLOBE_RADIUS_UNITS = 5;         // scene units
const EARTH_RADIUS_KM = 6371;
const MU_EARTH = 3.986004418e14;      // m³/s²
const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json';
const REFRESH_MS = 6 * 60 * 60 * 1000; // 6h
const MAX_SATS = 8000;                 // safety cap
const FETCH_TIMEOUT_MS = 15000;        // give up after 15s, retry in background
const CACHE_KEY = 'planetearth-starlink-tle-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — orbital elements drift slowly for visual use

interface OrbitalElements {
    incl: number;       // inclination (rad)
    raan: number;       // right ascension of ascending node (rad)
    ecc: number;        // eccentricity (near-zero for Starlink)
    argPer: number;     // argument of perigee (rad)
    meanAnomalyEpoch: number; // mean anomaly at epoch (rad)
    meanMotionRadSec: number; // rad/s
    semiMajorAxisM: number;   // metres
    epochMs: number;          // Unix time of epoch
}

interface CelestrakEntry {
    EPOCH: string;
    INCLINATION: number;
    RA_OF_ASC_NODE: number;
    ECCENTRICITY: number;
    ARG_OF_PERICENTER: number;
    MEAN_ANOMALY: number;
    MEAN_MOTION: number;
}

function deg2rad(d: number): number { return d * Math.PI / 180; }

function parseElements(entry: CelestrakEntry): OrbitalElements | null {
    const n = entry.MEAN_MOTION;
    if (!Number.isFinite(n) || n <= 0) return null;
    const meanMotionRadSec = n * 2 * Math.PI / 86400;
    const semiMajorAxisM = Math.pow(MU_EARTH / (meanMotionRadSec * meanMotionRadSec), 1 / 3);
    const epochMs = Date.parse(entry.EPOCH);
    if (!Number.isFinite(epochMs)) return null;
    return {
        incl: deg2rad(entry.INCLINATION),
        raan: deg2rad(entry.RA_OF_ASC_NODE),
        ecc: entry.ECCENTRICITY,
        argPer: deg2rad(entry.ARG_OF_PERICENTER),
        meanAnomalyEpoch: deg2rad(entry.MEAN_ANOMALY),
        meanMotionRadSec,
        semiMajorAxisM,
        epochMs,
    };
}

/**
 * Greenwich Mean Sidereal Time (rad) — IAU 1982 formula.
 * Used to rotate ECI coordinates into ECEF so satellites track with our
 * (already rotating) globe correctly.
 */
function gmstRad(date: Date): number {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const d = jd - 2451545.0;
    const T = d / 36525;
    let gmstDeg = 280.46061837 + 360.98564736629 * d
        + 0.000387933 * T * T - (T * T * T) / 38710000;
    gmstDeg = ((gmstDeg % 360) + 360) % 360;
    return gmstDeg * Math.PI / 180;
}

/**
 * Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E.
 * 3 Newton iterations is plenty for Starlink's near-circular orbits (e < 0.001).
 */
function solveKepler(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 3; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
}

/**
 * Propagate an orbit to time `nowMs` and return ECEF (x,y,z) in kilometres.
 * ECI → ECEF rotation uses GMST. Good to a few km — ample for visualisation.
 */
function propagateToECEF(el: OrbitalElements, nowMs: number, out: { x: number; y: number; z: number }): void {
    const dt = (nowMs - el.epochMs) / 1000; // seconds
    const M = el.meanAnomalyEpoch + el.meanMotionRadSec * dt;
    const E = solveKepler(M, el.ecc);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);

    // True anomaly
    const sqrt1me2 = Math.sqrt(1 - el.ecc * el.ecc);
    const sinNu = sqrt1me2 * sinE / (1 - el.ecc * cosE);
    const cosNu = (cosE - el.ecc) / (1 - el.ecc * cosE);

    // Distance (metres)
    const r = el.semiMajorAxisM * (1 - el.ecc * cosE);

    // Position in perifocal frame (argument of perigee + true anomaly)
    const uArg = el.argPer + Math.atan2(sinNu, cosNu);
    const cosU = Math.cos(uArg);
    const sinU = Math.sin(uArg);

    const cosRaan = Math.cos(el.raan);
    const sinRaan = Math.sin(el.raan);
    const cosIncl = Math.cos(el.incl);
    const sinIncl = Math.sin(el.incl);

    // Rotate perifocal → ECI (classical sequence: R3(-Ω) * R1(-i) * R3(-ω))
    const xEci = r * (cosRaan * cosU - sinRaan * sinU * cosIncl);
    const yEci = r * (sinRaan * cosU + cosRaan * sinU * cosIncl);
    const zEci = r * (sinU * sinIncl);

    // ECI → ECEF via GMST
    const gmst = gmstRad(new Date(nowMs));
    const cosG = Math.cos(gmst);
    const sinG = Math.sin(gmst);
    out.x = (xEci * cosG + yEci * sinG) / 1000;   // → km
    out.y = (-xEci * sinG + yEci * cosG) / 1000;
    out.z = zEci / 1000;
}

export interface SatellitesContext {
    group: THREE.Group;
    /**
     * Propagate orbits to the given wall-clock time (ms since epoch).
     * Pass an accelerated time when the globe is on demo-speed rotation so
     * satellite ground-tracks stay visually faster than Earth's surface —
     * the real ratio (orbit ≈ 14× sidereal rotation) is preserved.
     */
    update: (nowMs?: number) => void;
    /** Fetch the latest TLE batch from Celestrak (uses cached data if fresh). */
    refresh: () => Promise<void>;
    /**
     * Start the TLE pipeline in the background without making the layer visible.
     * Called from app boot on idle so the first time a user enables Satellites,
     * the points render instantly instead of waiting 3-10s for a 2+MB fetch.
     */
    prewarm: () => Promise<void>;
}

// Shell classification by altitude (km above Earth) — maps to constellation
// design: primary 53° shell is being lowered from 550→480 km through 2026,
// polar 97.6° shell sits at ~560 km. A handful of older sats still hover near
// their drift altitudes. Each shell gets a distinct hue so the viewer can
// visually parse "this ring is the polar shell" etc. — same data as the
// Wikipedia/Celestrak tables, legible at a glance.
const SHELL_LOW       = 500;  // km — primary lowered shell (~480-500)
const SHELL_MID       = 555;  // km — legacy 550 shell, still widely populated
const SHELL_POLAR     = 565;  // km — ~560 polar (97.6°)
const SHELL_DRIFT_HI  = 600;  // km — residual higher-drift satellites

/** Map altitude (km) to shell code 0..3 used by the shader for hue/size. */
function shellCode(altKm: number): number {
    if (altKm < (SHELL_LOW + SHELL_MID) / 2) return 0;       // low shell
    if (altKm < (SHELL_MID + SHELL_POLAR) / 2) return 1;     // mid 53°
    if (altKm < (SHELL_POLAR + SHELL_DRIFT_HI) / 2) return 2; // polar 97.6°
    return 3;                                                 // drift / high
}

export function createSatellites(globeGroup: THREE.Group): SatellitesContext {
    const group = new THREE.Group();
    group.name = 'starlinkSatellites';
    globeGroup.add(group);

    let elements: OrbitalElements[] = [];
    let geometry: THREE.BufferGeometry | null = null;
    let positions: Float32Array | null = null;
    let shells: Float32Array | null = null;        // per-sat shell code 0..3
    let phases: Float32Array | null = null;        // per-sat random phase (0..1) for flare twinkle
    let material: THREE.ShaderMaterial | null = null;
    const tmp = { x: 0, y: 0, z: 0 };
    // Sun direction in world space (ECEF-ish) — recomputed each update().
    // Used by the shader to produce the "dusk-terminator flare" effect: a
    // satellite lit by the sun and close to the observer-side terminator flashes
    // like a real Starlink specular reflection.
    const sunDir = new THREE.Vector3(1, 0, 0);

    function build(): void {
        // Teardown previous buffers
        while (group.children.length) {
            const c = group.children[0];
            group.remove(c);
            if (c instanceof THREE.Points) {
                c.geometry.dispose();
                (c.material as THREE.Material).dispose();
            }
        }
        if (!elements.length) return;

        const n = Math.min(elements.length, MAX_SATS);
        positions = new Float32Array(n * 3);
        shells = new Float32Array(n);
        phases = new Float32Array(n);
        for (let i = 0; i < n; i++) phases[i] = Math.random();
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aShell', new THREE.BufferAttribute(shells, 1));
        geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

        material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime:    { value: 0 },
                uSunDir:  { value: sunDir },
            },
            vertexShader: /* glsl */ `
                attribute float aShell;
                attribute float aPhase;
                uniform float uTime;
                uniform vec3 uSunDir;
                varying float vShell;
                varying float vFlare;
                varying float vLit;
                void main() {
                    vShell = aShell;
                    vec4 world = modelMatrix * vec4(position, 1.0);
                    vec3 nrm = normalize(world.xyz);
                    // Dot with sun: +1 = full sun, -1 = full shadow.
                    // Starlinks in Earth's shadow disappear; lit ones pick up a specular
                    // term when the view-reflection angle aligns with the sun (dusk flare).
                    float sunDot = dot(nrm, normalize(uSunDir));
                    vLit = smoothstep(-0.05, 0.15, sunDot); // 0..1, crisp terminator

                    // Flare: rare, brief, bright. Real Starlinks flare for 1-3s when panel
                    // mirrors the sun to the observer. We fake it with a per-sat phase
                    // that sweeps a narrow cone past the sun direction roughly once per
                    // orbit — cheap, gives the characteristic sparkle.
                    float phaseT = fract(aPhase + uTime * 0.008);
                    float flareWindow = smoothstep(0.495, 0.5, phaseT) * smoothstep(0.505, 0.5, phaseT);
                    vFlare = flareWindow * vLit;

                    vec4 mv = viewMatrix * world;
                    // Point size cut to ~half the old footprint. Real Starlinks are 3 m
                    // specks at 550 km — they should read as tiny moving dots, not bright
                    // orbs. Flare moments still bloom to ~2× so the sparkle stays legible.
                    float basePx = 0.75 + 0.25 * step(0.5, vShell);     // polar shell nudge
                    gl_PointSize = max(0.8, basePx * (180.0 / -mv.z) * mix(1.0, 2.0, vFlare));
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */ `
                varying float vShell;
                varying float vFlare;
                varying float vLit;
                void main() {
                    float d = length(gl_PointCoord - 0.5) * 2.0;
                    if (d > 1.0) discard;
                    float a = smoothstep(1.0, 0.15, d);
                    if (vLit < 0.02) discard; // hide eclipsed satellites

                    // Shell color palette (cool-white base with shell accents):
                    //   shell 0 (~480 km low):  pale cyan  — the new lowered tier
                    //   shell 1 (~550 km mid):  warm white — the workhorse shell
                    //   shell 2 (~560 km pol):  cool teal  — polar shell (97.6°)
                    //   shell 3 (~600 km hi ):  faint gold — residual high drifters
                    vec3 c0 = vec3(0.78, 0.92, 1.00);
                    vec3 c1 = vec3(0.96, 0.94, 0.86);
                    vec3 c2 = vec3(0.72, 0.95, 0.98);
                    vec3 c3 = vec3(1.00, 0.88, 0.72);
                    vec3 col = c1;
                    if (vShell < 0.5)      col = c0;
                    else if (vShell < 1.5) col = c1;
                    else if (vShell < 2.5) col = c2;
                    else                   col = c3;

                    // Flare: crush to near-white + boost alpha, brief but intense
                    col = mix(col, vec3(1.0, 1.0, 0.95), vFlare * 0.9);
                    float alpha = a * (0.70 + 0.55 * vFlare) * vLit;
                    gl_FragColor = vec4(col, alpha);
                }
            `,
        });

        group.add(new THREE.Points(geometry, material));
    }

    function update(simNowMs?: number): void {
        if (!elements.length || !positions || !geometry || !shells) return;
        // When the app runs on demo-accelerated Earth rotation, satellites need
        // the same accelerated clock for orbital propagation. Otherwise the
        // Earth spins ~1100× faster than real and the sats look pinned to it.
        const nowMs = simNowMs ?? Date.now();
        const n = Math.min(elements.length, MAX_SATS);

        // Sun direction in ECEF — use day-of-year + hour to rotate a canonical
        // ecliptic-ish vector. Good enough for visual terminator placement.
        // Obliquity ≈23.44°, hour-angle derived from UTC.
        const d = new Date(nowMs);
        const dayOfYear = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
                           Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000;
        const declRad = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);
        const hourUTC = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
        const hourAngle = (12 - hourUTC) * 15 * Math.PI / 180; // noon longitude of sun
        sunDir.set(
            Math.cos(declRad) * Math.cos(hourAngle),
            Math.sin(declRad),
            Math.cos(declRad) * Math.sin(hourAngle),
        ).normalize();
        if (material) {
            material.uniforms['uTime']!.value = nowMs / 1000;
        }

        for (let i = 0; i < n; i++) {
            propagateToECEF(elements[i], nowMs, tmp);
            // ECEF (x,y,z in km) → geodetic lat/lon + altitude (spherical Earth, adequate for viz)
            const rKm = Math.sqrt(tmp.x * tmp.x + tmp.y * tmp.y + tmp.z * tmp.z);
            const altKm = rKm - EARTH_RADIUS_KM;
            shells[i] = shellCode(altKm);
            const lat = Math.asin(tmp.z / rKm) * 180 / Math.PI;
            const lon = Math.atan2(tmp.y, tmp.x) * 180 / Math.PI;
            const rUnits = (rKm / EARTH_RADIUS_KM) * GLOBE_RADIUS_UNITS;
            const v = ll2v(lat, lon, rUnits);
            positions[i * 3]     = v.x;
            positions[i * 3 + 1] = v.y;
            positions[i * 3 + 2] = v.z;
        }
        (geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;
        (geometry.attributes['aShell'] as THREE.BufferAttribute).needsUpdate = true;
    }

    /**
     * Attempt to load TLE JSON from the localStorage cache. Returns parsed
     * entries if the cache exists and is fresh (<24h); null otherwise.
     * Cache misses are silent — localStorage can throw in private-browsing
     * mode and that's fine, we just fall back to the network.
     */
    function loadFromCache(): CelestrakEntry[] | null {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as { ts: number; data: CelestrakEntry[] };
            if (!parsed || typeof parsed.ts !== 'number') return null;
            if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
            if (!Array.isArray(parsed.data) || !parsed.data.length) return null;
            return parsed.data;
        } catch {
            return null;
        }
    }

    function saveToCache(data: CelestrakEntry[]): void {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch {
            // Quota exceeded or disabled — not fatal, next boot re-fetches.
        }
    }

    function applyEntries(data: CelestrakEntry[]): void {
        const parsed = data.map(parseElements).filter((x): x is OrbitalElements => x !== null);
        if (!parsed.length) return;
        elements = parsed;
        build();
        update();
    }

    /** Fetch with a hard timeout so a hung connection doesn't block forever. */
    async function fetchTLEs(): Promise<CelestrakEntry[] | null> {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
        try {
            const res = await fetch(CELESTRAK_URL, { cache: 'no-cache', signal: ac.signal });
            if (!res.ok) throw new Error(`Celestrak ${res.status}`);
            const data = await res.json() as CelestrakEntry[];
            if (Array.isArray(data) && data.length) {
                saveToCache(data);
                return data;
            }
            return null;
        } catch (err) {
            // Optional layer — log at warn level so devs can see it in devtools
            // but the app keeps running happily without satellites.
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Starlink TLE fetch failed, keeping any cached data:', err);
            }
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Hybrid refresh: paint from cache immediately (if fresh), then fetch in the
     * background to update. On a cache miss, awaits the network. This means
     * repeat activations of the Satellites layer render instantly.
     */
    async function refresh(): Promise<void> {
        const cached = loadFromCache();
        if (cached) {
            applyEntries(cached);
            // Background refresh — don't await. The painted positions will
            // silently update next frame when new elements arrive.
            void fetchTLEs().then(data => { if (data) applyEntries(data); });
            return;
        }
        const fresh = await fetchTLEs();
        if (fresh) applyEntries(fresh);
    }

    // Auto-refresh on a long cadence. The first call happens only when the layer
    // is enabled (wired from app.ts), so disabled layers cost nothing.
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    function ensureRefreshCycle(): void {
        if (refreshTimer !== null) return;
        refreshTimer = setInterval(() => { void refresh(); }, REFRESH_MS);
    }

    /**
     * Fire the fetch/cache pipeline without making the layer visible. Called
     * from app boot on requestIdleCallback so the first user activation is
     * instant. If the TLE is already cached, this is a no-op network-wise.
     */
    let prewarmed = false;
    async function prewarm(): Promise<void> {
        if (prewarmed) return;
        prewarmed = true;
        await refresh();
    }

    return {
        group,
        update,
        refresh: async () => {
            ensureRefreshCycle();
            await refresh();
        },
        prewarm: async () => {
            ensureRefreshCycle();
            await prewarm();
        },
    };
}
