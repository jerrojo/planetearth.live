import * as THREE from 'three';

// Reusable scratch objects — allocating quaternions per frame causes GC pressure.
const _Y_AXIS = new THREE.Vector3(0, 1, 0);
const _X_AXIS = new THREE.Vector3(1, 0, 0);
const _qY = new THREE.Quaternion();
const _qX = new THREE.Quaternion();

export interface OrbitState {
    isDragging: boolean;
    wasDragged: boolean;
    prevX: number;
    prevY: number;
    /**
     * Free-rotation quaternion. Replaces the old rotX/rotY Euler pair — quaternions
     * have no gimbal lock, so the globe can spin continuously over the poles.
     */
    userQuat: THREE.Quaternion;
    /** Auto-rotation angle around world Y (slow idle spin, applied on top of userQuat). */
    autoRotation: number;
    zoomTarget: number;
    /** Inertia deltas (radians per frame) decayed each frame when not dragging. */
    velocityY: number;
    velocityX: number;
    pinchDist: number;
}

export function createOrbitState(): OrbitState {
    // Slight initial tilt (~0.25 rad) so the northern hemisphere sits forward.
    const initial = new THREE.Quaternion().setFromAxisAngle(_X_AXIS, -0.25);
    return {
        isDragging: false,
        wasDragged: false,
        prevX: 0,
        prevY: 0,
        userQuat: initial,
        autoRotation: 0,
        zoomTarget: 22,
        velocityY: 0,
        velocityX: 0,
        pinchDist: 0,
    };
}

/**
 * Apply a trackball-style rotation delta to the orbit quaternion.
 * dx rotates around world Y (horizontal drag → yaw), dy around world X (vertical drag → pitch).
 * Premultiplying in world space keeps rotation intuitive at every pose — no gimbal lock
 * at the poles, unlike the previous Euler-angle implementation.
 */
export function rotateOrbit(state: OrbitState, dx: number, dy: number): void {
    if (dx !== 0) {
        _qY.setFromAxisAngle(_Y_AXIS, dx);
        state.userQuat.premultiply(_qY);
    }
    if (dy !== 0) {
        _qX.setFromAxisAngle(_X_AXIS, dy);
        state.userQuat.premultiply(_qX);
    }
}

export function initOrbitControls(canvas: HTMLCanvasElement, state: OrbitState): void {
    const SENSITIVITY = 0.004;
    const ZOOM_MIN = 9;
    const ZOOM_MAX = 25;

    // --- Mouse ---
    canvas.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') return; // handled separately
        state.isDragging = true;
        state.wasDragged = false;
        state.prevX = e.clientX;
        state.prevY = e.clientY;
        state.velocityY = 0;
        state.velocityX = 0;
    });

    window.addEventListener('pointermove', e => {
        if (!state.isDragging || e.pointerType === 'touch') return;
        const dx = e.clientX - state.prevX;
        const dy = e.clientY - state.prevY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.wasDragged = true;

        state.velocityY = dx * SENSITIVITY;
        state.velocityX = dy * SENSITIVITY;
        rotateOrbit(state, state.velocityY, state.velocityX);

        state.prevX = e.clientX;
        state.prevY = e.clientY;
    });

    window.addEventListener('pointerup', e => {
        if (e.pointerType === 'touch') return;
        state.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        state.isDragging = false;
    });

    // --- Scroll wheel zoom ---
    canvas.addEventListener('wheel', e => {
        state.zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoomTarget + e.deltaY * 0.008));
    }, { passive: true });

    // --- Touch: single-finger drag + two-finger pinch-to-zoom ---
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            state.isDragging = true;
            state.wasDragged = false;
            state.prevX = e.touches[0].clientX;
            state.prevY = e.touches[0].clientY;
            state.velocityY = 0;
            state.velocityX = 0;
        } else if (e.touches.length === 2) {
            state.isDragging = false;
            state.pinchDist = getPinchDist(e);
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && state.isDragging) {
            const dx = e.touches[0].clientX - state.prevX;
            const dy = e.touches[0].clientY - state.prevY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.wasDragged = true;

            state.velocityY = dx * SENSITIVITY;
            state.velocityX = dy * SENSITIVITY;
            rotateOrbit(state, state.velocityY, state.velocityX);

            state.prevX = e.touches[0].clientX;
            state.prevY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const newDist = getPinchDist(e);
            if (state.pinchDist > 0) {
                const scale = state.pinchDist / newDist;
                state.zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoomTarget * scale));
            }
            state.pinchDist = newDist;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
        if (e.touches.length === 0) {
            state.isDragging = false;
            state.pinchDist = 0;
        } else if (e.touches.length === 1) {
            state.pinchDist = 0;
            state.prevX = e.touches[0].clientX;
            state.prevY = e.touches[0].clientY;
            state.isDragging = true;
        }
    });
}

function getPinchDist(e: TouchEvent): number {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
