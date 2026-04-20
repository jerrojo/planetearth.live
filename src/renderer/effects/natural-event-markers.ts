/**
 * Natural Event Markers — persistent 3D markers for live EONET events.
 *
 * Renders wildfires, volcanoes, severe storms and other natural hazards
 * as glowing beacons on the globe surface, positioned at the exact lat/lon
 * reported by NASA's EONET v3 API.
 *
 * Visual encoding:
 *   - Wildfires: warm red-orange flame, pulse tied to fire intensity
 *   - Volcanoes: deep crimson-magenta with upward plume
 *   - Severe storms / cyclones: amber spiral glyph
 *   - Sea/lake ice, drought, dust: tonal greys/browns
 *
 * Earthquakes are intentionally excluded — they're visualized as pulse rings
 * (src/renderer/particles/pulse-rings.ts) which better convey a seismic event's
 * transient nature.
 *
 * Architecture: pure factory + rebuild-on-update. The caller invokes rebuild()
 * whenever liveData.naturalEvents changes (typically after a 30-minute refresh).
 */
import * as THREE from 'three';
import { ll2v } from '../../utils/math';
import { liveData } from '../../state/live-data';

type EventType = 'fire' | 'volcano' | 'storm' | 'ice' | 'other';

interface EventStyle {
    color: number;         // core marker color
    glow: number;          // outer halo color
    baseSize: number;      // sphere radius
    pulseHz: number;       // pulse speed (rad/s)
}

// EONET categories → visual style
// Reference: https://eonet.gsfc.nasa.gov/api/v3/categories
const STYLES: Record<EventType, EventStyle> = {
    fire:    { color: 0xff5020, glow: 0xffa040, baseSize: 0.045, pulseHz: 3.2 },
    volcano: { color: 0xff3088, glow: 0xc020a0, baseSize: 0.055, pulseHz: 1.1 },
    storm:   { color: 0xffc040, glow: 0xffe088, baseSize: 0.050, pulseHz: 2.4 },
    ice:     { color: 0xa0d0ff, glow: 0x60a0ff, baseSize: 0.040, pulseHz: 0.8 },
    other:   { color: 0xe0e0e0, glow: 0xa0a0a0, baseSize: 0.035, pulseHz: 1.5 },
};

function classify(category: string): EventType {
    const c = category.toLowerCase();
    if (c.includes('wildfire') || c.includes('fire')) return 'fire';
    if (c.includes('volcano')) return 'volcano';
    if (c.includes('storm') || c.includes('cyclone') || c.includes('hurricane') || c.includes('typhoon')) return 'storm';
    if (c.includes('ice') || c.includes('snow')) return 'ice';
    return 'other';
}

export interface NaturalEventMarkersContext {
    group: THREE.Group;
    rebuild: () => void;
    update: (time: number) => void;
}

export function createNaturalEventMarkers(globeGroup: THREE.Group): NaturalEventMarkersContext {
    const group = new THREE.Group();
    group.name = 'naturalEventMarkers';
    globeGroup.add(group);

    // Shared radial-gradient texture for soft glows (cheaper than one per marker)
    const glowTex = (() => {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const c2 = canvas.getContext('2d')!;
        const g = c2.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0,    'rgba(255,255,255,1.0)');
        g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
        g.addColorStop(0.75, 'rgba(255,255,255,0.12)');
        g.addColorStop(1,    'rgba(255,255,255,0.00)');
        c2.fillStyle = g;
        c2.fillRect(0, 0, size, size);
        const t = new THREE.CanvasTexture(canvas);
        t.needsUpdate = true;
        return t;
    })();

    interface MarkerEntry {
        core: THREE.Mesh;
        halo: THREE.Sprite;
        style: EventStyle;
        phase: number;
    }
    const entries: MarkerEntry[] = [];

    function clear(): void {
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) child.material.dispose();
            } else if (child instanceof THREE.Sprite) {
                if (child.material instanceof THREE.Material) child.material.dispose();
            }
        }
        entries.length = 0;
    }

    function rebuild(): void {
        clear();
        // Skip earthquakes — pulse-rings handles them. Cap at 80 markers for perf.
        const events = liveData.naturalEvents
            .filter(e => !e.category.toLowerCase().includes('earthquake'))
            .slice(0, 80);

        for (const e of events) {
            if (!Number.isFinite(e.lat) || !Number.isFinite(e.lon)) continue;
            const type = classify(e.category);
            const style = STYLES[type];
            const pos = ll2v(e.lat, e.lon, 5.055);

            // Core bright dot
            const core = new THREE.Mesh(
                new THREE.SphereGeometry(style.baseSize, 10, 10),
                new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: 0.95 }),
            );
            core.position.copy(pos);
            group.add(core);

            // Soft outer glow — sprite always faces camera
            const halo = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTex,
                color: style.glow,
                transparent: true,
                opacity: 0.55,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }));
            halo.position.copy(pos);
            halo.scale.setScalar(0.22 + style.baseSize * 3.2);
            group.add(halo);

            entries.push({ core, halo, style, phase: Math.random() * Math.PI * 2 });
        }
    }

    function update(time: number): void {
        for (const entry of entries) {
            const { core, halo, style, phase } = entry;
            // Breathing pulse — radius + opacity scale with pulseHz
            const beat = 0.5 + 0.5 * Math.sin(time * style.pulseHz + phase);
            const scale = 0.85 + beat * 0.30;
            core.scale.setScalar(scale);
            halo.scale.setScalar((0.22 + style.baseSize * 3.2) * (1.0 + beat * 0.45));
            (core.material as THREE.MeshBasicMaterial).opacity = 0.80 + beat * 0.20;
            (halo.material as THREE.SpriteMaterial).opacity = 0.35 + beat * 0.30;
        }
    }

    // Initial (empty) — caller triggers rebuild() after first fetch
    return { group, rebuild, update };
}
