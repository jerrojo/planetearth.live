/**
 * Station Markers — renders REAL measurement stations on the globe.
 *
 * Each station is a point at the exact lat/lon of a real sensor.
 * Different shapes/colors for different measurement types.
 * Pulsing glow = live data; static = cached/historical.
 *
 * Uses InstancedMesh for performance (can handle 5000+ stations).
 *
 * Visual hierarchy (camera distance ~12-25 units):
 *  - GHG stations: large diamonds (0.08) — critical, few, must always be visible
 *  - Ocean buoys:  medium hexagons (0.055) — sparse ocean network
 *  - Tide gauges:  medium triangles (0.05) — coastal ring
 *  - Solar:        medium diamonds (0.055) — yellow, few
 *  - Weather:      small circles (0.035) — dense land network
 *  - Argo floats:  tiny dots (0.03) — thousands in ocean
 */
import * as THREE from 'three';
import { ll2v } from '../../utils/math';
import {
    getAllStations,
    STATION_STYLES,
    type MeasurementStation,
    type StationType,
} from '../../data/measurement-stations';

export interface StationMarkersContext {
    group: THREE.Group;
    update: (t: number) => void;
    rebuild: () => void;
}

// Small geometries for each shape type (reused via instancing)
function createShapeGeometry(shape: string): THREE.BufferGeometry {
    switch (shape) {
        case 'diamond':
            return new THREE.OctahedronGeometry(1, 0); // 8-face diamond
        case 'square':
            return new THREE.BoxGeometry(1.4, 1.4, 0.4);
        case 'triangle':
            return new THREE.ConeGeometry(0.8, 1.6, 3);
        case 'hexagon':
            return new THREE.CylinderGeometry(1, 1, 0.4, 6);
        case 'ring':
            return new THREE.TorusGeometry(0.8, 0.25, 8, 16);
        case 'dot':
        case 'circle':
        default:
            return new THREE.SphereGeometry(1, 8, 8);
    }
}

// Size multiplier per station type — ensure visual hierarchy
const SIZE_BOOST: Partial<Record<StationType, number>> = {
    ghg: 1.4,     // critical, always visible
    solar: 1.3,   // few stations, should stand out
    buoy: 1.25,   // ocean network
    tide: 1.1,    // coastal ring
    seismic: 1.1,
    airq: 1.0,
    weather: 1.0,
    argo: 0.9,    // dense, keep small
};

/**
 * Create station marker layer.
 * Call rebuild() after stations are loaded (async).
 */
export function createStationMarkers(globeGroup: THREE.Group): StationMarkersContext {
    const group = new THREE.Group();
    globeGroup.add(group);

    // Track per-type instanced meshes for animation
    const instancedMeshes: { mesh: THREE.InstancedMesh; type: StationType; count: number }[] = [];

    function rebuild(): void {
        // Clear previous markers
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);
            if (child instanceof THREE.InstancedMesh) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            }
        }
        instancedMeshes.length = 0;

        const allStations = getAllStations();
        if (allStations.length === 0) return;

        // Group stations by type
        const byType = new Map<StationType, MeasurementStation[]>();
        for (const s of allStations) {
            if (!byType.has(s.type)) byType.set(s.type, []);
            byType.get(s.type)!.push(s);
        }

        const dummy = new THREE.Object3D();

        for (const style of STATION_STYLES) {
            const stations = byType.get(style.type);
            if (!stations || stations.length === 0) continue;

            const geo = createShapeGeometry(style.shape);
            const sizeBoost = SIZE_BOOST[style.type] ?? 1.0;
            const finalSize = style.baseSize * sizeBoost;

            // Use a brighter, higher-contrast material so markers pop on both day & night
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(
                    Math.min(style.baseColor[0] * 1.3, 1),
                    Math.min(style.baseColor[1] * 1.3, 1),
                    Math.min(style.baseColor[2] * 1.3, 1),
                ),
                transparent: true,
                opacity: 0.95,
                depthWrite: false,
            });

            const mesh = new THREE.InstancedMesh(geo, mat, stations.length);
            mesh.frustumCulled = false;
            // Render on top of terrain/ocean (avoid z-fighting)
            mesh.renderOrder = 10;

            for (let i = 0; i < stations.length; i++) {
                const s = stations[i];
                const pos = ll2v(s.lat, s.lon, 5.05); // slightly above surface

                dummy.position.copy(pos);
                dummy.lookAt(pos.clone().multiplyScalar(2)); // face outward
                dummy.scale.setScalar(finalSize);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }

            mesh.instanceMatrix.needsUpdate = true;
            group.add(mesh);
            instancedMeshes.push({ mesh, type: style.type, count: stations.length });

            // Glow sprite layer — for ALL station types now (not just <100)
            // But scale the glow intensity/size by network density
            const maxGlowStations = 500; // don't add sprites for huge networks
            if (stations.length <= maxGlowStations) {
                const glowCanvas = document.createElement('canvas');
                glowCanvas.width = glowCanvas.height = 64;
                const ctx = glowCanvas.getContext('2d')!;
                const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
                const gc = style.glowColor;
                grad.addColorStop(0, `rgba(${gc[0]*255|0},${gc[1]*255|0},${gc[2]*255|0},0.8)`);
                grad.addColorStop(0.3, `rgba(${gc[0]*255|0},${gc[1]*255|0},${gc[2]*255|0},0.3)`);
                grad.addColorStop(0.6, `rgba(${gc[0]*255|0},${gc[1]*255|0},${gc[2]*255|0},0.08)`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 64, 64);

                const glowTex = new THREE.CanvasTexture(glowCanvas);
                // Shared material for all glow sprites of this type
                const glowMat = new THREE.SpriteMaterial({
                    map: glowTex,
                    transparent: true,
                    opacity: stations.length < 50 ? 0.65 : 0.35, // brighter for sparse networks
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });

                for (const s of stations) {
                    const pos = ll2v(s.lat, s.lon, 5.06);
                    const sprite = new THREE.Sprite(glowMat);
                    sprite.position.copy(pos);
                    sprite.scale.setScalar(finalSize * (stations.length < 50 ? 6 : 4));
                    sprite.renderOrder = 9;
                    group.add(sprite);
                }
            }
        }
    }

    function update(t: number): void {
        // Gentle breathing pulse for station markers
        for (const { mesh, type } of instancedMeshes) {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            // Different pulse rates per type for visual variety
            const rate = type === 'ghg' ? 0.5 : type === 'buoy' ? 0.7 : type === 'argo' ? 0.9 : 0.6;
            // Higher base opacity — stations should always be clearly visible
            mat.opacity = 0.85 + 0.10 * Math.sin(t * rate);
        }
    }

    return { group, update, rebuild };
}
