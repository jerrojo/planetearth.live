# planetearth.live

**Live, open-source visualization of the Earth's health.**

planetearth.live is a real-time 3D dashboard of the planet's vital signs — atmosphere, oceans, ice, biosphere, seismic activity, air quality — built from open public data feeds (NOAA, NASA, USGS, Copernicus, Open-Meteo, Argo, OpenAQ, Global Forest Watch, GBIF, National Grid ESO). Every on-screen number is sourced, timestamped, and traceable back to the agency that produced it.

Live at: **[planetearth.live](https://planetearth.live)**

## What it is — and isn't

**It is.** A thin visualization layer over public scientific APIs. Every value is fetched client-side, passed through a named runtime validator, labelled with provenance (source, URL, timestamp, latency, cadence), and downloadable as CSV or JSON.

**It isn't.** A data producer. The agencies are authoritative. Cite them, not us.

The project's editorial stance is explicit: **state, don't persuade.** Numbers, baselines, uncertainty. No campaigns, no op-eds, no sponsored content. See [GOVERNANCE.md](GOVERNANCE.md).

## What you see

- A 3D globe with real biomes, land/ocean masks, cities, day/night terminator, and measurement stations (NOAA buoys, tide gauges, Argo floats, GHG sites, solar radiation stations, biodiversity hotspots).
- A live dashboard backed by 15+ public APIs: atmospheric CO₂ / CH₄ / N₂O, global temperature anomaly, Arctic sea-ice extent, global and local sea level, PM2.5 (blended CAMS + OpenAQ), Kp index, earthquakes (M4.5+), UK grid carbon intensity, tropical tree-cover loss, UV index, biodiversity observations.
- A **data-status panel** (bottom-left) that shows every metric's current source, timestamp, age, latency, and validator status (`ok` / `stale` / `invalid` / `offline` / `pending`). One-click **CSV/JSON export** of the full snapshot with attribution.
- A language toggle (ES / EN) driven by `?lang=en` or a11y controls. Accessibility controls for text size, reduced motion, and high contrast.
- 12 categories of planetary impact with 120 science-backed actions — see [docs/FRAMEWORK.md](docs/FRAMEWORK.md).

## Why open source

Climate data is often dismissed as "politicized" or "cherry-picked." When the entire pipeline — every fetch URL, every transformation, every visualization — is public and auditable, that argument disappears. You can:

- Read the exact API endpoint in `src/services/api-client.ts`.
- Follow the URL to the originating agency (NOAA, NASA, USGS, etc.).
- Inspect the runtime validator and sanity bounds in `src/services/validation.ts`.
- Export the full snapshot (schemaVersion=1) from the data-status panel.
- Fork the project and point it at a different data source to confirm the numbers match.
- Add new monitoring feeds by opening an issue with the `new-source` template.

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

- `npm run typecheck` — TypeScript strict check.
- `npm run build` — typecheck + production build to `dist/`.
- `npm run preview` — serve the production build.
- `npm test` — run unit tests (Vitest).
- `npm run test:coverage` — Vitest with v8 coverage (floor thresholds enforced).
- `npm run test:e2e` — Playwright smoke tests across Chromium / Firefox / WebKit / iPhone.
- `npm run audit` — `npm audit` on runtime dependencies (runs in CI on every PR).
- `npm run verify` — typecheck + test + build (run before opening a PR).

## Contribute

The project is most valuable when it covers more of the Earth's systems. The easiest way to help is to add a new public data feed — for example ocean pH, permafrost temperature, glacier mass balance, cyclone counts, species population indices, or water stress indicators.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for how to wire a new source into the dashboard, and [GOVERNANCE.md](GOVERNANCE.md) for the review criteria we apply to new sources, new baselines, and breaking changes. Open issues with the `new-source`, `data-anomaly`, or `bug` templates under `.github/ISSUE_TEMPLATE/`.

## Stack

- **Vite 6 + TypeScript 5.7 (strict)** — zero-config, fast dev loop, typed end-to-end.
- **Three.js** — WebGL globe, particles, atmospheric effects.
- **Vitest 2 + Playwright** — unit tests with v8 coverage, cross-browser E2E smoke tests.
- **No runtime analytics, no tracking, no backend** — see [PRIVACY.md](PRIVACY.md).

Zero-dependency i18n, zero-dependency runtime validation (no zod), zero-dependency provenance registry. Total runtime bundle ≤ 250 kB gzipped (dominated by Three.js).

## Institutional trust surface

Every one of these is a first-class, reviewable document in the repository:

- [METHODOLOGY.md](docs/METHODOLOGY.md) — per-metric source, baseline, cadence, sanity bounds, reproducibility.
- [ATTRIBUTION.md](ATTRIBUTION.md) — suggested citations for every agency, with DOIs.
- [GLOSSARY.md](docs/GLOSSARY.md) — short definitions of the scientific terms used on screen.
- [FAQ.md](docs/FAQ.md) — questions from climate scientists, NGOs, and developers.
- [SECURITY.md](SECURITY.md) — CSP-hardened bundle, report at security@planetearth.live.
- [PRIVACY.md](PRIVACY.md) — "collects nothing about you", with an inventory of what's stored locally.
- [GOVERNANCE.md](GOVERNANCE.md) — maintainer roles, decision process, disagreement resolution.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Contributor Covenant 2.1 with scientific-integrity clause.
- [TERMS.md](TERMS.md) — terms of use and the limits of our liability.
- [CHANGELOG.md](CHANGELOG.md) — every change that alters what's shown on screen.

## Documentation

- [docs/FRAMEWORK.md](docs/FRAMEWORK.md) — the 12 categories and 120 actions in detail.
- [docs/IMPACT_MODEL.md](docs/IMPACT_MODEL.md) — the scoring methodology behind each action.
- [docs/SYSTEMS_MAP.md](docs/SYSTEMS_MAP.md) — how the 12 systems interact with each other.
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) — every live feed used by the visualization.
- [docs/METHODOLOGY.md](docs/METHODOLOGY.md) — per-metric methodology and bounds.
- [docs/GLOSSARY.md](docs/GLOSSARY.md) — scientific glossary.
- [docs/FAQ.md](docs/FAQ.md) — FAQ for scientists, NGOs, and developers.
- [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) — roadmap and session logs.
- [docs/vision/MANIFESTO.md](docs/vision/MANIFESTO.md) — the original manifesto that motivated the project.

## License

MIT. See [LICENSE](LICENSE). Data belongs to the originating agencies and is used under their respective public-data terms — see [ATTRIBUTION.md](ATTRIBUTION.md).
