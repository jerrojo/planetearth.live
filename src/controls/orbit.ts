export interface OrbitState {
    isDragging: boolean;
    wasDragged: boolean;
    prevX: number;
    prevY: number;
    rotY: number;
    rotX: number;
    autoRotation: number;
    zoomTarget: number;
    velocityY: number;
    velocityX: number;
    pinchDist: number;
}

export function createOrbitState(): OrbitState {
    return {
        isDragging: false,
        wasDragged: false,
        prevX: 0,
        prevY: 0,
        rotY: 0,
        rotX: 0.25,
        autoRotation: 0,
        zoomTarget: 22,
        velocityY: 0,
        velocityX: 0,
        pinchDist: 0,
    };
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
        state.rotY += state.velocityY;
        state.rotX += state.velocityX;
        state.rotX = Math.max(-1.2, Math.min(1.2, state.rotX));

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

    // --- Scroll wheel zoom with smooth easing ---
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
            state.rotY += state.velocityY;
            state.rotX += state.velocityX;
            state.rotX = Math.max(-1.2, Math.min(1.2, state.rotX));

            state.prevX = e.touches[0].clientX;
            state.prevY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Pinch-to-zoom
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
