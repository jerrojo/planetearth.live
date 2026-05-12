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

/**
 * Supported UI locales.
 *
 * Shipping ES + EN only — covers the creator's primary audience and the
 * international fallback for everything else via browser-language detection
 * (see `detectLocale` in `./index.ts`). Navigators set to e.g. French or
 * Japanese resolve to DEFAULT_LOCALE. Adding another locale: extend this
 * union, add the Dict below, register it in DICTS / LOCALES / LOCALE_LABELS.
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
    | 'a11y.layers'
    | 'a11y.layerWind'
    | 'a11y.layerEvents'
    | 'a11y.layerCountries'
    | 'a11y.layerCountryLights'
    | 'a11y.layerStations'
    | 'a11y.layerGrain'
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
    | 'data.cadence'
    | 'ticker.sinceYouArrived'
    | 'ticker.provenance'
    | 'ticker.unitCO2'
    | 'ticker.unitTrees'
    | 'ticker.unitIce'
    | 'dashboard.motto'
    | 'status.connecting'
    | 'action.phrase.0'
    | 'action.phrase.1'
    | 'action.phrase.2'
    | 'action.phrase.3'
    | 'action.phrase.4'
    | 'action.phrase.5'
    | 'action.phrase.6'
    | 'action.phrase.7'
    | 'action.phrase.8'
    | 'action.phrase.9'
    | 'action.phrase.10'
    | 'action.ofTheDay'
    | 'dashboard.narrative.0'
    | 'dashboard.narrative.1'
    | 'dashboard.narrative.2'
    | 'dashboard.narrative.3'
    | 'dashboard.narrative.4'
    | 'dashboard.narrative.5'
    | 'dashboard.narrative.6'
    | 'dashboard.narrative.7'
    | 'dashboard.critical'
    | 'dashboard.attention'
    // Metric personality — 11 metrics × 4 moods (happy, worried, danger, critical)
    | 'personality.0.happy'   | 'personality.0.worried'   | 'personality.0.danger'   | 'personality.0.critical'
    | 'personality.1.happy'   | 'personality.1.worried'   | 'personality.1.danger'   | 'personality.1.critical'
    | 'personality.2.happy'   | 'personality.2.worried'   | 'personality.2.danger'   | 'personality.2.critical'
    | 'personality.3.happy'   | 'personality.3.worried'   | 'personality.3.danger'   | 'personality.3.critical'
    | 'personality.4.happy'   | 'personality.4.worried'   | 'personality.4.danger'   | 'personality.4.critical'
    | 'personality.5.happy'   | 'personality.5.worried'   | 'personality.5.danger'   | 'personality.5.critical'
    | 'personality.6.happy'   | 'personality.6.worried'   | 'personality.6.danger'   | 'personality.6.critical'
    | 'personality.7.happy'   | 'personality.7.worried'   | 'personality.7.danger'   | 'personality.7.critical'
    | 'personality.8.happy'   | 'personality.8.worried'   | 'personality.8.danger'   | 'personality.8.critical'
    | 'personality.9.happy'   | 'personality.9.worried'   | 'personality.9.danger'   | 'personality.9.critical'
    | 'personality.10.happy'  | 'personality.10.worried'  | 'personality.10.danger'  | 'personality.10.critical'
    | 'aria.canvas'
    | 'aria.popCounter'
    | 'country.strip.aria'
    | 'aria.dashboardRegion'
    | 'aria.textSize'
    // Dashboard planet-health aggregate widget
    | 'dashboard.planetHealth.label'
    | 'dashboard.planetHealth.aria'
    | 'dashboard.planetHealth.tooltip'
    // Action-of-the-day widget
    | 'action.skipButton'
    | 'action.skipButtonAria'
    | 'action.startHereBadge'
    // Category panel (shown when user clicks a category)
    | 'panel.connectedWith'
    | 'panel.metricsHighlighted'
    | 'panel.sectionIndividual'
    | 'panel.sectionGovernmental'
    | 'panel.sectionGlobal'
    | 'panel.impactLabel'
    | 'panel.scaleMid'
    | 'panel.statPeopleNeeded'
    | 'panel.statNetworkMultiplier'
    | 'panel.statConnections'
    | 'panel.statConnectionsValue'
    // WebGL context-lost overlay
    | 'error.contextLost'
    // Category names (12 categories, localized per locale)
    | 'cat.0.name'  | 'cat.0.subtitle'
    | 'cat.1.name'  | 'cat.1.subtitle'
    | 'cat.2.name'  | 'cat.2.subtitle'
    | 'cat.3.name'  | 'cat.3.subtitle'
    | 'cat.4.name'  | 'cat.4.subtitle'
    | 'cat.5.name'  | 'cat.5.subtitle'
    | 'cat.6.name'  | 'cat.6.subtitle'
    | 'cat.7.name'  | 'cat.7.subtitle'
    | 'cat.8.name'  | 'cat.8.subtitle'
    | 'cat.9.name'  | 'cat.9.subtitle'
    | 'cat.10.name' | 'cat.10.subtitle'
    | 'cat.11.name' | 'cat.11.subtitle'
    // Metric card labels (11 metrics — order matches src/services/metrics.ts)
    | 'metric.0.label'  | 'metric.1.label'  | 'metric.2.label'
    | 'metric.3.label'  | 'metric.4.label'  | 'metric.5.label'
    | 'metric.6.label'  | 'metric.7.label'  | 'metric.8.label'
    | 'metric.9.label'  | 'metric.10.label'
    // Dashboard tooltips
    | 'dashboard.staleDataTooltip';

type Dict = Record<StringKey, string>;

const es: Dict = {
    'app.tagline': 'Visualización de Impacto Planetario',
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
    'a11y.layers': 'Capas',
    'a11y.layerWind': 'Flujo del viento',
    'a11y.layerEvents': 'Eventos naturales',
    'a11y.layerCountries': 'Países',
    'a11y.layerCountryLights': 'Semáforos por país',
    'a11y.layerStations': 'Estaciones de medición',
    'a11y.layerGrain': 'Grano cinematográfico',
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
    'ticker.sinceYouArrived': 'Desde que llegaste',
    'ticker.provenance': 'Basado en tasas globales anuales: 40,6 GT CO₂/año (Global Carbon Project 2023), 10 000 M árboles/año (FAO Forest Resources 2020), 1,9 km²/h hielo ártico (NSIDC)',
    'ticker.unitCO2': 'ton CO₂',
    'ticker.unitTrees': 'árboles',
    'ticker.unitIce': 'km² hielo',
    'dashboard.motto': 'Cada segundo cuenta. El planeta habla con datos.',
    'status.connecting': 'Conectando APIs…',
    'action.phrase.0': 'CO₂ está en {v} ppm',
    'action.phrase.1': 'Temperatura subió +{v} °C',
    'action.phrase.2': 'pH oceánico baja a {v}',
    'action.phrase.3': 'Perdemos árboles cada segundo',
    'action.phrase.4': 'Solo {v} % de energía limpia',
    'action.phrase.5': 'Emitimos {v} GT CO₂/año',
    'action.phrase.6': 'Metano en {v} ppb — ganadería + fugas fósiles',
    'action.phrase.7': 'N₂O en {v} ppb — fertilizantes sintéticos',
    'action.phrase.8': 'Hielo ártico: solo {v} M km²',
    'action.phrase.9': 'PM2,5 global: {v} μg/m³ — 7 M mueren/año',
    'action.phrase.10': 'Red eléctrica: {v} gCO₂/kWh ahora',
    'action.ofTheDay': 'Acción del día',
    'dashboard.narrative.0': 'Cada segundo cuenta. El planeta habla con datos.',
    'dashboard.narrative.1': 'Los datos son la voz del planeta. ¿Escuchamos?',
    'dashboard.narrative.2': 'Más conectados, más conscientes, más vivos.',
    'dashboard.narrative.3': '11 señales vitales. 10 fuentes. 1 planeta.',
    'dashboard.narrative.4': 'La Tierra tiene pulso. Estás viéndolo en vivo.',
    'dashboard.narrative.5': 'Cada dato es una llamada a la acción.',
    'dashboard.narrative.6': 'No hay Planeta B. Hay Datos A.',
    'dashboard.narrative.7': 'Observar es el primer paso para transformar.',
    'dashboard.critical': '⚠️ {metric} en estado crítico — {mood}',
    'dashboard.attention': '⚡ {metric} necesita atención — {mood}',
    // CO₂
    'personality.0.happy': '¡Aire limpio!',
    'personality.0.worried': 'El CO₂ sigue subiendo…',
    'personality.0.danger': 'Me cuesta respirar…',
    'personality.0.critical': '¡No puedo respirar!',
    // Temperature
    'personality.1.happy': '¡Temperatura estable!',
    'personality.1.worried': 'Sube el calor…',
    'personality.1.danger': 'Tengo fiebre…',
    'personality.1.critical': '¡Me derrito!',
    // Ocean pH
    'personality.2.happy': '¡Océanos sanos!',
    'personality.2.worried': 'Me estoy acidificando…',
    'personality.2.danger': 'Los corales sufren…',
    'personality.2.critical': '¡Mis corales mueren!',
    // Trees
    'personality.3.happy': '¡Bosques fuertes!',
    'personality.3.worried': 'Pierdo hojas…',
    'personality.3.danger': 'Mis bosques caen…',
    'personality.3.critical': '¡Deforestación masiva!',
    // Clean Energy
    'personality.4.happy': '¡Energía verde!',
    'personality.4.worried': 'Falta energía limpia…',
    'personality.4.danger': 'Demasiados fósiles…',
    'personality.4.critical': '¡Atrapado en carbón!',
    // Emissions
    'personality.5.happy': '¡Emisiones bajo control!',
    'personality.5.worried': 'Emisiones subiendo…',
    'personality.5.danger': 'Contamino demasiado…',
    'personality.5.critical': '¡Asfixia total!',
    // Methane
    'personality.6.happy': '¡Metano estable!',
    'personality.6.worried': 'El metano acelera…',
    'personality.6.danger': 'Demasiado metano…',
    'personality.6.critical': '¡Bomba de metano!',
    // N₂O
    'personality.7.happy': '¡N₂O bajo control!',
    'personality.7.worried': 'El N₂O sube…',
    'personality.7.danger': 'Exceso de fertilizantes…',
    'personality.7.critical': '¡Óxido descontrolado!',
    // Arctic Ice
    'personality.8.happy': '¡Hielo estable!',
    'personality.8.worried': 'Se derrite poco a poco…',
    'personality.8.danger': 'El Ártico desaparece…',
    'personality.8.critical': '¡Sin hielo!',
    // PM2.5
    'personality.9.happy': '¡Aire limpio!',
    'personality.9.worried': 'El aire se ensucia…',
    'personality.9.danger': 'Difícil respirar…',
    'personality.9.critical': '¡Aire tóxico!',
    // Carbon Intensity
    'personality.10.happy': '¡Energía limpia!',
    'personality.10.worried': 'Mucho carbono en la red…',
    'personality.10.danger': 'Red eléctrica sucia…',
    'personality.10.critical': '¡Red 100 % fósil!',
    'aria.canvas': 'Visualización 3D interactiva del planeta Tierra mostrando biomas y datos de impacto planetario',
    'aria.popCounter': 'Contador de población mundial y meta de participación',
    'country.strip.aria': '30 países ordenados por salud, clic para ver detalle',
    'aria.dashboardRegion': 'Métricas ambientales',
    'aria.textSize': 'Tamaño de texto',
    'dashboard.planetHealth.label': 'Salud Planetaria',
    'dashboard.planetHealth.aria': 'Salud del Planeta',
    'dashboard.planetHealth.tooltip': 'Promedio de 11 métricas ambientales en tiempo real. 100 = planeta sano, 0 = colapso.',
    'action.skipButton': '↻ Otra acción',
    'action.skipButtonAria': 'Ver otra acción',
    'action.startHereBadge': 'Empieza aquí',
    'panel.connectedWith': 'Conectado con',
    'panel.metricsHighlighted': 'Métricas relacionadas resaltadas arriba',
    'panel.sectionIndividual': 'Acciones Individuales',
    'panel.sectionGovernmental': 'Acciones Gubernamentales',
    'panel.sectionGlobal': 'Acciones Globales',
    'panel.impactLabel': 'Impacto 3.5%:',
    'panel.scaleMid': 'Meta 3.5%',
    'panel.statPeopleNeeded': 'Personas necesarias',
    'panel.statNetworkMultiplier': 'Multiplicador red',
    'panel.statConnections': 'Conexiones',
    'panel.statConnectionsValue': '{count} categorías',
    'error.contextLost': 'Reconectando gráficos…',
    'cat.0.name': 'Clima y Energía',           'cat.0.subtitle': 'El sistema operativo del planeta',
    'cat.1.name': 'Biodiversidad',             'cat.1.subtitle': 'La redundancia de la vida',
    'cat.2.name': 'Agua y Océanos',            'cat.2.subtitle': 'El solvente de la existencia',
    'cat.3.name': 'Animales',                  'cat.3.subtitle': 'Co-habitantes, no recursos',
    'cat.4.name': 'Alimentación',              'cat.4.subtitle': 'El nexo de todo',
    'cat.5.name': 'Espacio',                   'cat.5.subtitle': 'La póliza de seguro de la vida',
    'cat.6.name': 'Salud Integral',            'cat.6.subtitle': 'La capacidad de actuar',
    'cat.7.name': 'Tecnología e IA',           'cat.7.subtitle': 'El multiplicador universal',
    'cat.8.name': 'Economía',                  'cat.8.subtitle': 'El sistema de incentivos',
    'cat.9.name': 'Educación',                 'cat.9.subtitle': 'El compilador de la acción',
    'cat.10.name': 'Gobernanza',               'cat.10.subtitle': 'El código fuente de la sociedad',
    'cat.11.name': 'Consciencia',              'cat.11.subtitle': 'La raíz de toda acción',
    'metric.0.label':  'CO₂ (PPM)',
    'metric.1.label':  'TEMP +°C',
    'metric.2.label':  'PH OCEÁNICO',
    'metric.3.label':  'ÁRBOLES',
    'metric.4.label':  'ENERGÍA LIMPIA %',
    'metric.5.label':  'EMISIONES GT CO₂',
    'metric.6.label':  'METANO PPB',
    'metric.7.label':  'N₂O PPB',
    'metric.8.label':  'HIELO ÁRTICO Mkm²',
    'metric.9.label':  'PM2.5 μg/m³',
    'metric.10.label': 'CARBONO g/kWh',
    'dashboard.staleDataTooltip': 'Datos con {age} de antigüedad — abre "Data Status" para detalles',
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
    'a11y.layers': 'Layers',
    'a11y.layerWind': 'Wind flow',
    'a11y.layerEvents': 'Natural events',
    'a11y.layerCountries': 'Countries',
    'a11y.layerCountryLights': 'Country traffic lights',
    'a11y.layerStations': 'Measurement stations',
    'a11y.layerGrain': 'Film grain',
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
    'ticker.sinceYouArrived': 'Since you arrived',
    'ticker.provenance': 'Based on global annual rates: 40.6 GT CO₂/year (Global Carbon Project 2023), 10 billion trees/year (FAO Forest Resources 2020), 1.9 km²/hr Arctic ice (NSIDC)',
    'ticker.unitCO2': 't CO₂',
    'ticker.unitTrees': 'trees',
    'ticker.unitIce': 'km² ice',
    'dashboard.motto': 'Every second counts. The planet speaks through data.',
    'status.connecting': 'Connecting APIs…',
    'action.phrase.0': 'CO₂ at {v} ppm',
    'action.phrase.1': 'Temperature up +{v}°C',
    'action.phrase.2': 'Ocean pH drops to {v}',
    'action.phrase.3': 'We lose trees every second',
    'action.phrase.4': 'Only {v}% clean energy',
    'action.phrase.5': 'We emit {v} GT CO₂/year',
    'action.phrase.6': 'Methane at {v} ppb — livestock + fossil leaks',
    'action.phrase.7': 'N₂O at {v} ppb — synthetic fertilizers',
    'action.phrase.8': 'Arctic ice: just {v} M km²',
    'action.phrase.9': 'Global PM2.5: {v} μg/m³ — 7M die/year',
    'action.phrase.10': 'Grid: {v} gCO₂/kWh right now',
    'action.ofTheDay': 'Action of the day',
    'dashboard.narrative.0': 'Every second counts. The planet speaks through data.',
    'dashboard.narrative.1': 'Data is the planet\u2019s voice. Are we listening?',
    'dashboard.narrative.2': 'More connected, more conscious, more alive.',
    'dashboard.narrative.3': '11 vital signs. 10 sources. 1 planet.',
    'dashboard.narrative.4': 'Earth has a pulse. You\u2019re watching it live.',
    'dashboard.narrative.5': 'Every data point is a call to action.',
    'dashboard.narrative.6': 'There is no Planet B. There is Data A.',
    'dashboard.narrative.7': 'Observing is the first step to transforming.',
    'dashboard.critical': '⚠️ {metric} in critical condition — {mood}',
    'dashboard.attention': '⚡ {metric} needs attention — {mood}',
    // CO₂
    'personality.0.happy': 'Clean air!',
    'personality.0.worried': 'CO₂ keeps climbing…',
    'personality.0.danger': 'Hard to breathe…',
    'personality.0.critical': 'I can\u2019t breathe!',
    // Temperature
    'personality.1.happy': 'Temperature stable!',
    'personality.1.worried': 'Heat rising…',
    'personality.1.danger': 'I have a fever…',
    'personality.1.critical': 'I\u2019m melting!',
    // Ocean pH
    'personality.2.happy': 'Healthy oceans!',
    'personality.2.worried': 'I\u2019m getting acidic…',
    'personality.2.danger': 'Corals are suffering…',
    'personality.2.critical': 'My corals are dying!',
    // Trees
    'personality.3.happy': 'Strong forests!',
    'personality.3.worried': 'Losing leaves…',
    'personality.3.danger': 'My forests are falling…',
    'personality.3.critical': 'Massive deforestation!',
    // Clean Energy
    'personality.4.happy': 'Green energy!',
    'personality.4.worried': 'Not enough clean power…',
    'personality.4.danger': 'Too much fossil fuel…',
    'personality.4.critical': 'Trapped in coal!',
    // Emissions
    'personality.5.happy': 'Emissions under control!',
    'personality.5.worried': 'Emissions rising…',
    'personality.5.danger': 'I\u2019m polluting too much…',
    'personality.5.critical': 'Total suffocation!',
    // Methane
    'personality.6.happy': 'Methane stable!',
    'personality.6.worried': 'Methane is accelerating…',
    'personality.6.danger': 'Too much methane…',
    'personality.6.critical': 'Methane bomb!',
    // N₂O
    'personality.7.happy': 'N₂O under control!',
    'personality.7.worried': 'N₂O is climbing…',
    'personality.7.danger': 'Fertilizer overload…',
    'personality.7.critical': 'Nitrous out of control!',
    // Arctic Ice
    'personality.8.happy': 'Ice stable!',
    'personality.8.worried': 'Melting bit by bit…',
    'personality.8.danger': 'The Arctic is vanishing…',
    'personality.8.critical': 'No ice left!',
    // PM2.5
    'personality.9.happy': 'Clean air!',
    'personality.9.worried': 'Air getting dirty…',
    'personality.9.danger': 'Hard to breathe…',
    'personality.9.critical': 'Toxic air!',
    // Carbon Intensity
    'personality.10.happy': 'Clean energy!',
    'personality.10.worried': 'Lots of carbon on the grid…',
    'personality.10.danger': 'Dirty power grid…',
    'personality.10.critical': '100% fossil grid!',
    'aria.canvas': 'Interactive 3D visualization of planet Earth showing biomes and planetary impact data',
    'aria.popCounter': 'World population counter and participation goal',
    'country.strip.aria': '30 countries sorted by health, click to view detail',
    'aria.dashboardRegion': 'Environmental metrics',
    'aria.textSize': 'Text size',
    'dashboard.planetHealth.label': 'Planetary Health',
    'dashboard.planetHealth.aria': 'Planetary Health',
    'dashboard.planetHealth.tooltip': 'Average of 11 environmental metrics in real time. 100 = healthy planet, 0 = collapse.',
    'action.skipButton': '↻ Another action',
    'action.skipButtonAria': 'See another action',
    'action.startHereBadge': 'Start here',
    'panel.connectedWith': 'Connected with',
    'panel.metricsHighlighted': 'Related metrics highlighted above',
    'panel.sectionIndividual': 'Individual Actions',
    'panel.sectionGovernmental': 'Governmental Actions',
    'panel.sectionGlobal': 'Global Actions',
    'panel.impactLabel': '3.5% Impact:',
    'panel.scaleMid': '3.5% Goal',
    'panel.statPeopleNeeded': 'People needed',
    'panel.statNetworkMultiplier': 'Network multiplier',
    'panel.statConnections': 'Connections',
    'panel.statConnectionsValue': '{count} categories',
    'error.contextLost': 'Reconnecting graphics…',
    'cat.0.name': 'Climate & Energy',       'cat.0.subtitle': 'The planet\u2019s operating system',
    'cat.1.name': 'Biodiversity',           'cat.1.subtitle': 'The redundancy of life',
    'cat.2.name': 'Water & Oceans',         'cat.2.subtitle': 'The solvent of existence',
    'cat.3.name': 'Animals',                'cat.3.subtitle': 'Co-inhabitants, not resources',
    'cat.4.name': 'Food',                   'cat.4.subtitle': 'The nexus of everything',
    'cat.5.name': 'Space',                  'cat.5.subtitle': 'Life\u2019s insurance policy',
    'cat.6.name': 'Holistic Health',        'cat.6.subtitle': 'The capacity to act',
    'cat.7.name': 'Technology & AI',        'cat.7.subtitle': 'The universal multiplier',
    'cat.8.name': 'Economy',                'cat.8.subtitle': 'The incentive system',
    'cat.9.name': 'Education',              'cat.9.subtitle': 'The compiler of action',
    'cat.10.name': 'Governance',            'cat.10.subtitle': 'The source code of society',
    'cat.11.name': 'Consciousness',         'cat.11.subtitle': 'The root of all action',
    'metric.0.label':  'CO₂ (PPM)',
    'metric.1.label':  'TEMP +°C',
    'metric.2.label':  'OCEAN PH',
    'metric.3.label':  'TREES',
    'metric.4.label':  'CLEAN ENERGY %',
    'metric.5.label':  'EMISSIONS GT CO₂',
    'metric.6.label':  'METHANE PPB',
    'metric.7.label':  'N₂O PPB',
    'metric.8.label':  'ARCTIC ICE Mkm²',
    'metric.9.label':  'PM2.5 μg/m³',
    'metric.10.label': 'CARBON g/kWh',
    'dashboard.staleDataTooltip': 'Data from {age} ago — open "Data Status" for details',
};


export const DICTS: Record<Locale, Dict> = { es, en };
export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALES: Locale[] = ['es', 'en'];

/**
 * Human-readable language names for the language switcher UI.
 * Each label is written in its OWN language so users can recognize it
 * regardless of which locale is currently active ("Native name" convention,
 * standard in multilingual UIs like Wikipedia's sidebar).
 */
export const LOCALE_LABELS: Record<Locale, string> = {
    es: 'Español',
    en: 'English',
};

/**
 * Locales that render right-to-left. No RTL locales in the current shipping
 * set — kept as a pure function so re-adding Arabic/Hebrew later is a one-line
 * change in consumers (see `setLocale` in `./index.ts`).
 */
export function isRTL(_locale: Locale): boolean {
    return false;
}
