import * as THREE from 'three';
import { categories, connections } from '../../data/categories';

/**
 * Network Visualization — animated arcs between interconnected categories
 * visible when a category is selected. Shows the systemic nature of change.
 */

export interface ConnectionsContext {
    group: THREE.Group;
    lines: THREE.Line[];
    materials: THREE.ShaderMaterial[];
    activeCategory: number;
}

// Position categories in a circle around the globe
function getCategoryPosition(idx: number, total: number, radius: number): THREE.Vector3 {
    const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
    const y = Math.sin(angle) * radius * 0.6;
    const x = Math.cos(angle) * radius;
    const z = 0;
    return new THREE.Vector3(x, y, z);
}

// Create a curved arc between two points
function createArc(start: THREE.Vector3, end: THREE.Vector3, segments: number = 32): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const mid = start.clone().add(end).multiplyScalar(0.5);

    // Arc height based on distance
    const dist = start.distanceTo(end);
    mid.z += dist * 0.3;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const t2 = t * t;
        const mt = 1 - t;
        const mt2 = mt * mt;

        // Quadratic bezier
        const p = new THREE.Vector3(
            mt2 * start.x + 2 * mt * t * mid.x + t2 * end.x,
            mt2 * start.y + 2 * mt * t * mid.y + t2 * end.y,
            mt2 * start.z + 2 * mt * t * mid.z + t2 * end.z
        );
        points.push(p);
    }
    return points;
}

export function createConnections(scene: THREE.Scene): ConnectionsContext {
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    const lines: THREE.Line[] = [];
    const materials: THREE.ShaderMaterial[] = [];
    const total = categories.length;

    for (const [fromIdx, toIdx] of connections) {
        const from = getCategoryPosition(fromIdx, total, 7);
        const to = getCategoryPosition(toIdx, total, 7);
        const arcPoints = createArc(from, to);

        const geo = new THREE.BufferGeometry().setFromPoints(arcPoints);

        // Progress attribute for animated flow
        const progress = new Float32Array(arcPoints.length);
        for (let i = 0; i < arcPoints.length; i++) {
            progress[i] = i / (arcPoints.length - 1);
        }
        geo.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

        const fromColor = new THREE.Color(categories[fromIdx].color);
        const toColor = new THREE.Color(categories[toIdx].color);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColorFrom: { value: fromColor },
                uColorTo: { value: toColor },
                uOpacity: { value: 0 },
                uActive: { value: 0 },
            },
            vertexShader: /* glsl */ `
                attribute float aProgress;
                uniform float uTime;
                uniform float uActive;
                varying float vProgress;
                varying float vAlpha;

                void main() {
                    vProgress = aProgress;

                    // Flowing energy pulse
                    float pulse = fract(aProgress - uTime * 0.5);
                    float energy = smoothstep(0.0, 0.1, pulse) * smoothstep(0.4, 0.1, pulse);
                    vAlpha = mix(0.15, 0.8, energy) * uActive;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 uColorFrom;
                uniform vec3 uColorTo;
                uniform float uOpacity;
                varying float vProgress;
                varying float vAlpha;

                void main() {
                    vec3 color = mix(uColorFrom, uColorTo, vProgress);
                    gl_FragColor = vec4(color, vAlpha * uOpacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const line = new THREE.Line(geo, material);
        group.add(line);
        lines.push(line);
        materials.push(material);
    }

    return { group, lines, materials, activeCategory: -1 };
}

export function updateConnections(ctx: ConnectionsContext, time: number): void {
    for (const mat of ctx.materials) {
        mat.uniforms.uTime.value = time;
    }
}

export function showConnections(ctx: ConnectionsContext, categoryIdx: number): void {
    ctx.activeCategory = categoryIdx;
    ctx.group.visible = true;

    // Highlight connections involving this category
    connections.forEach(([from, to], i) => {
        const isConnected = from === categoryIdx || to === categoryIdx;
        const mat = ctx.materials[i];

        // Animate in
        const targetOpacity = isConnected ? 1.0 : 0.15;
        const targetActive = isConnected ? 1.0 : 0.3;

        // Smooth transition
        const animate = () => {
            const current = mat.uniforms.uOpacity.value;
            const diff = targetOpacity - current;
            if (Math.abs(diff) > 0.01) {
                mat.uniforms.uOpacity.value += diff * 0.08;
                mat.uniforms.uActive.value += (targetActive - mat.uniforms.uActive.value) * 0.08;
                requestAnimationFrame(animate);
            } else {
                mat.uniforms.uOpacity.value = targetOpacity;
                mat.uniforms.uActive.value = targetActive;
            }
        };
        animate();
    });
}

export function hideConnections(ctx: ConnectionsContext): void {
    ctx.activeCategory = -1;

    // Fade out all connections
    ctx.materials.forEach(mat => {
        const animate = () => {
            const current = mat.uniforms.uOpacity.value;
            if (current > 0.01) {
                mat.uniforms.uOpacity.value *= 0.92;
                mat.uniforms.uActive.value *= 0.92;
                requestAnimationFrame(animate);
            } else {
                mat.uniforms.uOpacity.value = 0;
                mat.uniforms.uActive.value = 0;
                ctx.group.visible = false;
            }
        };
        animate();
    });
}
