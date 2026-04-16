import * as THREE from 'three';

export interface SunGlowContext {
    update: (sunDir: THREE.Vector3) => void;
}

export function createSunGlow(scene: THREE.Scene): SunGlowContext {
    // Pixar golden sun — warm, large, dreamy glow with soft color gradient
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,248,220,0.6)');
    grad.addColorStop(0.08, 'rgba(255,235,180,0.35)');
    grad.addColorStop(0.2, 'rgba(255,210,140,0.12)');
    grad.addColorStop(0.45, 'rgba(255,180,100,0.04)');
    grad.addColorStop(0.7, 'rgba(255,160,80,0.01)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        blending: THREE.AdditiveBlending,
        transparent: true,
    }));
    sprite.scale.set(14, 14, 1);
    scene.add(sprite);

    // Secondary softer outer glow for depth
    const canvas2 = document.createElement('canvas');
    canvas2.width = canvas2.height = 128;
    const ctx2 = canvas2.getContext('2d')!;
    const grad2 = ctx2.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad2.addColorStop(0, 'rgba(255,220,160,0.08)');
    grad2.addColorStop(0.4, 'rgba(255,180,120,0.02)');
    grad2.addColorStop(1, 'transparent');
    ctx2.fillStyle = grad2;
    ctx2.fillRect(0, 0, 128, 128);

    const outerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas2),
        blending: THREE.AdditiveBlending,
        transparent: true,
    }));
    outerGlow.scale.set(22, 22, 1);
    scene.add(outerGlow);

    // Place at real solar position (distance 60 units along sun direction)
    const SUN_DISTANCE = 60;

    function update(sunDir: THREE.Vector3): void {
        const pos = sunDir.clone().multiplyScalar(SUN_DISTANCE);
        sprite.position.copy(pos);
        outerGlow.position.copy(pos);
    }

    return { update };
}
