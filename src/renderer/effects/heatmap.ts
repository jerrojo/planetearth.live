import * as THREE from 'three';
import { ll2v } from '../../utils/math';

/**
 * Heat Map Overlay — visualizes category-specific impact density on the globe.
 * Each category has different hotspot regions that glow with category color.
 */

export interface HeatmapContext {
    group: THREE.Group;
    material: THREE.ShaderMaterial;
    isVisible: boolean;
}

interface HotspotRegion {
    lat: number;
    lon: number;
    radius: number;
    intensity: number;
}

// Category-specific hotspot maps (simplified global impact zones)
const CATEGORY_HOTSPOTS: Record<number, HotspotRegion[]> = {
    0: [ // Climate & Energy — fossil fuel regions + renewable potential
        { lat: 30, lon: -95, radius: 15, intensity: 0.9 },   // US Gulf
        { lat: 25, lon: 50, radius: 12, intensity: 1.0 },    // Middle East
        { lat: 55, lon: 75, radius: 18, intensity: 0.8 },    // Russia
        { lat: 35, lon: 115, radius: 14, intensity: 0.85 },  // China
        { lat: 20, lon: 78, radius: 10, intensity: 0.7 },    // India
        { lat: 52, lon: 10, radius: 10, intensity: 0.6 },    // Europe
    ],
    1: [ // Biodiversity — tropical regions + coral reefs
        { lat: -3, lon: -60, radius: 20, intensity: 1.0 },   // Amazon
        { lat: 0, lon: 25, radius: 15, intensity: 0.9 },     // Congo
        { lat: -5, lon: 110, radius: 14, intensity: 0.85 },  // Indonesia
        { lat: -15, lon: 48, radius: 8, intensity: 0.7 },    // Madagascar
        { lat: -18, lon: 148, radius: 10, intensity: 0.8 },  // Coral Reef
    ],
    2: [ // Water & Oceans — freshwater stress zones
        { lat: 25, lon: 45, radius: 15, intensity: 0.9 },    // Middle East
        { lat: 15, lon: 0, radius: 18, intensity: 0.85 },    // Sahel
        { lat: 25, lon: 78, radius: 14, intensity: 0.8 },    // India
        { lat: -30, lon: 25, radius: 10, intensity: 0.7 },   // S. Africa
        { lat: 35, lon: -115, radius: 10, intensity: 0.75 }, // US West
    ],
    3: [ // Animals — factory farming concentration
        { lat: 40, lon: -95, radius: 15, intensity: 0.9 },   // US Midwest
        { lat: 35, lon: 115, radius: 14, intensity: 0.85 },  // China
        { lat: -20, lon: -50, radius: 12, intensity: 0.8 },  // Brazil
        { lat: 52, lon: 10, radius: 10, intensity: 0.7 },    // Europe
        { lat: 20, lon: 78, radius: 10, intensity: 0.65 },   // India
    ],
    4: [ // Food — agricultural breadbaskets
        { lat: 42, lon: -95, radius: 14, intensity: 0.9 },   // US Midwest
        { lat: 50, lon: 40, radius: 16, intensity: 0.85 },   // Ukraine/Russia
        { lat: -20, lon: -50, radius: 15, intensity: 0.8 },  // Brazil
        { lat: 30, lon: 78, radius: 12, intensity: 0.75 },   // India
        { lat: 35, lon: 115, radius: 12, intensity: 0.7 },   // China
    ],
    5: [ // Space — launch sites and observation points
        { lat: 28, lon: -80, radius: 5, intensity: 1.0 },    // Cape Canaveral
        { lat: 46, lon: 63, radius: 5, intensity: 0.9 },     // Baikonur
        { lat: 5, lon: -52, radius: 4, intensity: 0.85 },    // Kourou
        { lat: 31, lon: -104, radius: 4, intensity: 0.7 },   // White Sands
        { lat: 19, lon: -155, radius: 4, intensity: 0.8 },   // Hawaii Observatory
    ],
    6: [ // Health — disease burden hotspots
        { lat: 5, lon: 20, radius: 18, intensity: 0.9 },     // Sub-Saharan Africa
        { lat: 25, lon: 80, radius: 14, intensity: 0.8 },    // South Asia
        { lat: 5, lon: 110, radius: 12, intensity: 0.7 },    // SE Asia
        { lat: -5, lon: -55, radius: 12, intensity: 0.65 },  // Brazil
    ],
    7: [ // Tech & AI — innovation hubs
        { lat: 37, lon: -122, radius: 6, intensity: 1.0 },   // Silicon Valley
        { lat: 40, lon: 116, radius: 8, intensity: 0.95 },   // Beijing
        { lat: 51, lon: 0, radius: 6, intensity: 0.85 },     // London
        { lat: 13, lon: 77, radius: 5, intensity: 0.8 },     // Bangalore
        { lat: 35, lon: 137, radius: 5, intensity: 0.75 },   // Japan
        { lat: 37, lon: 127, radius: 5, intensity: 0.7 },    // Seoul
    ],
    8: [ // Economy — financial centers
        { lat: 40, lon: -74, radius: 6, intensity: 1.0 },    // NYC
        { lat: 51, lon: 0, radius: 6, intensity: 0.9 },      // London
        { lat: 35, lon: 139, radius: 5, intensity: 0.85 },   // Tokyo
        { lat: 22, lon: 114, radius: 5, intensity: 0.8 },    // Hong Kong
        { lat: 1, lon: 103, radius: 5, intensity: 0.75 },    // Singapore
    ],
    9: [ // Education — literacy gap regions
        { lat: 5, lon: 20, radius: 18, intensity: 0.9 },     // Sub-Saharan Africa
        { lat: 25, lon: 80, radius: 14, intensity: 0.8 },    // South Asia
        { lat: 15, lon: 105, radius: 10, intensity: 0.65 },  // SE Asia
    ],
    10: [ // Governance — democratic index zones
        { lat: 55, lon: 10, radius: 15, intensity: 0.3 },    // Nordic (strong)
        { lat: 35, lon: -100, radius: 18, intensity: 0.4 },  // N. America
        { lat: 55, lon: 50, radius: 16, intensity: 0.9 },    // Russia
        { lat: 35, lon: 45, radius: 12, intensity: 0.85 },   // Middle East
        { lat: 5, lon: 20, radius: 16, intensity: 0.8 },     // Africa
        { lat: 35, lon: 115, radius: 12, intensity: 0.7 },   // China
    ],
    11: [ // Consciousness — meditation/mindfulness spread
        { lat: 28, lon: 84, radius: 10, intensity: 0.9 },    // Nepal/Tibet
        { lat: 20, lon: 78, radius: 12, intensity: 0.8 },    // India
        { lat: 35, lon: 139, radius: 6, intensity: 0.7 },    // Japan
        { lat: -12, lon: -77, radius: 5, intensity: 0.6 },   // Peru
    ],
};

export function createHeatmap(globeGroup: THREE.Group): HeatmapContext {
    const group = new THREE.Group();
    group.visible = false;
    globeGroup.add(group);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#ffffff') },
            uOpacity: { value: 0 },
        },
        vertexShader: /* glsl */ `
            attribute float aIntensity;
            uniform float uTime;
            varying float vIntensity;

            void main() {
                vIntensity = aIntensity;
                vec3 pos = position;

                // Subtle breathing on hotspots
                pos *= 1.0 + sin(uTime * 2.0 + aIntensity * 5.0) * 0.003;

                vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = (6.0 + aIntensity * 8.0) * (100.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uTime;
            varying float vIntensity;

            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                if (d > 1.0) discard;

                float alpha = exp(-d * d * 2.5) * vIntensity * uOpacity;
                float pulse = 0.8 + 0.2 * sin(uTime * 3.0 + vIntensity * 10.0);

                gl_FragColor = vec4(uColor * pulse, alpha * 0.7);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    return { group, material, isVisible: false };
}

export function showHeatmap(ctx: HeatmapContext, categoryIdx: number, color: string): void {
    // Clear previous
    while (ctx.group.children.length > 0) {
        const child = ctx.group.children[0];
        ctx.group.remove(child);
        if (child instanceof THREE.Points) {
            child.geometry.dispose();
        }
    }

    const hotspots = CATEGORY_HOTSPOTS[categoryIdx] || [];
    if (hotspots.length === 0) {
        ctx.isVisible = false;
        ctx.group.visible = false;
        return;
    }

    const positions: number[] = [];
    const intensities: number[] = [];

    for (const spot of hotspots) {
        // Generate points in a circular region
        const pointCount = Math.floor(spot.radius * 8);
        for (let i = 0; i < pointCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * spot.radius;
            const lat = spot.lat + Math.cos(angle) * dist;
            const lon = spot.lon + Math.sin(angle) * dist;

            const v = ll2v(lat, lon, 5.08);
            positions.push(v.x, v.y, v.z);

            // Intensity falls off from center
            const normalizedDist = dist / spot.radius;
            const intensity = spot.intensity * (1 - normalizedDist * normalizedDist);
            intensities.push(Math.max(0.1, intensity));
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aIntensity', new THREE.Float32BufferAttribute(intensities, 1));

    const points = new THREE.Points(geo, ctx.material);
    ctx.group.add(points);

    ctx.material.uniforms.uColor.value.set(color);
    ctx.group.visible = true;
    ctx.isVisible = true;

    // Animate opacity in
    const animateIn = () => {
        const current = ctx.material.uniforms.uOpacity.value;
        if (current < 0.95) {
            ctx.material.uniforms.uOpacity.value += (1 - current) * 0.06;
            requestAnimationFrame(animateIn);
        } else {
            ctx.material.uniforms.uOpacity.value = 1;
        }
    };
    animateIn();
}

export function hideHeatmap(ctx: HeatmapContext): void {
    const animateOut = () => {
        const current = ctx.material.uniforms.uOpacity.value;
        if (current > 0.02) {
            ctx.material.uniforms.uOpacity.value *= 0.9;
            requestAnimationFrame(animateOut);
        } else {
            ctx.material.uniforms.uOpacity.value = 0;
            ctx.group.visible = false;
            ctx.isVisible = false;
        }
    };
    animateOut();
}

export function updateHeatmap(ctx: HeatmapContext, time: number): void {
    if (ctx.isVisible) {
        ctx.material.uniforms.uTime.value = time;
    }
}
