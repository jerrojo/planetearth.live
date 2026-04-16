/**
 * UI string dictionaries.
 *
 * Keep one block per surface (status badge, dashboard, panels, controls…)
 * so translators can scan context. Missing keys fall back to the Spanish
 * baseline — never to the raw key — so the UI always reads naturally.
 *
 * Adding a language: add it to `Locale`, extend `DICTS`, expose it from the
 * language switcher in `src/ui/components/accessibility.ts`.
 */

export type Locale = 'es' | 'en';

export type StringKey =
    | 'app.tagline'
    | 'app.title'
    | 'app.loading'
    | 'app.worldPopulation'
    | 'status.offline'
    | 'status.minimal'
    | 'status.partial'
    | 'status.live'
    | 'status.dataSources'
    | 'error.webgl'
    | 'error.boot'
    | 'nav.categories'
    | 'nav.skipToContent'
    | 'nav.close'
    | 'a11y.settings'
    | 'a11y.text'
    | 'a11y.textSmall'
    | 'a11y.textMedium'
    | 'a11y.textLarge'
    | 'a11y.reduceMotion'
    | 'a11y.highContrast'
    | 'a11y.language'
    | 'data.fresh'
    | 'data.stale'
    | 'data.invalid'
    | 'data.offline'
    | 'data.pending'
    | 'data.export'
    | 'data.exportCsv'
    | 'data.exportJson'
    | 'data.sourceStatus'
    | 'data.lastUpdated'
    | 'data.latency'
    | 'data.source'
    | 'data.originalSource'
    | 'data.cadence';

type Dict = Record<StringKey, string>;

const es: Dict = {
    'app.tagline': 'Planetary Impact Visualization',
    'app.title': 'PLANETEARTH.LIVE',
    'app.loading': 'Cargando',
    'app.worldPopulation': 'Población Mundial',
    'status.offline': 'OFFLINE — datos base de fallback',
    'status.minimal': 'MÍNIMO — {n}/{total} fuente conectada',
    'status.partial': 'PARCIAL — {n}/{total} fuentes activas',
    'status.live': 'LIVE — {n}/{total} fuentes (NOAA, NASA, USGS, CAMS, GFW, GBIF)',
    'status.dataSources': 'Fuentes de datos',
    'error.webgl': 'Tu navegador no soporta WebGL. Por favor usa Chrome, Firefox, Safari o Edge actualizado.',
    'error.boot': 'Error al inicializar la visualización. Por favor recarga la página o prueba otro navegador.',
    'nav.categories': 'Categorías de impacto',
    'nav.skipToContent': 'Saltar al contenido',
    'nav.close': 'Cerrar',
    'a11y.settings': 'Configuración',
    'a11y.text': 'Texto',
    'a11y.textSmall': 'Peq',
    'a11y.textMedium': 'Med',
    'a11y.textLarge': 'Grande',
    'a11y.reduceMotion': 'Reducir movimiento',
    'a11y.highContrast': 'Alto contraste',
    'a11y.language': 'Idioma',
    'data.fresh': 'al día',
    'data.stale': 'desactualizado',
    'data.invalid': 'inválido',
    'data.offline': 'sin conexión',
    'data.pending': 'pendiente',
    'data.export': 'Exportar datos',
    'data.exportCsv': 'Descargar CSV',
    'data.exportJson': 'Descargar JSON',
    'data.sourceStatus': 'Estado de las fuentes',
    'data.lastUpdated': 'Última actualización',
    'data.latency': 'Latencia',
    'data.source': 'Fuente',
    'data.originalSource': 'Origen primario',
    'data.cadence': 'Cadencia',
};

const en: Dict = {
    'app.tagline': 'Planetary Impact Visualization',
    'app.title': 'PLANETEARTH.LIVE',
    'app.loading': 'Loading',
    'app.worldPopulation': 'World Population',
    'status.offline': 'OFFLINE — using cached fallback',
    'status.minimal': 'MINIMAL — {n}/{total} source connected',
    'status.partial': 'PARTIAL — {n}/{total} sources active',
    'status.live': 'LIVE — {n}/{total} sources (NOAA, NASA, USGS, CAMS, GFW, GBIF)',
    'status.dataSources': 'Data sources',
    'error.webgl': 'Your browser does not support WebGL. Please use an up-to-date Chrome, Firefox, Safari, or Edge.',
    'error.boot': 'The visualization failed to initialize. Please reload the page or try another browser.',
    'nav.categories': 'Impact categories',
    'nav.skipToContent': 'Skip to content',
    'nav.close': 'Close',
    'a11y.settings': 'Settings',
    'a11y.text': 'Text',
    'a11y.textSmall': 'Small',
    'a11y.textMedium': 'Med',
    'a11y.textLarge': 'Large',
    'a11y.reduceMotion': 'Reduce motion',
    'a11y.highContrast': 'High contrast',
    'a11y.language': 'Language',
    'data.fresh': 'fresh',
    'data.stale': 'stale',
    'data.invalid': 'invalid',
    'data.offline': 'offline',
    'data.pending': 'pending',
    'data.export': 'Export data',
    'data.exportCsv': 'Download CSV',
    'data.exportJson': 'Download JSON',
    'data.sourceStatus': 'Source status',
    'data.lastUpdated': 'Last updated',
    'data.latency': 'Latency',
    'data.source': 'Source',
    'data.originalSource': 'Primary source',
    'data.cadence': 'Cadence',
};

export const DICTS: Record<Locale, Dict> = { es, en };
export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALES: Locale[] = ['es', 'en'];
