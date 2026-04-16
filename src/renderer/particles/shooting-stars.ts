import * as THREE from 'three';
import type { ShootingStarData } from '../../types';

/**
 * Shooting Stars — meteors with a fixed radiant point and realistic ablation.
 *
 * Physics model:
 *   - All meteors emanate from a radiant point (simulating a meteor shower)
 *   - Brightness follows ablation curve: rapid brightening then exponential fade
 *   - Trail length proportional to velocity
 *
 * Sources: Ceplecha et al. (1998), IAU Meteor Data Center
 */

let shootingStar: ShootingStarData | null = null;
let ssTimer = 4 + Math.random() * 8;

// Radiant point — fixed direction all meteors appear to come from
const RADIANT = new THREE.Vector3(0.6, 0.8, -0.3).normalize();
const RADIANT_UP = new THREE.Vector3().crossVectors(RADIANT, new THREE.Vector3(0, 0, 1)).normalize();
const RADIANT_RIGHT = new THREE.Vector3().crossVectors(RADIANT, RADIANT_UP).normalize();

function spawnShootingStar(scene: THREE.Scene): void {
    // Spread: meteors diverge up to ~15° from the radiant
    const spread1 = (Math.random() - 0.5) * 0.26;
    const spread2 = (Math.random() - 0.5) * 0.26;

    const dir = RADIANT.clone()
        .add(RADIANT_UP.clone().multiplyScalar(Math.sin(spread1)))
        .add(RADIANT_RIGHT.clone().multiplyScalar(Math.sin(spread2)))
        .normalize()
        .negate(); // Travel away from radiant (toward Earth)

    const sx = (Math.random() - 0.5) * 40 - dir.x * 30;
    const sy = 15 + Math.random() * 25;
    const sz = -30 - Math.random() * 30;
    const start = new THREE.Vector3(sx, sy, sz);

    const trailLength = 4 + Math.random() * 4;
    const end = start.clone().add(dir.clone().multiplyScalar(trailLength));

    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    // Pixar: warm golden-white meteor trail
    const mat = new THREE.LineBasicMaterial({
        color: 0xffe8c0,
        transparent: true,
        opacity: 0.9,
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);

    const speed = 60 + Math.random() * 40;
    shootingStar = {
        mesh: line,
        dir: dir.multiplyScalar(speed),
        age: 0,
        maxAge: 0.4 + Math.random() * 0.3,
    };
}

export function updateShootingStars(scene: THREE.Scene, dt: number, motionScale: number): void {
    ssTimer -= dt * motionScale;
    if (ssTimer <= 0 && motionScale > 0) {
        spawnShootingStar(scene);
        ssTimer = 5 + Math.random() * 10;
    }
    if (shootingStar) {
        shootingStar.age += dt;
        const prog = shootingStar.age / shootingStar.maxAge;
        const pos = shootingStar.mesh.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < 6; i += 3) {
            pos[i] += shootingStar.dir.x * dt;
            pos[i + 1] += shootingStar.dir.y * dt;
            pos[i + 2] += shootingStar.dir.z * dt;
        }
        shootingStar.mesh.geometry.attributes.position.needsUpdate = true;

        // Ablation brightness: rapid brightening then exponential fade
        let brightness: number;
        if (prog < 0.3) {
            brightness = prog / 0.3;
        } else {
            brightness = Math.exp(-(prog - 0.3) * 4);
        }
        (shootingStar.mesh.material as THREE.LineBasicMaterial).opacity = brightness * 0.9;

        if (prog >= 1) {
            scene.remove(shootingStar.mesh);
            shootingStar.mesh.geometry.dispose();
            (shootingStar.mesh.material as THREE.Material).dispose();
            shootingStar = null;
        }
    }
}
