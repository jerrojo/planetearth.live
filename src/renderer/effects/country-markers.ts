/**
 * Country accountability markers — green/red pulses on the globe for countries
 * with a notable positive or negative recent environmental action.
 *
 * Editorial, not algorithmic. Curated in `src/data/country-actions.ts`.
 * Toggleable via Settings → Layers → Countries.
 *
 * Visual grammar:
 *   - Green pulse: a country doing something meaningfully good.
 *   - Red pulse: a country with a clear negative action.
 * Each marker has a small core sphere plus a soft halo sprite that pulses to
 * distinguish it from station markers (which use shape-based encoding).
 */
import * as THREE from 'three';
import { ll2v } from '../../utils/math';
import { COUNTRY_ACTIONS, type CountryAction } from '../../data/country-actions';

const GLOBE_RADIUS = 5;
const MARKER_ALT = 0.03;                   // lift slightly above surface
const CORE_SIZE = 0.045;                   // base sphere radius
const HALO_SIZE = 0.16;                    // halo sprite size

const COLORS: Record<CountryAction['sentiment'], { core: number; halo: number }> = {
    positive: { core: 0x5ae89f, halo: 0x7affae },
    negative: { core: 0xff6577, halo: 0xff8080 },
};

export interface CountryMarkersContext {
    group: THREE.Group;
    update: (t: number) => void;
}

function makeGlowTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const c2 = canvas.getContext('2d')!;
    const g = c2.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0,    'rgba(255,255,255,1.0)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.1)');
    g.addColorStop(1,    'rgba(255,255,255,0.0)');
    c2.fillStyle = g;
    c2.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

export function createCountryMarkers(globeGroup: THREE.Group): CountryMarkersContext {
    const group = new THREE.Group();
    group.name = 'countryMarkers';
    globeGroup.add(group);

    const glowTex = makeGlowTexture();

    interface Entry {
        core: THREE.Mesh;
        halo: THREE.Sprite;
        phase: number;
        sentiment: CountryAction['sentiment'];
    }
    const entries: Entry[] = [];

    for (const c of COUNTRY_ACTIONS) {
        const pos = ll2v(c.lat, c.lon, GLOBE_RADIUS + MARKER_ALT);
        const colors = COLORS[c.sentiment];

        // Core sphere
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(CORE_SIZE, 10, 10),
            new THREE.MeshBasicMaterial({
                color: colors.core,
                transparent: true,
                opacity: 0.95,
                depthWrite: false,
            }),
        );
        core.position.copy(pos);
        core.userData['country'] = c;
        group.add(core);

        // Halo sprite — pulses via update()
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex,
            color: colors.halo,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }));
        halo.position.copy(pos);
        halo.scale.setScalar(HALO_SIZE);
        group.add(halo);

        entries.push({ core, halo, phase: Math.random() * Math.PI * 2, sentiment: c.sentiment });
    }

    function update(t: number): void {
        // Negative markers pulse a touch faster to read as "urgent".
        for (const e of entries) {
            const hz = e.sentiment === 'negative' ? 2.0 : 1.2;
            const pulse = 0.5 + 0.5 * Math.sin(t * hz + e.phase);
            e.halo.scale.setScalar(HALO_SIZE * (1 + pulse * 0.6));
            (e.halo.material as THREE.SpriteMaterial).opacity = 0.35 + pulse * 0.35;
            (e.core.material as THREE.MeshBasicMaterial).opacity = 0.75 + pulse * 0.25;
        }
    }

    return { group, update };
}
