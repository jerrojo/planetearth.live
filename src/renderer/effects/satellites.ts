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
    /** Force a positions refresh (e.g. after fetching new TLEs). */
    update: () => void;
    /** Fetch the latest TLE batch from Celestrak. */
    refresh: () => Promise<void>;
}

export function createSatellites(globeGroup: THREE.Group): SatellitesContext {
    const group = new THREE.Group();
    group.name = 'starlinkSatellites';
    globeGroup.add(group);

    let elements: OrbitalElements[] = [];
    let geometry: THREE.BufferGeometry | null = null;
    let positions: Float32Array | null = null;
    const tmp = { x: 0, y: 0, z: 0 };

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
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexShader: /* glsl */ `
                void main() {
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = max(1.2, 1.6 * (180.0 / -mv.z));
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */ `
                void main() {
                    float d = length(gl_PointCoord - 0.5) * 2.0;
                    if (d > 1.0) discard;
                    float a = smoothstep(1.0, 0.15, d);
                    // Starlinks are reflective metal — cool-white with a faint cyan edge
                    gl_FragColor = vec4(0.82, 0.92, 1.0, a * 0.85);
                }
            `,
        });

        group.add(new THREE.Points(geometry, material));
    }

    function update(): void {
        if (!elements.length || !positions || !geometry) return;
        const nowMs = Date.now();
        const n = Math.min(elements.length, MAX_SATS);
        for (let i = 0; i < n; i++) {
            propagateToECEF(elements[i], nowMs, tmp);
            // ECEF (x,y,z in km) → geodetic lat/lon + altitude (spherical Earth, adequate for viz)
            const rKm = Math.sqrt(tmp.x * tmp.x + tmp.y * tmp.y + tmp.z * tmp.z);
            const lat = Math.asin(tmp.z / rKm) * 180 / Math.PI;
            const lon = Math.atan2(tmp.y, tmp.x) * 180 / Math.PI;
            const rUnits = (rKm / EARTH_RADIUS_KM) * GLOBE_RADIUS_UNITS;
            const v = ll2v(lat, lon, rUnits);
            positions[i * 3]     = v.x;
            positions[i * 3 + 1] = v.y;
            positions[i * 3 + 2] = v.z;
        }
        (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    async function refresh(): Promise<void> {
        try {
            const res = await fetch(CELESTRAK_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`Celestrak ${res.status}`);
            const data: CelestrakEntry[] = await res.json();
            const parsed = data.map(parseElements).filter((x): x is OrbitalElements => x !== null);
            if (!parsed.length) return;
            elements = parsed;
            build();
            update();
        } catch {
            // Swallow — satellites is an optional layer, non-fatal.
        }
    }

    // Auto-refresh on a long cadence. The first call happens only when the layer
    // is enabled (wired from app.ts), so disabled layers cost nothing.
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    function ensureRefreshCycle(): void {
        if (refreshTimer !== null) return;
        refreshTimer = setInterval(() => { void refresh(); }, REFRESH_MS);
    }

    return {
        group,
        update,
        refresh: async () => {
            ensureRefreshCycle();
            await refresh();
        },
    };
}
