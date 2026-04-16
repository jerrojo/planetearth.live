/**
 * Earth Event Pulses — real-time seismic + volcanic + weather events.
 * Uses live USGS earthquake data when available, falls back to known active zones.
 * Color by type: seismic (blue→red by magnitude), volcanic (red-orange), weather (amber).
 */
import * as THREE from 'three';
import { MAX_PULSES } from '../../config/constants';
import { ll2v } from '../../utils/math';
import { seismicColor } from '../../utils/color-scales';
import { getCachedEarthquakes, type Earthquake } from '../../services/earthquake-feed';

interface EventLocation {
    lat: number;
    lon: number;
    type: 'seismic' | 'volcanic' | 'weather';
    mag?: number;
}

// Fallback locations for when USGS feed is unavailable
const FALLBACK_EVENTS: EventLocation[] = [
    // Ring of Fire
    { lat: -33, lon: -71, type: 'seismic' }, { lat: 36, lon: 140, type: 'seismic' },
    { lat: -6, lon: 120, type: 'seismic' }, { lat: 14, lon: 121, type: 'seismic' },
    { lat: 61, lon: -150, type: 'seismic' }, { lat: 17, lon: -100, type: 'seismic' },
    { lat: -42, lon: 173, type: 'seismic' }, { lat: 39, lon: 35, type: 'seismic' },
    { lat: 28, lon: 85, type: 'seismic' },
    // Volcanic
    { lat: 65, lon: -18, type: 'volcanic' }, { lat: 19.5, lon: -155.5, type: 'volcanic' },
    { lat: 56, lon: 160, type: 'volcanic' }, { lat: -8, lon: 112, type: 'volcanic' },
    // Weather corridors
    { lat: 35, lon: -97, type: 'weather' }, { lat: 15, lon: 90, type: 'weather' },
    { lat: 18, lon: -75, type: 'weather' }, { lat: 20, lon: 135, type: 'weather' },
];

const EVENT_COLORS: Record<string, number> = {
    volcanic: 0xff6040,
    weather: 0xffa020,
};

function pickEvent(): EventLocation {
    const quakes = getCachedEarthquakes();

    // 70% chance to use live earthquake data if available
    if (quakes.length > 0 && Math.random() < 0.7) {
        const q = quakes[Math.floor(Math.random() * quakes.length)];
        return { lat: q.lat, lon: q.lon, type: 'seismic', mag: q.mag };
    }

    return FALLBACK_EVENTS[Math.floor(Math.random() * FALLBACK_EVENTS.length)];
}

const pulsePool: THREE.Mesh[] = [];
const activePulses: THREE.Mesh[] = [];

export function createPulsePool(globeGroup: THREE.Group): void {
    for (let i = 0; i < MAX_PULSES; i++) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.01, 0.03, 20),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })
        );
        ring.visible = false;
        globeGroup.add(ring);
        pulsePool.push(ring);
    }
}

export function spawnPulse(): void {
    const ring = pulsePool.find(r => !r.visible);
    if (!ring) return;

    const event = pickEvent();
    const lat = event.lat + (Math.random() - 0.5) * 3;
    const lon = event.lon + (Math.random() - 0.5) * 3;

    const pos = ll2v(lat, lon, 5.06);
    ring.position.copy(pos);
    ring.lookAt(pos.clone().multiplyScalar(2));

    // Seismic events use magnitude-based color (IPCC-style scale)
    let color: number;
    if (event.type === 'seismic') {
        const mag = event.mag ?? 4;
        const [r, g, b] = seismicColor(mag);
        color = new THREE.Color(r, g, b).getHex();
    } else {
        color = EVENT_COLORS[event.type] ?? 0xffa020;
    }

    (ring.material as THREE.MeshBasicMaterial).color.set(color);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.7;
    ring.scale.setScalar(1);
    ring.visible = true;

    const maxAge = event.type === 'seismic' ? 1.5 + Math.random() * 1.0
        : event.type === 'volcanic' ? 2.0 + Math.random() * 1.5
        : 2.5 + Math.random() * 2.0;

    // Seismic pulse expansion uses exponential scaling (energy ∝ 10^(1.5*mag))
    // Visual: ~2× expansion per magnitude unit — M5 is 2× M4, M6 is 4× M4, M7 is 8× M4
    const magScale = event.mag ? Math.pow(2, Math.max(0, event.mag - 4)) : 1;

    ring.userData = { age: 0, maxAge, type: event.type, magScale };
    activePulses.push(ring);
}

export function updatePulses(dt: number): void {
    for (let i = activePulses.length - 1; i >= 0; i--) {
        const p = activePulses[i];
        p.userData.age += dt;
        const prog = p.userData.age / p.userData.maxAge;

        const baseExpand = p.userData.type === 'seismic' ? 12 : p.userData.type === 'volcanic' ? 10 : 16;
        const expand = baseExpand * (p.userData.magScale || 1);
        p.scale.setScalar(1 + prog * expand);
        (p.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.5;

        if (prog >= 1) {
            p.visible = false;
            activePulses.splice(i, 1);
        }
    }
}
