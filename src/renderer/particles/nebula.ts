import * as THREE from 'three';

function makeNebula(scene: THREE.Scene, x: number, y: number, z: number, size: number, color: string): void {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, color + '18');
    g.addColorStop(0.5, color + '08');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.6,
    }));
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size, 1);
    scene.add(sprite);
}

export function createNebulas(scene: THREE.Scene): void {
    // Pixar warm cosmic palette: amber, warm purple, golden-rose
    makeNebula(scene, -40, 20, -80, 70, '#886644');
    makeNebula(scene, 50, -15, -90, 55, '#774488');
    makeNebula(scene, 20, 30, -100, 80, '#664422');
}
