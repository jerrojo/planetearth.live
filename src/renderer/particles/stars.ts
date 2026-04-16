import * as THREE from 'three';
import { STAR_COUNT } from '../../config/constants';

export interface StarsContext {
    material: THREE.ShaderMaterial;
}

export function createStars(scene: THREE.Scene): StarsContext {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
        const r = 60 + Math.random() * 140;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(p) * Math.cos(t);
        positions[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
        positions[i * 3 + 2] = r * Math.cos(p);
        sizes[i] = 0.3 + Math.random() * 2.5;
        phases[i] = Math.random() * 6.28;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float aSize;
            attribute float aPhase;
            uniform float uTime;
            varying float vAlpha;
            varying float vWarmth;
            void main(){
                vAlpha = 0.3 + 0.7 * (0.5 + 0.5 * sin(uTime * 0.8 + aPhase));
                // Slower, dreamier twinkle for Pixar feel
                vWarmth = 0.5 + 0.5 * sin(aPhase * 3.14);  // per-star warm/cool variation
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * (200.0 / -mv.z);
                gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: `
            varying float vAlpha;
            varying float vWarmth;
            void main(){
                float d = length(gl_PointCoord - 0.5) * 2.0;
                if(d > 1.0) discard;
                float a = (1.0 - d * d) * vAlpha;
                // Pixar star colors: mix between warm golden and cool blue-white
                vec3 warmStar = vec3(1.0, 0.92, 0.78);   // warm golden
                vec3 coolStar = vec3(0.82, 0.88, 1.0);    // cool blue-white
                vec3 color = mix(coolStar, warmStar, vWarmth);
                gl_FragColor = vec4(color, a);
            }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    scene.add(new THREE.Points(geo, material));

    return { material };
}
