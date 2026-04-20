/**
 * Layer visibility state — independent toggles exposed through the Settings panel.
 *
 * These control optional overlays on top of the base globe:
 *   - windFlow: atmospheric circulation particle streamlines (decoupled from
 *     reduce-motion, which users sometimes want on without losing the globe feel).
 *   - naturalEvents: NASA EONET wildfires, volcanoes, storms, earthquakes.
 *   - countries: country accountability markers (curated editorial layer).
 *
 * Persisted to localStorage under `planetearth-layer-<key>`. Subscribers are notified
 * synchronously on change — they should toggle their rendered Object3D's `visible`
 * or tear down any per-frame cost.
 */

export type LayerKey = 'windFlow' | 'naturalEvents' | 'countries' | 'stations' | 'filmGrain';

const DEFAULTS: Record<LayerKey, boolean> = {
    windFlow: true,
    naturalEvents: true,
    countries: true,    // editorial, lightweight
    stations: true,     // real measurement sensors (Argo, NOAA GHG, weather, buoys, tide,
                        // solar, seismic, airq). On by default — the dots ARE the data.
                        // Toggle exists for users who want a cleaner planet view.
    filmGrain: true,    // cinematic "static" noise — decoupled from reduce-motion so users
                        // who keep motion on can still turn the grain off if they find it noisy.
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
