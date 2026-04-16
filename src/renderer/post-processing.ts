import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface PostProcessingContext {
    composer: EffectComposer;
    bloomPass: UnrealBloomPass;
    vignettePass: ShaderPass;
}

// Pixar-grade color grading + vignette + chromatic aberration + film grain
// Inspired by Pixar's warm-cool color science: lifted shadows, warm highlights,
// subtle teal shadows, golden mid-tones, soft bloom interaction
const VignetteChromaticShader = {
    uniforms: {
        tDiffuse: { value: null },
        uIntensity: { value: 0.30 },
        uSmoothness: { value: 0.50 },
        uChromaticStrength: { value: 0.0015 },
        uTime: { value: 0 },
        uGrainIntensity: { value: 0.03 },
    },
    vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uIntensity;
        uniform float uSmoothness;
        uniform float uChromaticStrength;
        uniform float uTime;
        uniform float uGrainIntensity;
        varying vec2 vUv;

        // Hash-based noise for film grain
        float hash(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
        }

        // Pixar-style S-curve contrast (soft toe + shoulder)
        vec3 pixarTonemap(vec3 c) {
            // Lift shadows — Pixar signature: never fully black
            c = c * 0.97 + 0.008;
            // Soft S-curve with gentle shoulder (ACES Narkowicz)
            c = c * (2.51 * c + 0.03) / (c * (2.43 * c + 0.59) + 0.14);
            return clamp(c, 0.0, 1.0);
        }

        // Linear → sRGB gamma conversion (applied manually since OutputPass uses linear output)
        vec3 linearToSRGB(vec3 c) {
            vec3 lo = c * 12.92;
            vec3 hi = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
            return mix(lo, hi, step(vec3(0.0031308), c));
        }

        void main() {
            vec2 uv = vUv;
            vec2 center = vec2(0.5);
            float dist = distance(uv, center);

            // Chromatic aberration — slightly stronger for dreamy bokeh feel
            vec2 dir = normalize(uv - center) * uChromaticStrength * dist;
            float r = texture2D(tDiffuse, uv + dir).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - dir).b;
            vec3 color = vec3(r, g, b);

            // === PIXAR COLOR GRADING ===

            // 1. Warm tint: push shadows toward teal, highlights toward gold
            float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
            vec3 warmShadow = vec3(0.04, 0.06, 0.10);    // deep teal-blue shadows
            vec3 warmHighlight = vec3(0.98, 0.94, 0.88);  // warm golden highlights
            color = mix(color + warmShadow * (1.0 - luma) * 0.3,
                        color * warmHighlight,
                        smoothstep(0.2, 0.8, luma));

            // 2. Saturation boost in mid-tones (Pixar's vibrant mid-range)
            float midMask = 1.0 - abs(luma - 0.5) * 2.0;
            vec3 gray = vec3(luma);
            color = mix(gray, color, 1.0 + midMask * 0.15);

            // 3. Apply Pixar tonemap (lifted blacks, soft contrast)
            color = pixarTonemap(color);

            // 4. Subtle warmth breathing — very gentle time-based warmth shift
            float warmBreath = sin(uTime * 0.15) * 0.008;
            color.r += warmBreath;
            color.b -= warmBreath * 0.5;

            // Vignette — softer, warmer falloff
            float vignette = smoothstep(0.5, 0.5 - uSmoothness, dist * (1.0 + uIntensity));
            color *= mix(0.70, 1.0, vignette);

            // Film grain — organic texture
            float grain = hash(uv * 1000.0 + fract(uTime * 0.7)) * 2.0 - 1.0;
            color += grain * uGrainIntensity;

            // Final sRGB gamma encoding (OutputPass uses linear colorspace)
            color = linearToSRGB(clamp(color, 0.0, 1.0));

            gl_FragColor = vec4(color, 1.0);
        }
    `,
};

export function createPostProcessing(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
): PostProcessingContext {
    const size = new THREE.Vector2();
    renderer.getSize(size);

    const composer = new EffectComposer(renderer);

    // 1. Render the scene
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 2. Bloom — Pixar-style dreamy glow (stronger, softer radius, lower threshold)
    const isMobile = window.innerWidth < 768;
    const bloomSize = isMobile
        ? new THREE.Vector2(Math.floor(size.x * 0.5), Math.floor(size.y * 0.5))
        : new THREE.Vector2(size.x, size.y);
    const bloomPass = new UnrealBloomPass(
        bloomSize,
        isMobile ? 0.10 : 0.15,   // strength — very subtle, preserve detail
        isMobile ? 0.2 : 0.3,    // radius — tight bloom spread
        isMobile ? 0.85 : 0.82   // threshold — only stars, aurora, city glows bloom (not terrain)
    );
    composer.addPass(bloomPass);

    // 3. Pixar color grading + vignette + chromatic aberration + film grain
    const vignettePass = new ShaderPass(VignetteChromaticShader);
    composer.addPass(vignettePass);

    // 4. Output (tonemapping + colorspace)
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    return { composer, bloomPass, vignettePass };
}

export function resizePostProcessing(
    composer: EffectComposer,
    width: number,
    height: number
): void {
    composer.setSize(width, height);
}
