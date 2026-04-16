# Methodology

This document describes, for every metric shown on **planetearth.live**, exactly how it gets from the originating sensor/satellite/station to the pixel on screen. It is aimed at climate scientists, data engineers, and institutional auditors (NGO, government, academic) who need to judge whether the dashboard is trustworthy enough to cite, embed, or build on.

The short version: every number on screen is fetched **live** from a public agency API, validated by a named runtime validator (`src/services/validation.ts`), timestamped, and displayed next to an auditable provenance record. **Nothing is modelled, estimated, or editorialized.**

This document is versioned with the source code. Any change to how a metric is sourced, transformed, or labelled must accompany a change here in the same pull request.

## Design principles

1. **Agency-primary.** We prefer the original agency endpoint over an aggregator. When we use an aggregator (e.g. `global-warming.org` for NOAA/NASA/NSIDC series) it is because the agency endpoint lacks CORS and we document the dependency explicitly.
2. **No modelling in the browser.** The client never reconstructs, interpolates, or extrapolates values. If we show a trend, it is the trend the agency publishes.
3. **Fail visibly.** When a source is down, invalid, or stale, the UI says so — it does not silently substitute a plausible number. See `src/services/provenance.ts`.
4. **Bounds check, don't impute.** Every value is checked against a physically plausible range (see §Sanity bounds). Out-of-bounds values are rejected with a reason, not clipped.
5. **Cache is a labelled fallback, never the primary.** Values from `src/services/cache.ts` only render when a live fetch has failed, and the UI shows the age.
6. **No PII, no surveillance.** The app collects nothing about the reader. See [PRIVACY.md](../PRIVACY.md).

## Per-metric specification

Each row below documents: the variable, the agency, the endpoint, the units, the cadence guaranteed by the agency, the validator, the sanity bounds, and any transformation we apply. Sanity bounds are cited individually; the central references are IPCC AR6 WG1, NOAA GML, NSIDC, WMO, and WHO 2021.

### Atmosphere

#### CO₂ concentration (ppm)

- **Agency:** NOAA Global Monitoring Laboratory (Mauna Loa, Keeling curve).
- **Aggregator:** `global-warming.org/api/co2-api` (CORS-enabled mirror).
- **Validator:** `validateCO2Response` (bounds 380–600 ppm).
- **Cadence:** daily (one value per day, typically 24-h lag).
- **Baseline:** 280 ppm (pre-industrial, ca. 1750).
- **Safe limit cited:** 350 ppm (Hansen et al., 2008, *Target Atmospheric CO₂*).
- **Transformation:** we use the `cycle` field, which is the seasonally-adjusted daily value. No smoothing applied on our side.
- **Uncertainty:** ±0.4 ppm (NOAA GML instrumentation uncertainty).

#### Methane (CH₄, ppb)

- **Agency:** NOAA Global Monitoring Laboratory (ESRL flask network).
- **Aggregator:** `global-warming.org/api/methane-api`.
- **Validator:** `validateMethaneResponse` (bounds 1500–2500 ppb).
- **Cadence:** monthly global mean.
- **Baseline:** 722 ppb (pre-industrial). Planetary-boundary proxy: ~1150 ppb (Steffen et al., 2015).
- **Transformation:** `average` field, unmodified.
- **Uncertainty:** ±1.1 ppb.

#### Nitrous oxide (N₂O, ppb)

- **Agency:** NOAA Global Monitoring Laboratory.
- **Aggregator:** `global-warming.org/api/nitrous-oxide-api`.
- **Validator:** `validateNitrousResponse` (bounds 280–400 ppb).
- **Cadence:** monthly global mean.
- **Baseline:** 270 ppb; planetary boundary 290 ppb (Steffen et al., 2015).
- **Transformation:** `average`, unmodified.
- **Uncertainty:** ±0.14 ppb.

#### Global temperature anomaly (°C)

- **Agency:** NASA GISS Surface Temperature Analysis v4 (GISTEMP).
- **Aggregator:** `global-warming.org/api/temperature-api`.
- **Validator:** `validateTemperatureResponse` (bounds −1 to +5 °C).
- **Cadence:** monthly.
- **Baseline:** 1951–1980 mean (GISTEMP convention). We do **not** rebase to 1850–1900; the value shown is the raw GISTEMP anomaly.
- **Safe limit cited:** +1.5 °C vs. pre-industrial (IPCC SR1.5, Paris Agreement). Note the baseline difference (1951–1980 vs. pre-industrial). We display the GISTEMP number and mention the Paris threshold in docs/FAQ.md.
- **Uncertainty:** ±0.08 °C (GISTEMP annual uncertainty envelope).

#### Kp planetary geomagnetic index (0–9)

- **Agency:** NOAA Space Weather Prediction Center.
- **Endpoint:** `services.swpc.noaa.gov/products/noaa-planetary-k-index.json`.
- **Validator:** `validateKpResponse` (bounds 0–9).
- **Cadence:** 3-hourly (eight values per UTC day).
- **Transformation:** we pick the most recent row. Aurora intensity in the globe scene is proportional to this value.

### Air quality

#### PM2.5 (µg/m³, blended)

- **Primary source:** Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo, three-city proxy (New York, Delhi, London).
- **Secondary source:** OpenAQ global station network (≥10 valid PM2.5 readings required).
- **Validator:** `validateAirQualityResponse` for CAMS; bounds 0–1000 µg/m³.
- **Cadence:** hourly.
- **Transformation:** CAMS values averaged across the three cities; if OpenAQ returns ≥10 stations the final value is a 60% station / 40% CAMS weighted mean (labelled as "blended" in the UI).
- **Reference:** WHO 2021 Air Quality Guideline — annual PM2.5 < 15 µg/m³.
- **Caveats:** neither source is a true global mean. The value is a proxy for "typical urban-exposure PM2.5". This is called out in the FAQ and in the metric tooltip.

#### US AQI (0–500)

- **Source:** Open-Meteo CAMS `us_aqi` field, averaged across the same three cities.
- **Validator:** clamped to 0–500 inside `validateAirQualityResponse`.
- **Reference:** EPA NAAQS tier breakpoints.

#### UV Index (0–16)

- **Agency:** Open-Meteo (GFS-driven UV model).
- **Endpoint:** `api.open-meteo.com/v1/forecast?daily=uv_index_max`.
- **Validator:** `validateUvResponse` (bounds 0–20).
- **Cadence:** 6-hourly.
- **Transformation:** three-latitude proxy (Mexico City tropical, NYC mid-lat, Sydney mid-lat south). Daily maximum, averaged.

### Cryosphere and oceans

#### Global sea-ice extent (10⁶ km²)

- **Agency:** NSIDC Sea Ice Index v3.0.
- **Aggregator:** `global-warming.org/api/arctic-api`.
- **Validator:** `validateArcticResponse` (bounds 0–30 Mkm²).
- **Cadence:** daily.
- **Baseline:** 1991–2020 monthly climatology (NSIDC convention).
- **Transformation:** we read the `value` and `anom` fields; the `-9999` sentinel is rejected.

#### Global mean sea level (mm since 1993)

- **Agency:** CSIRO + NOAA satellite altimetry.
- **Aggregator:** `global-warming.org/api/sea-level-api`.
- **Validator:** `validateSeaLevelGlobalResponse` (bounds −50 to +500 mm).
- **Cadence:** monthly.
- **Baseline:** 1993 (TOPEX/Poseidon start).

#### Local sea level — The Battery, NYC (m)

- **Agency:** NOAA CO-OPS, station 8518750 (oldest continuous US tide gauge, 1856-present).
- **Endpoint:** `api.tidesandcurrents.noaa.gov/api/prod/datagetter`.
- **Validator:** `validateSeaLevelLocalResponse` (bounds −10 to +10 m).
- **Cadence:** 6-minute.
- **Datum:** MSL, 1983–2001 NTDE epoch.
- **Long-term trend:** +2.87 mm/yr at this station (NOAA).

### Lithosphere

#### Earthquakes M4.5+ (last 30 days)

- **Agency:** USGS Earthquake Hazards Program.
- **Endpoint:** `earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson`.
- **Validator:** structural check on GeoJSON features; magnitudes bounded to −2…10.
- **Cadence:** live (USGS publishes within ~1 minute of detection).

A second feed (M2.5+/24 h, via `src/services/earthquake-feed.ts`) drives the finer-grained pulse-ring visualization on the globe.

### Biosphere

#### Tree cover loss (hectares/year, tropical top 5)

- **Agency:** University of Maryland / Global Forest Watch (Hansen et al.).
- **Endpoint:** `data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.11`.
- **Cadence:** annual.
- **Transformation:** sum of loss from 2022 onwards across Brazil, Indonesia, DRC, Colombia and Bolivia. This is a **representative proxy**, not a global total.

#### Biodiversity observations (records)

- **Agency:** GBIF.
- **Endpoint:** `api.gbif.org/v1/occurrence/count?basisOfRecord=HUMAN_OBSERVATION`.
- **Validator:** `validateGbifCountResponse` (bounds 10⁶–10¹⁰).
- **Cadence:** hourly.

### Energy

#### UK grid carbon intensity (gCO₂/kWh)

- **Agency:** National Grid ESO / University of Oxford.
- **Endpoint:** `api.carbonintensity.org.uk/intensity`.
- **Validator:** `validateCarbonIntensityResponse` (bounds 0–1500 gCO₂/kWh).
- **Cadence:** 30-minute.
- **Reference:** UK grid 2010 ≈ 500 gCO₂/kWh; 2025 ≈ 115; target <50 by 2035.
- **Caveat:** this is the UK grid, not a global number. Shown as an example of real-time decarbonisation progress — called out in the tooltip.

## Sanity bounds (central reference)

All runtime sanity bounds live in `BOUNDS` inside `src/services/validation.ts`. They are deliberately LOOSE — the goal is to reject "obviously broken" data (CO₂ = 0, PM2.5 = −1), not to enforce climatological precision. If observed data ever exceeds a bound, the correct response is to update the bound and ship a new release — not to silently widen the check.

## What we do *not* do

- **No climate modelling.** We never project, predict, or extrapolate future values. If an agency publishes a projection, we do not display it.
- **No politically-framed language.** We do not pick favourite baselines to dramatise anomalies.
- **No mixing of provenance.** We never combine numbers from incompatible agencies to form a "corrected" figure without labelling it as a blend.
- **No telemetry on readers.** The app reports zero data about visitors. See [PRIVACY.md](../PRIVACY.md).

## Reproducing any value on screen

1. Open the data-source status panel at the bottom-left of the page.
2. Find the metric; copy the URL shown.
3. Fetch it yourself (`curl`, `wget`, or a browser). The raw value will match what the dashboard displays (modulo staleness and OpenAQ blending, both disclosed in the panel).
4. If you find a mismatch, open an issue at <https://github.com/jerrojo/planetearth.live/issues> with the URL, the agency response, and what the dashboard showed. We treat such reports as P0.

## Review cadence

This document is reviewed every six months by the maintainers. The review is logged at the top of [CHANGELOG.md](../CHANGELOG.md). Contributors proposing a new data source must update this document and [DATA_SOURCES.md](./DATA_SOURCES.md) in the same pull request.
