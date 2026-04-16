# planetearth.live

**Live, open-source visualization of the Earth's health.**

planetearth.live is a real-time 3D dashboard of the planet's vital signs — atmosphere, oceans, ice, biosphere, seismic activity, air quality — built from open public data feeds (NOAA, NASA, USGS, Copernicus, Open-Meteo, Argo, OpenAQ, Global Forest Watch, and more).

The goal is simple: **remove the debate about whether the planet is in trouble by letting the data speak for itself.** Every number on screen is traceable to its source in the code. Every source is a public scientific agency. Nothing is modeled, estimated, or editorialized — it is what the sensors report, right now.

Live at: **[planetearth.live](https://planetearth.live)**

## What you see

- A 3D globe with real biomes, real land/ocean masks, real cities, real day/night terminator, and real measurement stations (NOAA buoys, tide gauges, Argo floats, GHG sites, solar radiation stations, biodiversity hotspots).
- A live dashboard pulling from 15+ public APIs: atmospheric CO₂, CH₄, N₂O, global temperature anomaly, Arctic sea ice, sea level, PM2.5, Kp index, earthquakes (M4.5+), carbon intensity of electricity, tree cover loss, and more.
- 12 categories of planetary impact (atmosphere, water, biodiversity, food, energy, materials, health, knowledge, economy, governance, resilience, consciousness) with 120 science-backed actions — both global and personal — that the research says move the needle.

## Why open source

Climate data is often dismissed as "politicized" or "cherry-picked." When the entire pipeline — every fetch URL, every transformation, every visualization — is public and auditable, that argument disappears. You can:

- Read the exact API endpoint in `src/services/api-client.ts`.
- Follow the URL to the originating agency (NOAA, NASA, USGS, etc.).
- Fork the project and point it at a different data source to confirm the numbers match.
- Add new monitoring feeds so the picture gets more complete over time.

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for the full catalogue.

## Run it locally

Requirements: Node.js 20+ and npm.

```
git clone https://github.com/jerrojo/planetearth.live.git
cd planetearth.live
npm install
npm run dev
```

Open http://127.0.0.1:3333.

Other scripts:

- `npm run build` — TypeScript check + production build to `dist/`
- `npm run preview` — serve the production build
- `npm test` — run unit tests (Vitest)
- `npm run test:e2e` — run visual regression tests (Playwright)

## Contribute

The project is most valuable when it covers more of the Earth's systems. The easiest way to help is to add a new public data feed — for example ocean pH, permafrost temperature, glacier mass balance, cyclone counts, species population indices, or water stress indicators.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for how to wire a new source into the dashboard.

Other good contributions:

- New measurement-station networks (see `src/data/measurement-stations.ts`).
- Translations (currently Spanish/English).
- Accessibility improvements.
- Performance optimizations for low-end devices.

## Stack

- **Vite + TypeScript** — zero-config, fast dev loop.
- **Three.js** — WebGL globe, particles, atmospheric effects.
- **Vitest + Playwright** — unit and visual-regression tests.

No build-time data. Everything is fetched live in the browser from public endpoints, with graceful fallbacks when a source is unreachable.

## Documentation

- [docs/FRAMEWORK.md](docs/FRAMEWORK.md) — the 12 categories and 120 actions in detail.
- [docs/IMPACT_MODEL.md](docs/IMPACT_MODEL.md) — the scoring methodology behind each action.
- [docs/SYSTEMS_MAP.md](docs/SYSTEMS_MAP.md) — how the 12 systems interact with each other.
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) — every live feed used by the visualization.
- [docs/vision/MANIFESTO.md](docs/vision/MANIFESTO.md) — the original manifesto that motivated the project.

## License

MIT. See [LICENSE](LICENSE). Data belongs to the originating agencies and is used under their respective public-data terms.
