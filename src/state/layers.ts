/**
 * Layer visibility state — independent toggles exposed through the Settings panel.
 *
 * These control optional overlays on top of the base globe:
 *   - windFlow: atmospheric circulation particle streamlines (decoupled from
 *     reduce-motion, which users sometimes want on without losing the globe feel).
 *   - naturalEvents: NASA EONET wildfires, volcanoes, storms, earthquakes.
 *   - satellites: Starlink constellation (live TLE propagation).
 *   - countries: country accountability markers (curated editorial layer).
 *
 * Persisted to localStorage under `planetearth-layer-<key>`. Subscribers are notified
 * synchronously on change — they should toggle their rendered Object3D's `visible`
 * or tear down any per-frame cost.
 */

export type LayerKey = 'windFlow' | 'naturalEvents' | 'satellites' | 'countries' | 'stations';

const DEFAULTS: Record<LayerKey, boolean> = {
    windFlow: true,
    naturalEvents: true,
    satellites: false,  // opt-in — adds ~6000 points + 50kB/6h network
    countries: true,    // editorial, lightweight
    stations: false,    // dense sensor grid — off by default so the globe reads cleanly;
                        // users who want to audit the data sources turn it on.
};

type Listener = (key: LayerKey, value: boolean) => void;
const listeners: Set<Listener> = new Set();
let state: Record<LayerKey, boolean> | null = null;

function storageKey(key: LayerKey): string {
    return `planetearth-layer-${key}`;
}

function load(): Record<LayerKey, boolean> {
    const out = { ...DEFAULTS };
    try {
        for (const key of Object.keys(DEFAULTS) as LayerKey[]) {
            const saved = localStorage.getItem(storageKey(key));
            if (saved === '0') out[key] = false;
            else if (saved === '1') out[key] = true;
        }
    } catch {
        // localStorage may throw in private-browsing or sandboxed contexts — fall back to defaults.
    }
    return out;
}

function ensure(): Record<LayerKey, boolean> {
    if (!state) state = load();
    return state;
}

export function isLayerEnabled(key: LayerKey): boolean {
    return ensure()[key];
}

export function setLayer(key: LayerKey, value: boolean): void {
    const s = ensure();
    if (s[key] === value) return;
    s[key] = value;
    try { localStorage.setItem(storageKey(key), value ? '1' : '0'); } catch { /* ignore */ }
    listeners.forEach(fn => fn(key, value));
}

export function onLayerChange(fn: Listener): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

export function getAllLayers(): Record<LayerKey, boolean> {
    return { ...ensure() };
}
