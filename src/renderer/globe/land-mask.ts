/**
 * Land Mask — determines land vs ocean for any lat/lon coordinate.
 *
 * Uses NASA specular map (earth-specular.jpg) where white = ocean, black = land.
 * The specular texture gives pixel-accurate real geography (all coastlines, islands, peninsulas).
 * Falls back to hand-drawn polygons only if the image fails to load.
 */
import { MASK_W, MASK_H } from '../../config/constants';

let maskData: Uint8ClampedArray;
let maskReady = false;
let resolveReady: () => void;
const readyPromise = new Promise<void>(r => { resolveReady = r; });

function ll2m(lon: number, lat: number): [number, number] {
    return [(lon + 180) / 360 * MASK_W, (90 - lat) / 180 * MASK_H];
}

function drawPoly(ctx: CanvasRenderingContext2D, pts: number[]): void {
    ctx.beginPath();
    const [x0, y0] = ll2m(pts[0], pts[1]);
    ctx.moveTo(x0, y0);
    for (let i = 2; i < pts.length; i += 2) {
        const [x, y] = ll2m(pts[i], pts[i + 1]);
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

/** Quick polygon fallback — used immediately while texture loads */
function drawFallbackPolygons(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, MASK_W, MASK_H);
    ctx.fillStyle = '#fff';

    // Simplified continent outlines (fallback only — replaced by real texture ASAP)
    drawPoly(ctx, [-6,36,-17,21,-17.5,14.7,-13.5,9.5,-8,5,-1,5.5,5,4.5,10,4,9,0,12,-5,12,-15,15,-27,18.5,-34.5,26,-34,30,-31,35,-25,36,-18,40,-11,40,-5,41,0,41.5,5,49,10,51,12,43,18,38,24,34,32.5,32,15,33,11,37,3,36.5,-3,35.5]);
    drawPoly(ctx, [44,-12,50,-22,47,-26,43,-19,44,-12]);
    drawPoly(ctx, [-10,36,-9,40,-2,43.5,5,43.5,6,49,8,54.5,12,56,18,60,25,71,32,69,24,60,32,65,45,68,60,66,56,58,45,53,40,50,42,46,48,48,55,47,60,42.5,50,42,42,44,35,45,28,47,23,41,22,38,25,35,18,41,14,46,12,38,7,43.5,5,39,0,38,-5,36.5]);
    drawPoly(ctx, [-6,50,0,56,1.5,52,-5,50]);
    drawPoly(ctx, [-168,65,-155,57,-125,49,-120,39,-117,33,-110,28,-105,25,-100,17.5,-91,15,-84,10,-80,8,-82,9.5,-90.5,20,-97,20.5,-97.5,29,-88,30.5,-80.5,32,-74,39,-70,43,-55,49,-60,56,-72,64,-100,71,-115,71,-145,70,-168,65]);
    drawPoly(ctx, [-80,8,-52,4,-48,-2,-40,-5,-35,-12,-41,-22,-48,-27,-52,-34,-65,-46,-72,-54,-76,-46,-72,-34,-70,-18,-75,0,-80,8]);
    drawPoly(ctx, [60,66,90,73,120,72,150,66,160,60,180,66,180,62,155,55,140,42,130,31,120,28,108,21,103,3,98,8,88,22.5,80,24,73,15,78,9,80,16,82,26,86,25,93,20,100,3,106,10,108,16,117,23,130,31.5,140,38,155,53,170,60,173,56,162,44,145,35,140,34,130,31,60,28,48,40,40,41,34,44,30,48,44,48,55,52,60,60,60,66]);
    drawPoly(ctx, [68,24,77,8,80,13,80,24,68,24]);
    drawPoly(ctx, [35,30,43,14,55,22,54,28,47,30,35,30]);
    drawPoly(ctx, [114,-22,130,-12,145,-19,153,-28,150,-36,145,-38,130,-32,114,-30,114,-22]);
    drawPoly(ctx, [-180,-65,-90,-70,0,-68,90,-70,180,-65,180,-90,-180,-90]);
}

/**
 * Load the specular texture and rebuild the land mask from it.
 * In the specular map: white (high luminance) = ocean, black (low luminance) = land.
 * We invert it so land pixels become white in our mask.
 */
function loadSpecularTexture(): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = MASK_W;
        canvas.height = MASK_H;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, MASK_W, MASK_H);
        const imgData = ctx.getImageData(0, 0, MASK_W, MASK_H);
        const pixels = imgData.data;

        // Invert: specular has white=ocean, black=land → we want white=land
        for (let i = 0; i < pixels.length; i += 4) {
            const lum = pixels[i]; // red channel (grayscale image)
            // Land = low luminance (<128), Ocean = high luminance (>=128)
            const isLand = lum < 128 ? 255 : 0;
            pixels[i] = isLand;
            pixels[i + 1] = isLand;
            pixels[i + 2] = isLand;
            pixels[i + 3] = 255;
        }

        maskData = pixels;
        maskReady = true;
        resolveReady();
    };
    img.onerror = () => {
        // Fallback polygons already loaded — just mark ready
        maskReady = true;
        resolveReady();
    };
    img.src = '/textures/earth-specular.jpg';
}

export function initLandMask(): void {
    // Draw immediate fallback polygons so terrain generation can proceed
    const canvas = document.createElement('canvas');
    canvas.width = MASK_W;
    canvas.height = MASK_H;
    const ctx = canvas.getContext('2d')!;
    drawFallbackPolygons(ctx);
    maskData = ctx.getImageData(0, 0, MASK_W, MASK_H).data;

    // Start loading real texture in parallel — will replace mask data when ready
    loadSpecularTexture();
}

/** Promise that resolves when the real texture mask is loaded (or fallback confirmed) */
export function landMaskReady(): Promise<void> {
    return readyPromise;
}

/** Returns true if the high-resolution specular texture mask has loaded */
export function isHighResMaskLoaded(): boolean {
    return maskReady;
}

/**
 * Land/ocean test for any lat/lon. Returns `true` if land.
 *
 * Note: exported as both `isLandMask` and `isLand` for backwards compatibility with
 * existing call sites (terrain.ts, biome-classifier.ts, fireflies.ts). Prefer `isLand`
 * at call sites; the `isLandMask` alias can be removed once the codebase is unified.
 */
export function isLand(lat: number, lon: number): boolean {
    const x = Math.floor(((lon + 180) / 360) * MASK_W);
    const y = Math.floor(((90 - lat) / 180) * MASK_H);
    if (x < 0 || x >= MASK_W || y < 0 || y >= MASK_H) return false;
    return maskData[(y * MASK_W + x) * 4] > 128;
}

export { isLand as isLandMask };
