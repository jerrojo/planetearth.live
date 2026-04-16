# Glossary

Short definitions of the scientific terms used on planetearth.live. These definitions reference the agency conventions we adopt — see [METHODOLOGY.md](METHODOLOGY.md) for per-metric details.

## Atmospheric composition

- **ppm / ppb / ppt.** Parts per million / billion / trillion by volume (equivalently, by moles of dry air). 1 ppm CO₂ = 1 molecule per million molecules of dry air.
- **CO₂ anomaly.** Difference between the current concentration and the pre-industrial baseline of ≈280 ppm (ca. 1750).
- **Keeling curve.** The continuous record of atmospheric CO₂ measured at Mauna Loa since 1958 by Charles David Keeling. The seasonal sawtooth reflects Northern Hemisphere photosynthesis.
- **CH₄ (methane).** 2nd-most-potent greenhouse gas. 100-year global warming potential (GWP₁₀₀) ≈ 28 × CO₂.
- **N₂O (nitrous oxide).** Third-most-potent greenhouse gas. GWP₁₀₀ ≈ 265 × CO₂. Long atmospheric lifetime (~121 years).

## Temperature and baselines

- **Temperature anomaly.** Temperature difference from a stated reference period, expressed in °C. Not an absolute temperature.
- **GISTEMP baseline.** NASA GISS uses 1951–1980 as the reference period for its global surface temperature anomaly.
- **IPCC AR6 baseline.** IPCC Assessment Report 6 quotes changes relative to 1850–1900 ("pre-industrial") — different from GISTEMP by ≈+0.3 °C (this project states the baseline next to every number).
- **2.5th / 97.5th percentile range.** Standard 95% confidence interval convention used by most agencies we cite.

## Ocean and ice

- **MSL datum.** Mean Sea Level. NOAA CO-OPS uses the National Tidal Datum Epoch 1983–2001 as its standard MSL reference.
- **GMSL.** Global Mean Sea Level. The weighted average across all satellite altimetry tracks, corrected for land motion.
- **Sea-ice extent.** Area of ocean with ≥15% sea-ice concentration. NSIDC v3.0 convention.
- **Sea-ice anomaly.** Difference between current extent and the 1991–2020 monthly climatology (NSIDC convention).

## Air quality

- **PM2.5.** Particulate matter with aerodynamic diameter ≤ 2.5 µm, expressed in µg/m³.
- **WHO 2021 guideline.** Annual-mean PM2.5 < 15 µg/m³, 24-h mean < 45 µg/m³.
- **US AQI.** EPA Air Quality Index, a piecewise-linear transform of pollutant concentrations onto a 0–500 scale.
- **CAMS.** Copernicus Atmosphere Monitoring Service. ECMWF-operated global air-quality forecast system.
- **OpenAQ.** Global aggregator of public ground-station air-quality measurements.

## Space weather

- **Kp index.** Quasi-logarithmic, 0–9 scale of planetary geomagnetic disturbance computed every 3 hours. Kp ≥ 5 classifies as a geomagnetic storm.
- **Aurora oval.** The latitude band (typically 60–70° geomagnetic) where aurorae are most likely during quiet conditions. Expands equatorward during Kp storms.

## Energy

- **Carbon intensity.** Grams of CO₂ equivalent emitted per kWh of electricity generated. Lower is better.
- **National Grid ESO.** Electricity System Operator for Great Britain. Publishes real-time + 48-hour-ahead carbon intensity.
- **Net-zero grid target.** Target grid carbon intensity below which the electricity supply can be considered consistent with national net-zero commitments. UK operator target: <50 gCO₂/kWh by 2035.

## Biosphere

- **Tree cover loss (UMD).** Annual gross loss of tree-cover area, as detected by Landsat-derived classification (Hansen et al. 2013). Does not account for regrowth — the GFW site publishes separate net-change statistics.
- **Planetary boundary.** A quantitative threshold for a global environmental variable (land-system change, freshwater use, biogeochemical flows, ocean acidification, biosphere integrity, novel entities, stratospheric ozone, atmospheric aerosols, climate change) beyond which the Earth system is hypothesised to leave a Holocene-like state. Rockström et al. 2009; updated Steffen et al. 2015; Richardson et al. 2023.

## Earthquakes

- **Moment magnitude (Mw).** Logarithmic measure of seismic energy release, superseding the older Richter scale.
- **GeoJSON feed.** USGS publishes feeds at 1-minute / 5-minute / 15-minute / hourly / daily / 7-day / 30-day granularities; this project uses the 30-day M4.5+ and 24-hour M2.5+ feeds.

## Biodiversity

- **GBIF.** Global Biodiversity Information Facility — an intergovernmental network aggregating species occurrence records.
- **Human observation.** GBIF's `basisOfRecord=HUMAN_OBSERVATION` filter selects records where the evidence is a direct observation by a person (e.g. iNaturalist reports, eBird checklists) rather than specimens or machine classifications.

## Project conventions

- **Provenance record.** The full audit trail we attach to every on-screen number: source, URL, timestamp, validation status, latency. See `src/services/provenance.ts`.
- **Stale.** A metric whose most recent successful fetch is older than 2× the source's documented cadence.
- **Blended.** A value assembled from more than one source with stated weights (currently only PM2.5, which combines CAMS and OpenAQ 40/60).
- **Proxy.** A value that approximates a quantity we cannot measure globally in real time (e.g. the three-city PM2.5 average stands in for "typical urban PM2.5 exposure").
