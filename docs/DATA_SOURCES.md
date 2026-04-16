# Data Sources

Every live metric shown in planetearth.live comes from a public scientific agency. Below is the complete catalogue. Each source links to its official page so you can verify the number on screen against the primary record.

If a source is unreachable at load time, the dashboard falls back to the last cached value and marks the metric as stale. Nothing on screen is simulated or generated.

## Atmosphere

| Metric | Agency / Source | Endpoint | Units | Cadence |
|---|---|---|---|---|
| CO₂ concentration | NOAA Mauna Loa (via global-warming.org) | `global-warming.org/api/co2-api` | ppm | daily |
| CH₄ (methane) | NOAA ESRL (via global-warming.org) | `global-warming.org/api/methane-api` | ppb | monthly |
| N₂O (nitrous oxide) | NOAA ESRL (via global-warming.org) | `global-warming.org/api/nitrous-oxide-api` | ppb | monthly |
| Global temperature anomaly | NASA GISS (via global-warming.org) | `global-warming.org/api/temperature-api` | °C vs 1951-1980 mean | monthly |
| Kp geomagnetic index | NOAA Space Weather Prediction Center | `services.swpc.noaa.gov/products/noaa-planetary-k-index.json` | 0-9 scale | 3-hour |

## Air quality

| Metric | Agency / Source | Endpoint | Units | Cadence |
|---|---|---|---|---|
| PM2.5 (3-city proxy) | Copernicus CAMS via Open-Meteo | `air-quality-api.open-meteo.com/v1/air-quality` | µg/m³ | hourly |
| PM2.5 (global station network) | OpenAQ | `api.openaq.org/v3/latest` | µg/m³ | near-real-time |
| Multi-city temperature | Open-Meteo | `api.open-meteo.com/v1/forecast` | °C | hourly |

## Cryosphere & Oceans

| Metric | Agency / Source | Endpoint | Units | Cadence |
|---|---|---|---|---|
| Arctic sea ice extent | NSIDC (via global-warming.org) | `global-warming.org/api/arctic-api` | 10⁶ km² | daily |
| Global mean sea level | CSIRO / NOAA (via global-warming.org) | `global-warming.org/api/sea-level-api` | mm since 1993 | monthly |
| Local sea level — The Battery, NYC | NOAA CO-OPS station 8518750 | `api.tidesandcurrents.noaa.gov` | m (MSL datum) | 6-minute |
| Argo float network | Euro-Argo | `fleetmonitoring.euro-argo.eu/api/v1/float` | position & profile metadata | live |

## Lithosphere

| Metric | Agency / Source | Endpoint | Units | Cadence |
|---|---|---|---|---|
| Earthquakes M4.5+ (30 days) | USGS Earthquake Hazards Program | `earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson` | magnitude, lat/lon, depth | live |

## Biosphere

| Metric | Agency / Source | Endpoint | Units | Cadence |
|---|---|---|---|---|
| Tree cover loss (top 5 tropical countries) | University of Maryland / Global Forest Watch | `data-api.globalforestwatch.org/dataset/umd_tree_cover_loss` | hectares lost | annual |
| Biodiversity hotspots | IUCN / Critical Ecosystem Partnership Fund | hardcoded in `src/data/biodiversity-hotspots.ts` | polygons | reference |

## Hazards & Events

| Metric | Agency / Source | Endpoint | Units | Cadence |
|---|---|---|---|---|
| Natural event tracker | NASA EONET v3 | `eonet.gsfc.nasa.gov/api/v3/events?status=open` | event metadata | live |

## Energy & Electricity

| Metric | Agency / Source | Endpoint | Units | Cadence |
|---|---|---|---|---|
| UK grid carbon intensity | National Grid ESO / Univ. of Oxford | `api.carbonintensity.org.uk/intensity` | gCO₂ / kWh | 30-min |

## Measurement-station networks (reference layers)

| Network | Agency | File | Count |
|---|---|---|---|
| Greenhouse-gas observatories | NOAA GML | `src/data/measurement-stations.ts` (`GHG_STATIONS`) | hardcoded |
| Surface radiation budget | NOAA SURFRAD | `src/data/measurement-stations.ts` (`SOLAR_STATIONS`) | hardcoded |
| NDBC buoys (fallback) | NOAA NDBC | `src/data/measurement-stations.ts` (`BUOY_STATIONS`) | hardcoded |
| NDBC buoys (live) | NOAA NDBC | `ndbc.noaa.gov/activestations.xml` | ~1,200 |
| Tide gauges | NOAA CO-OPS | `api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json` | ~200 |
| Argo floats | Euro-Argo | `fleetmonitoring.euro-argo.eu/api/v1/float` | ~4,000 |

## Reference data (not live)

| Dataset | Source | File |
|---|---|---|
| World population (projections) | UN World Population Prospects | `src/config/constants.ts` |
| Cities (for night-lights layer) | Natural Earth | `src/data/cities.ts` |
| Historical climate milestones | Various — see inline citations | `src/data/historical.ts` |
| Impact categories & actions | Synthesis of peer-reviewed literature — see `docs/FRAMEWORK.md` | `src/data/categories.ts` |

## Adding a new source

See [CONTRIBUTING.md](../CONTRIBUTING.md#how-to-add-a-new-data-source). The bar: public, reputable, live, CORS-enabled, documented. New sources should be added to this catalogue as part of the same pull request.

## Caveats

- `global-warming.org` is a convenience aggregator that re-serves NOAA / NASA / NSIDC data with CORS enabled. The underlying numbers are the agency's, but the aggregator could in principle become stale or disappear. Long-term we plan to migrate each metric to a direct endpoint where possible.
- `Open-Meteo` multi-city averages are a proxy for "global-ish" air quality and temperature, not an official global mean. They are labelled as such in the UI.
- Some agencies rate-limit or geo-restrict their endpoints. Report any `429` / `403` responses in the [issue tracker](../../issues).
