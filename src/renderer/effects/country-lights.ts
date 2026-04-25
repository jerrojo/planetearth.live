/**
 * Country traffic-lights — 30 colored pulses on the globe, one per
 * Planet-Lens-profiled country. Source: data/countries/_index.json.
 *
 * Visual grammar:
 *   - green  (≥65)  : doing meaningfully well on the 7 Planet-Lens pillars
 *   - yellow (40–64): mixed signal
 *   - red    (<40)  : major structural gaps
 *
 * Each light is a small core sphere + soft halo sprite that pulses. Red
 * pulses a touch faster to read as urgent; green slower to read as steady.
 *
 * Each core stores `userData.iso3` + `userData.light` so the raycaster can
 * identify what was hovered/clicked without extra lookup.
 */
import * as THREE from 'three';
import { ll2v } from '../../utils/math';
import { COUNTRIES, type CountryIndexEntry, type TrafficLight } from '../../data/countries-loader';

const GLOBE_RADIUS = 5;
const LIGHT_ALT = 0.035;   // slightly higher than country-markers so they layer above
const CORE_SIZE = 0.05;
const HALO_SIZE = 0.18;

const COLORS: Record<TrafficLight, { core: number; halo: number; pulseHz: number }> = {
    green:  { core: 0x5ae89f, halo: 0x7affae, pulseHz: 0.9 },
    yellow: { core: 0xffc94d, halo: 0xffd87a, pulseHz: 1.3 },
    red:    { core: 0xff6577, halo: 0xff8080, pulseHz: 1.9 },
};

export interface CountryLightsContext {
    group: THREE.Group;
    update: (t: number) => void;
    /** Meshes exposed so app.ts can feed them to the raycaster for hover/click. */
    pickTargets: THREE.Mesh[];
}

function makeGlowTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0,    'rgba(255,255,255,1.0)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.1)');
    g.addColorStop(1,    'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

export function createCountryLights(globeGroup: THREE.Group): CountryLightsContext {
    const group = new THREE.Group();
    group.name = 'countryLights';
    globeGroup.add(group);

    const glowTex = makeGlowTexture();
    const pickTargets: THREE.Mesh[] = [];

    interface Entry {
        core: THREE.Mesh;
        halo: THREE.Sprite;
        phase: number;
        pulseHz: number;
    }
    const entries: Entry[] = [];

    for (const c of COUNTRIES as readonly CountryIndexEntry[]) {
        const pos = ll2v(c.lat, c.lon, GLOBE_RADIUS + LIGHT_ALT);
        const colors = COLORS[c.traffic_light];

        // Core sphere — raycaster target
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(CORE_SIZE, 12, 12),
            new THREE.MeshBasicMaterial({
                color: colors.core,
                transparent: true,
                opacity: 0.95,
                depthWrite: false,
            }),
        );
        core.position.copy(pos);
        core.userData['iso3'] = c.iso_a3;
        core.userData['light'] = c.traffic_light;
        core.userData['score'] = c.score;
        core.userData['nameEn'] = c.name_en;
        core.userData['nameEs'] = c.name_es;
        group.add(core);
        pickTargets.push(core);

        // Halo sprite
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

        entries.push({
            core,
            halo,
            phase: Math.random() * Math.PI * 2,
            pulseHz: colors.pulseHz,
        });
    }

    function update(t: number): void {
        for (const e of entries) {
            const pulse = 0.5 + 0.5 * Math.sin(t * e.pulseHz + e.phase);
            e.halo.scale.setScalar(HALO_SIZE * (1 + pulse * 0.6));
            (e.halo.material as THREE.SpriteMaterial).opacity = 0.35 + pulse * 0.35;
            (e.core.material as THREE.MeshBasicMaterial).opacity = 0.75 + pulse * 0.25;
        }
    }

    return { group, update, pickTargets };
}
