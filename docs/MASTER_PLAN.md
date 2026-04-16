# Master Plan de Mejora — planetearth.live

*Auditoría profunda + roadmap detallado · Abril 2026*

> **Alcance**: revisión completa del código, datos, render, UX/UI, accesibilidad, producto y narrativa. Horizonte primario: **30 días (quick wins + fundaciones)**. Se incluye visión Q2-Q4 2026 al final.
>
> **Método**: lectura archivo por archivo del monorepo, cruce con `CONTRIBUTING.md`, `DATA_SOURCES.md`, `FRAMEWORK.md`, `IMPACT_MODEL.md` y `MANIFESTO.md`. Cada hallazgo cita ruta y línea donde aplica.

---

## Estado de ejecución · Sesión 2 · 16 abril 2026

Segunda pasada: elevar el proyecto de "sólido hobby" a **referencia institucional**. El marco mental fue "¿qué esperaría un científico climático, una ONG, un gobierno, un ingeniero de datos y un revisor de seguridad al abrir el repo?" — y cerrar cada expectativa con un artefacto verificable.

**Nueva infraestructura de confianza**:

- ✅ **Validación runtime** (`src/services/validation.ts`). 13 validators nombrados, uno por agencia; bounds de sanidad citados en METHODOLOGY.md; rechaza sentinelas (-9999), valores fuera de física, cambios de schema silenciosos. Sin dependencias externas (−13kB vs zod).
- ✅ **Registro de procedencia** (`src/services/provenance.ts`). Cada fetch escribe `{id, source, url, value, fetchedAt, latencyMs, status: ok/stale/invalid/offline/pending, reason}`. Re-evaluación automática de `stale` a 2× la cadencia documentada de la fuente.
- ✅ **Cache con fallback etiquetado** (`src/services/cache.ts`). IndexedDB + localStorage + memoria. `loadFallback(id, maxAgeMs)` — jamás devuelve un valor sin edad documentada; el UI lo marca `offline` cuando entra en juego.
- ✅ **Telemetría opt-out local** (`src/services/telemetry.ts`). Buffer de 500 eventos, sin sink de red, suscriptores para el panel interno. Valor: ver en segundos cuál agency está goteando validaciones.
- ✅ **Export CSV/JSON** (`src/services/export.ts`). Snapshot versionado (`schemaVersion:1`) con atribución completa embebida. Botón en el panel de estado.
- ✅ **Panel "data status"** (`src/ui/components/data-status.ts` + CSS). Toggle abajo-izquierda; lista cada métrica con badge de estado, age, latencia, URL, razón; auto-refresh cada 10s; botones CSV/JSON.
- ✅ **i18n sin dependencias** (`src/i18n/*`). ES/EN con 30+ claves, detección URL > localStorage > html lang > navigator, `applyStaticI18n()` reescribe `data-i18n`/`data-i18n-aria`/`data-i18n-title` en todo el DOM. Toggle en el panel de accesibilidad.
- ✅ **JSON-LD schema.org Dataset** en `index.html`. `variableMeasured` con 12 variables, `measurementTechnique`, `distribution` (CSV+JSON), licencia — crawlable por Google Dataset Search y catálogos científicos.
- ✅ **Hreflang alternates** + `meta referrer` en `index.html`.

**Suite documental institucional (nueva)**:

- ✅ `docs/METHODOLOGY.md` — per-metric agency, aggregator, validator, cadence, baseline, uncertainty, reproducibility, review cadence.
- ✅ `SECURITY.md` — reporte a security@, plazos 72h/7d/30d, CSP/HSTS, threat model in/out, hardening roadmap.
- ✅ `PRIVACY.md` — "collects nothing about you", inventario de cada key en localStorage/IndexedDB, GDPR/CCPA/children.
- ✅ `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 con cláusula explícita de integridad científica (no tergiversar evidencia en ninguna dirección política).
- ✅ `ATTRIBUTION.md` — citas formales con DOI (NOAA GML, GISTEMP, SWPC, CAMS via Open-Meteo, OpenAQ, NSIDC 10.7265/N5K072F8, Church-White 2011, CO-OPS 8518750, USGS, Hansen 2013, GBIF, NGESO, UN DESA, Natural Earth).
- ✅ `docs/GLOSSARY.md` — definiciones cortas por dominio.
- ✅ `docs/FAQ.md` — preguntas de científicos, ONGs, desarrolladores.
- ✅ `GOVERNANCE.md` — roles (maintainer/contributor/scientific reviewer), proceso de decisión (routine/methodological/breaking/security), resolución de disagreements con "default al más conservador", declaración de COI, disclosure de funding.
- ✅ `TERMS.md` — MIT para el código, agencias para los datos, no warranty, limitation of liability, acceptable use.
- ✅ `.github/ISSUE_TEMPLATE/{bug.md,data-anomaly.md,new-source.md,config.yml}` + `.github/PULL_REQUEST_TEMPLATE.md` — intake disciplinado con checklists que forzan actualizar METHODOLOGY/ATTRIBUTION/CSP en la misma PR.

**Seguridad y operaciones**:

- ✅ `public/_headers` (Netlify/Cloudflare Pages) + `vercel.json` — CSP estricto con `connect-src` explícito por agency, HSTS, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy sin geolocation/camera/mic, COOP same-origin, CORP same-origin, cache-control inmutable para `/assets`.
- ✅ `playwright.config.ts` + `tests/e2e/smoke.spec.ts` — smoke tests en Chromium/Firefox/WebKit/iPhone cubriendo boot, canvas render, panel de estado, locale toggle, keyboard nav.
- ✅ `vitest.config.ts` con `@vitest/coverage-v8` y **thresholds de piso** (lines 70 / branches 60) — las regresiones fallan el CI en vez de "bajar un poco sin avisar".
- ✅ Tests nuevos: `validation.test.ts`, `provenance.test.ts`, `i18n.test.ts`, `cache.test.ts`, `export.test.ts` — cada módulo de confianza tiene ahora cobertura unitaria explícita con casos pass/fail para cada validator y transición de estado.
- ✅ `.github/workflows/ci.yml` rehecho: typecheck → tests con cobertura → build → upload coverage artefact; job `audit` con `npm audit --omit=dev --audit-level=high`; job `e2e` con Playwright en PRs.
- ✅ `package.json`: scripts `typecheck`, `test:coverage`, `audit`, `verify`; `repository`/`bugs`/`homepage` rellenados; `@vitest/coverage-v8` + `jsdom` añadidos.

**Primera pasada (referencia · sesión 1)**:

**Hecho en esta sesión**:

- ✅ `isLand` redundante en `land-mask.ts` unificado (ahora `isLand` es la implementación y `isLandMask` es un alias re-exportado).
- ✅ Comentarios M5+ → M4.5+ en `api-client.ts` sincronizados con la URL real.
- ✅ 5 ocurrencias de `any` explícito eliminadas en `services/` mediante interfaces estructurales (`OpenMeteoAirQualityResponse`, `OpenMeteoForecastResponse`, `OpenAqResponse`, `GfwResponse`, `UsgsResponse`, `EonetResponse`, `UsgsFeatureCollection`).
- ✅ `fetchWithTimeout` ahora valida status HTTP (falla en 4xx/5xx en lugar de parsear como JSON) y hace retry exponencial con jitter en 5xx/429 y errores de red.
- ✅ `CategoryId` y `MetricId` como enums tipados en `src/types/index.ts` — eliminan índices mágicos 0..11.
- ✅ Schema de `BiomeParams` documentado campo por campo en `src/types/index.ts` + guía de claves compactas en `src/data/biome-params.ts`.
- ✅ Fallback font stack (`'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`) aplicado en las 9 declaraciones.
- ✅ `formatPop` ahora acepta locale explícito y cae al `document.documentElement.lang` (preparación para i18n).
- ✅ Primer test suite ejecutable: `tests/unit/math.test.ts`, `color-scales.test.ts`, `format.test.ts`, `api-shapes.test.ts`, `ids.test.ts` — **39 tests passing en 1.2s**.
- ✅ CI workflow: `.github/workflows/ci.yml` con typecheck + tests + build, en Node 20 y 22.
- ✅ `DATA_SOURCES.md` sincronizado con código: OpenAQ v2 (no v3), segundo feed USGS M2.5+/24h documentado, GBIF y UV Index añadidos al catálogo, versión GFW `v1.11` explícita.
- ✅ README: las 12 categorías ahora listan los nombres exactos de `FRAMEWORK.md`.

**No-bloqueante pendiente del sandbox**: `legacy/index.html` existe pero no pude borrarlo desde el entorno de esta sesión (permisos de mount). El directorio ya está excluido por `tsconfig.json` y `.gitignore` así que no impacta el build — elimínalo localmente con `rm -rf legacy/` cuando te convenga.

---

## 1. Diagnóstico ejecutivo

planetearth.live es un proyecto con **fundamentos raros de buenos**: narrativa coherente, ciencia bien citada en `services/metrics.ts` y `effects/aurora.ts`, estética Pixar-Warm-Night diferenciadora, cero dependencias runtime excepto Three.js, y un manifiesto que le da propósito. La arquitectura cliente-puro contra 17 agencias públicas es elegante y auditable.

Al mismo tiempo, el proyecto está en un punto donde **la deuda técnica empieza a rozar la deuda de producto**. Los focos principales:

- **Un solo archivo de 520 LOC (`src/services/api-client.ts`) concentra el 100% del fetching** y viola varias políticas del propio `CONTRIBUTING.md` (uso de `any`, accesos `results[7]`…`results[16]` frágiles, endpoints desincronizados con `DATA_SOURCES.md`).
- **Cero tests ejecutables** (`tests/` solo contiene `.DS_Store`) y **cero CI** (no hay `.github/workflows/`), a pesar de tener `vitest` y `playwright` en `package.json`.
- **Clasificación de biomas hardcodeada** en `biome-classifier.ts` (~294 líneas de bounding boxes compactados sin espacios ni comentarios), brittle y fuera del estilo del resto del codebase.
- **Hardcoded Spanish** en UI, `manifest.webmanifest` (`"lang": "es"`), categorías y labels de estaciones — el README promete bilingüe pero no hay capa de i18n.
- **Punto único de falla**: `global-warming.org` re-sirve 6 métricas críticas (CO₂, CH₄, N₂O, temperatura, hielo ártico, nivel del mar). Si el agregador muere, la mitad del dashboard queda estancada.
- **Inconsistencias visibles al lector cuidadoso**: el endpoint de terremotos es `2.5_day.geojson` mientras `DATA_SOURCES.md` anuncia `4.5_month.geojson`; el comentario en `api-client.ts` dice "M5+" pero la URL descarga M4.5+; OpenAQ aparece como v2 en código y v3 en docs.

Ninguno de estos problemas es fatal, pero **acumulados limitan la credibilidad** que el proyecto necesita para aspirar a ser referencia científica pública.

---

## 2. Matriz de prioridad

Clasificación de hallazgos por **impacto** (sobre credibilidad / estabilidad / velocidad futura) y **esfuerzo** (horas-persona estimadas).

### P0 — Bloqueantes de credibilidad (hacer en semana 1)

| # | Hallazgo | Archivo | Esfuerzo |
|---|----------|---------|----------|
| P0.1 | Sincronizar `DATA_SOURCES.md` con endpoints reales (OpenAQ v2/v3, quakes M4.5+/M2.5+, M5+ vs M4.5+) | `DATA_SOURCES.md`, `services/api-client.ts`, `services/earthquake-feed.ts` | 2 h |
| P0.2 | Añadir CI mínima (typecheck + build + vitest) | `.github/workflows/ci.yml` (nuevo) | 3 h |
| P0.3 | Primer set de tests: `utils/math.ts`, `utils/color-scales.ts`, `services/metrics.ts` rate functions | `tests/unit/` (nuevo) | 4 h |
| P0.4 | Eliminar todos los `any` explícitos en services y typar con las interfaces de cada API | `api-client.ts`, `earthquake-feed.ts` | 4 h |
| P0.5 | Eliminar función redundante `isLand` en `land-mask.ts:121-123` (duplicada con `isLandMask`) | `renderer/globe/land-mask.ts` | 15 min |

### P1 — Fundaciones del próximo trimestre (semanas 2-3)

| # | Hallazgo | Archivo | Esfuerzo |
|---|----------|---------|----------|
| P1.1 | Partir `api-client.ts` en módulos por fuente (`atmosphere.ts`, `cryosphere.ts`, `biosphere.ts`, `hazards.ts`, `energy.ts`) con un agregador delgado | `services/sources/*` | 8 h |
| P1.2 | Capa de caché con IndexedDB + TTL por métrica (CO₂ diario / Kp 3h / quakes 5min) | `services/cache.ts` (nuevo) | 6 h |
| P1.3 | Retry con exponential backoff + validación HTTP status en `fetchWithTimeout` | `services/http.ts` (nuevo) | 3 h |
| P1.4 | Registry tipado de métricas y categorías (enum `MetricId`, enum `CategoryId`) que elimine índices mágicos 0-11 | `types/index.ts`, `data/*` | 6 h |
| P1.5 | Documentar schema de `BiomeParams` (campos `gh`, `ghu`, `wm`, `wh`, `ac`, `ah`, `al`, `bsc`) | `data/biome-params.ts` + `types/index.ts` | 2 h |
| P1.6 | Reemplazar `biome-classifier.ts` hardcoded por lookup basado en dataset WWF/Olson Terrestrial Ecoregions (GeoJSON cacheado) | `renderer/globe/biome-classifier.ts` | 16 h (spike) |
| P1.7 | Infraestructura i18n: `src/i18n/{es,en}.json` + helper `t(key)` + marcar strings de categorías/UI | `src/i18n/*`, `data/categories.ts`, `ui/components/*` | 10 h |
| P1.8 | Consolidar constantes mágicas (zoom limits, sensitivities, tier thresholds) en `config/constants.ts` con JSDoc | `controls/orbit.ts`, `ui/components/dashboard.ts` | 3 h |

### P2 — Performance y robustez (semanas 3-4)

| # | Hallazgo | Archivo | Esfuerzo |
|---|----------|---------|----------|
| P2.1 | LOD adaptativo para nubes y terreno según FPS medido | `renderer/globe/*` | 8 h |
| P2.2 | Evitar reconstrucción doble del terreno (fallback + real mask) detectando máscara ya cargada | `renderer/globe/terrain.ts` | 3 h |
| P2.3 | Detección de capacidad de dispositivo más allá de `innerWidth < 768` (GPU tier, memoria) | `renderer/scene-manager.ts`, `post-processing.ts` | 4 h |
| P2.4 | Playwright E2E básico: carga < 3s, intro skippable, panel abre/cierra, APIs mockeadas | `tests/e2e/*` | 6 h |
| P2.5 | Segundo camino para los 6 endpoints que dependen de `global-warming.org` (NOAA GML CSV directo / NASA GISS mirror) | `services/sources/atmosphere.ts` | 10 h |

### P3 — Pulido y visión (semana 4 + Q2)

| # | Hallazgo | Archivo | Esfuerzo |
|---|----------|---------|----------|
| P3.1 | Pub/sub reemplaza callbacks module-level en `panel.ts` | `ui/components/panel.ts` | 2 h |
| P3.2 | Eliminar `legacy/index.html` (o archivar en rama) | `legacy/` | 10 min |
| P3.3 | Documentar origen de los valores tuneados de `heatmap.ts` (radio, intensidad por región) | `renderer/effects/heatmap.ts` | 2 h |
| P3.4 | Migrar pseudo-Kp de `aurora.ts` a fetch real de NOAA SWPC (ya está el endpoint en `DATA_SOURCES.md`) | `renderer/effects/aurora.ts` | 3 h |
| P3.5 | Documentar fórmula `windSpeedColor` o reescribir con escala Beaufort explícita | `utils/color-scales.ts` | 1 h |
| P3.6 | Decidir autoría del `MANIFESTO.md` (actualmente firmado "Claude, Marzo 2026"): reemplazar por "El equipo" o dejar explícito en el README | `docs/vision/MANIFESTO.md`, `README.md` | 1 h (decisión) |
| P3.7 | Alinear nombres de las 12 categorías entre `README.md` y `FRAMEWORK.md` | ambos | 30 min |

---

## 3. Roadmap de 30 días (sprint-by-sprint)

El roadmap asume un trabajador a tiempo parcial (~20h/semana). Si hay más capacidad, los sprints se pueden paralelizar.

### Semana 1 — "Verdad en los datos"

**Objetivo**: lo que el dashboard muestra coincide exactamente con lo que la documentación dice que muestra.

- **L-M**: auditar los 17 endpoints, corregir `DATA_SOURCES.md` (OpenAQ v3 vs v2, terremotos 2.5_day vs 4.5_month, comentario M5+ vs M4.5+ en `api-client.ts:*`). Añadir columna "version_checked_at" al catálogo.
- **X**: setup `.github/workflows/ci.yml` con `npm ci`, `tsc --noEmit`, `npm run build`, `npm test` en Node 20/22.
- **J**: primer test suite: `math.ll2v` contra vectores conocidos (ecuador, polos, meridiano 180), `color-scales` contra valores límite IPCC, `metrics` tasas exponenciales.
- **V**: limpieza de `any` en `services/*` (definir interfaces `NoaaCo2Response`, `UsgsGeoJsonFeature`, etc.).
- **Entregable**: CI verde en `main`, badge en README, `DATA_SOURCES.md` 1:1 con código.

**Éxito medible**: 0 ocurrencias de `any` en `src/services/**/*.ts` (`grep -r ": any" src/services` → 0); CI ejecutándose en cada PR.

### Semana 2 — "Arquitectura de datos modular"

**Objetivo**: partir el monolito de fetching y ganar robustez sin cambiar el comportamiento visible.

- Introducir `services/http.ts` con `fetchWithTimeout`, validación de status, retry exponencial (3 intentos, base 500ms, jitter).
- Introducir `services/cache.ts` con IndexedDB + TTL por tipo de métrica.
- Partir `api-client.ts` en 5-6 módulos por capa del `SYSTEMS_MAP`:
  - `sources/atmosphere.ts` (CO₂, CH₄, N₂O, temp, Kp)
  - `sources/cryosphere.ts` (hielo ártico, sea level global + NYC)
  - `sources/biosphere.ts` (forest loss, GBIF)
  - `sources/hazards.ts` (EONET, earthquakes)
  - `sources/airquality.ts` (CAMS, OpenAQ, Open-Meteo)
  - `sources/energy.ts` (UK carbon intensity)
- `api-client.ts` queda como agregador de ~50 líneas que hace `Promise.allSettled` sobre las 6 categorías y escribe en `state/live-data.ts` ya tipado por `MetricId`.

**Éxito medible**: `cloc src/services/` muestra ningún archivo > 150 LOC; `api-client.ts` < 80 LOC; tests de contract por fuente con fixtures grabadas.

### Semana 3 — "i18n y tipado de dominio"

**Objetivo**: abrir el proyecto al mundo y endurecer el dominio.

- Crear `src/i18n/es.json` extrayendo todos los strings de `data/categories.ts`, `ui/components/*.ts`, `index.html` aria-labels.
- Crear `src/i18n/en.json` como traducción inicial (con marcador `__TODO_REVIEW__` donde falta revisión humana).
- Helper `t(key, params?)` que lee de `document.documentElement.lang` (o `localStorage.preferredLang`).
- Toggle ES/EN visible en la esquina superior derecha.
- Enum `MetricId` + `CategoryId` en `types/index.ts`, migrar todo acceso `results[7]` a `results[MetricId.ARCTIC_ICE]`.
- Schema tipado de `BiomeParams` con comentarios JSDoc que documenten cada campo (`gh`= grass height; `ghu`= grass hue; `wm`= water multiplier; etc.). Validado con type guards.
- Eliminar `isLand` redundante, dejar solo `isLandMask` y renombrar a `isLand`.

**Éxito medible**: `grep -r "toLocaleString('es-" src/` → 0 (se usa `t()`); toggle idioma funcional en desktop + mobile; `MetricId.` aparece en ≥ 10 sitios.

### Semana 4 — "Performance y E2E"

**Objetivo**: que el sitio aguante móviles modestos y tenga un red flag ejecutable si algo se rompe.

- Medir FPS real con `Stats.js` en dev; exponer `window.__fps` en build dev.
- LOD de nubes: si FPS medio < 40 por 3s, halvear número de partículas hasta 1/4 mínimo.
- Detección de terreno-ya-construido: flag `terrainBuilt` en `globe/terrain.ts` que evita rebuild al cargar la máscara real.
- Detección de capacidad GPU: `renderer.capabilities.maxTextureSize`, `navigator.hardwareConcurrency`, feature test WebGL2. Ajustar `postProcessingQuality` en 3 tiers (low/medium/high).
- Playwright E2E con 4 escenarios (home load, intro skip, category panel open, API mocking).
- Backup directo a NOAA GML para CO₂ si `global-warming.org` falla (marcar metric como `direct_source`).

**Éxito medible**: Lighthouse Performance ≥ 85 en mobile; 4 E2E passing en CI; sitio aún muestra CO₂ aunque `global-warming.org` esté caído.

---

## 4. Visión a 3-9 meses (Q2-Q4 2026)

El 30-day plan prepara el terreno. Estas son las apuestas más grandes que recomendaría:

**Abril-Junio 2026 — "El dashboard creíble"**
- Reemplazo de `biome-classifier.ts` hardcoded por WWF/Olson Terrestrial Ecoregions cargado como GeoJSON cacheado. La brittle-ness actual (294 líneas de `if(lat>-4&&lat<6...)`) es la deuda más grande del render pipeline.
- Ampliar catálogo de fuentes: ERA5 wind real (hoy `wind-flow.ts` es sintético sin documentarlo), NASA MODIS NDVI para vegetación, ESA Copernicus Marine SST.
- Página "/verify" con tabla en vivo: métrica → valor mostrado → valor crudo → endpoint → última actualización. Cualquier visitante puede auditar cada número en 5 clics.
- Semana de hardening legal: declaración explícita de fuentes abiertas, políticas de retención, GDPR para visitantes de UE.

**Julio-Septiembre 2026 — "Del visualizador al educador"**
- Componente "Explain this number": cada KPI tiene un botón `?` que abre una explicación científica de 150-250 palabras con citas.
- Rutas de aprendizaje guiadas: 10 min cada una, una por cada categoría del `FRAMEWORK.md`, con checkpoints de "¿qué viste?".
- Integración con el modelo de impacto de `IMPACT_MODEL.md`: calculadora personal ("¿Qué pasaría si 1M de personas hicieran X?").
- Primera versión con **server-side cache** (Cloudflare Worker) para los endpoints que más tiran — no cambia la arquitectura cliente-puro, solo añade una capa opcional.

**Octubre-Diciembre 2026 — "Community + API pública"**
- Documentación como primera-clase: cada carpeta con su `README.md`; diagrama del pipeline; guía de contribución con ejemplos.
- API pública REST/GraphQL sobre el estado vivo (`GET /api/v1/state`, `GET /api/v1/metrics/co2/history`) para que terceros (periodismo climático, ONGs) incrusten métricas sin refetch pesado.
- Plan de sostenibilidad: infraestructura green-hosted, reporte anual de huella del sitio (hoy sin medir).

---

## 5. Políticas propuestas

Para que las mejoras no se deshagan solas con el tiempo.

- **Cero `any`** en `src/services/**` y `src/state/**` (enforced por ESLint `@typescript-eslint/no-explicit-any: error`). En renderer se permite con comentario `// any OK: Three.js <module>` y cita de issue upstream.
- **Cualquier endpoint nuevo** requiere entrada en `DATA_SOURCES.md` en el mismo PR (enforced por script `scripts/verify-sources.ts` en CI).
- **Números mágicos**: fuera de `src/config/constants.ts`, cualquier literal numérico que no sea 0, 1, o una coordenada debe tener comentario explicativo.
- **Commits**: convención [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`). Hoy el repo tiene un solo commit — momento perfecto para empezar bien.
- **PR template** pidiendo: qué cambió, por qué, screenshot si afecta UI, checklist de tests añadidos.

---

## 6. Apéndice A — Hallazgos detallados por área

### 6.1 Renderer

- `scene-manager.ts`: cámara `PerspectiveCamera(45, W/H, 0.1, 500)`, pixel ratio cap a 2, 4 luces (ambient indigo + key cálida + fill fría + rim) — lighting rig bien ejecutado. Recovery de context loss presente.
- `globe/index.ts`: ocean shader con Blinn-Phong, Fresnel atmosphere, cloud particles con modelo probabilístico por latitud. **Bueno**: desert suppression + Gulf Stream enhancement. **Revisar**: número de partículas fijo sin LOD.
- `globe/terrain.ts`: step 1.8° → 17K+ puntos; reconstruido 2 veces (fallback polygon + real mask) — ver P2.2.
- `globe/land-mask.ts:121-123`: `isLand` solo llama a `isLandMask` (redundante) — ver P0.5.
- `globe/biome-classifier.ts`: **la peor deuda visual del repo**. 294 líneas de bounding boxes en formato ultra-compacto sin espacios (`if(lat>-4&&lat<6&&lon>-72&&lon<-50&&Math.abs(lat-(-2+lon*.05))<1.5)return true;`). Estilo inconsistente con el resto del codebase. Mantener este archivo es insostenible a medida que se añadan biomas — ver P1.6.
- `post-processing.ts`: bloom + custom `VignetteChromaticShader` con tonemap ACES + manual linearToSRGB porque `OutputPass` hace linear. El comentario admite riesgo de double-gamma. Parámetros diferenciados mobile/desktop. Añadir tercer tier LOW según P2.3.
- `effects/aurora.ts`: cita Feldstein-Starkov (1967), IGRF-13, Akasofu — ciencia bien fundada. Pero el Kp que alimenta el efecto es pseudo-simulado (`Math.min(9, 2 + 1.5 + 5) = 8.5`) cuando el NOAA endpoint real ya está en `DATA_SOURCES.md` — ver P3.4.
- `effects/heatmap.ts`: valores de intensidad/radio por región no tienen fuente — ver P3.3.
- `particles/fireflies.ts`: cuota por país (China 31%, US 14%, etc.) citando GCP 2024 — correcto. Retry hasta 10× para caer en tierra; si los 10 fallan, spawn silencioso en océano — log o métrica.
- `particles/nebula.ts`: depende de `ImprovedNoise` sin vendorizar explícitamente — añadir en `src/vendor/` o documentar.
- `particles/wind-flow.ts`: sintético y no documentado como tal — riesgo de parecer ERA5 cuando no lo es. Documentar o integrar ERA5 real (Copernicus CDS).

### 6.2 Services y state

- `api-client.ts`: 520 LOC, `Promise.allSettled` con índices `results[7]`…`results[16]`, `any` en múltiples settled results, `OpenAQ v2` (docs dicen v3), GFW `dataset_version v1.11` hardcoded. Prioridad P1.1.
- `earthquake-feed.ts`: URL `2.5_day.geojson` mientras `DATA_SOURCES.md` promete `4.5_month.geojson`. `any` en `features.map`. Retorna cache en lugar de error — ok por UX, pero sin señal visible al usuario. Prioridad P0.1 + P0.4.
- `metrics.ts`: excelente; definiciones con citas NOAA GML, NASA GISS v4, Bates et al. 2014, FAO FRA 2020, IEA WEO 2025, Global Carbon Budget 2025. Offset estacional Keeling. Tween 0.12. **Modelo a seguir**.
- `population.ts`: 24 líneas, limpio. Umbral 3.5% citado correctamente.
- `state/live-data.ts`: 31 líneas, module-level simple. Correcto como fase intermedia; eventualmente puede evolucionar a pub/sub tipado cuando los módulos por fuente escriban al state.

### 6.3 Data

- `categories.ts` (185 L): 12 categorías × 10 acciones, 100% español. Bloquea i18n — P1.7.
- `cities.ts` (46 L): 24 ciudades, fuentes citadas (UN WUP 2024, GCP 2024). Correcto.
- `measurement-stations.ts` (407 L): diseño visual de redes de sensores muy bien pensado. Fetchers con boundaries — ok.
- `biome-params.ts` (31 L): encoding críptico sin leyenda. P1.5.
- `biodiversity-hotspots.ts` (79 L): cita Myers et al. 2000 — revisar si hay edición posterior de Conservation International. Nombres en español mezclados con inglés.
- `historical.ts` (55 L): sparklines con datos hasta Feb-2026 — verificar si son observaciones reales o proyecciones, etiquetar.

### 6.4 UI components

- Patrón general: funciones `create*`/`init*`/`show*`, `innerHTML` con templates, listeners directos. Ligero y rápido, correcto para el tamaño del proyecto.
- `panel.ts`: `let onCategoryChange` module-level = estado fuera de `src/state/` — viola `CONTRIBUTING.md`. P3.1.
- `dashboard.ts`: tier thresholds y mappings de emoji hardcoded en el cuerpo — extraer a `config/tiers.ts`.
- `accessibility.ts`: font size, reduce motion, high contrast — buena base. Sin tests.
- `intro.ts`: typewriter + skip con `localStorage` sin validación — validar valor leído.

### 6.5 Utils / types / controls / styles

- `utils/math.ts`: `ll2v()` correcto.
- `utils/format.ts`: `formatPop` con locale `es-MX` hardcoded — mover a función con locale param, consumible por i18n.
- `utils/color-scales.ts`: `tempAnomalyColor` IPCC AR6 correcto; `windSpeedColor` usa `log(1+speed)/log(31)` sin explicación — P3.5. Añadir guard `Math.max(0, speed)`.
- `types/index.ts`: 93 L, interfaces claras. `BiomeParams` opcionales undocumented — P1.5.
- `controls/orbit.ts`: magic numbers (SENSITIVITY 0.004, ZOOM 9-25, clamp ±1.2 rad). Mover a constants.
- `styles/main.css`: design system consistente. Fuente 'Nunito' sin fallback — añadir stack completo.

### 6.6 Infra

- `tests/`: solo `.DS_Store`. **0% coverage**. P0.3 + P2.4.
- `.github/workflows/`: no existe. P0.2.
- `legacy/index.html`: prototipo viejo, no usado por build. Eliminar o archivar. P3.2.
- `public/`: earth-blue-marble.jpg, earth-specular.jpg, og-image variantes, PWA icons. Verificar tamaños con `wc -c` y considerar WebP/AVIF para textures que hoy JPG.
- Git: 1 solo commit. Mes perfecto para adoptar Conventional Commits.
- `manifest.webmanifest`: `"lang": "es"` hardcoded — debe ser dinámico post-i18n.

---

## 7. Apéndice B — Checklist rápido de quick wins de <30 min

Para días sueltos donde haya poco tiempo pero ganas de mover algo:

- [ ] Borrar `isLand` redundante en `land-mask.ts`
- [ ] Alinear comentario "M5+" con URL real M4.5+ en `api-client.ts`
- [ ] Corregir OpenAQ v2 → v3 o actualizar `DATA_SOURCES.md`
- [ ] Corregir earthquake feed `2.5_day` vs docs `4.5_month`
- [ ] Añadir `Math.max(0, speed)` guard en `windSpeedColor`
- [ ] Añadir fallback font stack a `'Nunito', system-ui, sans-serif`
- [ ] Borrar `legacy/index.html`
- [ ] Añadir CI mínima (`ci.yml` con 3 pasos)
- [ ] `npm audit` + actualizar Three.js a última patch-compatible
- [ ] Alinear nombres de las 12 categorías entre `README.md` y `FRAMEWORK.md`

---

## 8. Métricas de éxito globales del plan

Al final de los 30 días, el proyecto debería poder decir lo siguiente con evidencia:

1. **Coverage**: `npm test` ejecuta ≥ 40 tests, coverage ≥ 40% en utils/services.
2. **CI**: badge verde de "CI" en el README.
3. **Fidelidad**: `DATA_SOURCES.md` es 1:1 con el código (verificado por script en CI).
4. **Tipos**: 0 `any` en `src/services/**` y `src/state/**`.
5. **Performance**: Lighthouse Performance mobile ≥ 85.
6. **i18n**: toggle ES/EN funcional; 0 strings hardcoded en español en `data/categories.ts`.
7. **Robustez**: si el dashboard detecta `global-warming.org` caído, 6/6 métricas siguen visibles vía fallback directo.
8. **Docs**: `MASTER_PLAN.md` (este archivo) con tracking de cada P0/P1 resuelto.

---

*Autor: auditoría interna. Próxima revisión recomendada: 1 de mayo 2026 con retro del sprint 1 y ajuste de prioridades.*
