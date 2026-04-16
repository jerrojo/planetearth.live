import * as THREE from 'three';

export interface SceneContext {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    sunLight: THREE.DirectionalLight;
}

function showContextLostOverlay(show: boolean): void {
    const id = 'planetearth-context-lost';
    let overlay = document.getElementById(id);

    if (show && !overlay) {
        overlay = document.createElement('div');
        overlay.id = id;
        overlay.setAttribute('role', 'alert');
        overlay.style.cssText = `
            position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
            background:rgba(15,14,42,0.9);color:#f0ece4;font-family:'Nunito',system-ui,sans-serif;
            z-index:2000;text-align:center;
        `;
        overlay.innerHTML = '<p style="opacity:0.8;">Reconectando gráficos…</p>';
        document.body.appendChild(overlay);
    } else if (!show && overlay) {
        overlay.remove();
    }
}

export function createSceneContext(canvas: HTMLCanvasElement): SceneContext {
    const W = window.innerWidth;
    const H = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
    camera.position.set(0, 1.5, 22);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // sRGB handled in Pixar shader

    // WebGL context loss recovery
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        showContextLostOverlay(true);
    });
    canvas.addEventListener('webglcontextrestored', () => {
        showContextLostOverlay(false);
    });

    // Pixar Lighting Setup — warm key, cool fill, golden rim
    // Ambient: warm indigo with a touch of warmth (not cold blue)
    scene.add(new THREE.AmbientLight(0x2a2440, 1.0));

    // Key light: warm golden sunlight (Pixar's signature warm key)
    const sunLight = new THREE.DirectionalLight(0xffe4b5, 1.3);
    sunLight.position.set(8, 5, 6);
    scene.add(sunLight);

    // Fill light: cool complementary blue (Pixar warm/cool contrast)
    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.4);
    fillLight.position.set(-6, 2, -4);
    scene.add(fillLight);

    // Rim light: soft warm backlight for depth separation
    const rimLight = new THREE.DirectionalLight(0xffcc88, 0.25);
    rimLight.position.set(-5, -2, -5);
    scene.add(rimLight);

    // Subtle bottom bounce light (simulates ground reflection — Pixar trick)
    const bounceLight = new THREE.DirectionalLight(0x443355, 0.15);
    bounceLight.position.set(0, -6, 2);
    scene.add(bounceLight);

    return { scene, camera, renderer, sunLight };
}

export function handleResize(ctx: SceneContext): void {
    ctx.camera.aspect = window.innerWidth / window.innerHeight;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(window.innerWidth, window.innerHeight);
}
