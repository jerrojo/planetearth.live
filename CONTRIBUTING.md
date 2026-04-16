# Contributing to planetearth.live

Thanks for your interest. The most valuable contributions to this project are **new data sources** that expand what the visualization can show about the Earth's health. Every new feed makes the picture more complete and harder to dismiss.

## The bar for a new data source

A good data source for planetearth.live is:

1. **Public.** No API key should be required, or if one is, it should be free, unlimited, and obtainable in under a minute.
2. **From a reputable institution.** Government agency (NOAA, NASA, USGS, ESA, EEA, WHO, UN), established scientific body (IPCC, WMO, IUCN), or a research platform with transparent methodology (Global Forest Watch, OpenAQ, Argo, Copernicus).
3. **Live or near-live.** Updated at least daily, ideally hourly or streaming. Historical-only datasets belong in `docs/` as references, not on the dashboard.
4. **CORS-enabled** for browser fetches. Everything runs client-side — there is no backend. If a source blocks CORS from the browser, it can still be useful via a build-time snapshot, but prefer live CORS-open endpoints.
5. **Documented.** The source must have a public page describing what the numbers mean, the sensor/method, the units, and the update cadence.

## How to add a new data source

1. **Add the fetch.** Open `src/services/api-client.ts`. Add a new entry to the `Promise.allSettled` block with a clear comment: what the metric is, which agency owns it, a link to the documentation page, and the units.
2. **Type it.** Add the field to the `LiveDataResult` type at the top of the same file.
3. **Wire it into state.** Update `src/state/live-data.ts` so the new metric flows into the shared live-data store.
4. **Visualize it.** Either add a card to the dashboard (`src/ui/components/dashboard.ts`) or tie the metric to a visual channel on the globe — colour, particle density, station glow, etc.
5. **Fail gracefully.** The app must still render correctly if your new endpoint is down. Use `try/catch`, `Promise.allSettled`, sensible defaults, and never throw from a fetch.
6. **Document it.** Add a row to `docs/DATA_SOURCES.md` with the agency, URL, metric, units, and update cadence.
7. **Test it.** At minimum run `npm test` and `npm run build`. If the metric is shown visually, take a screenshot before/after and attach it to the PR.

## How to add new measurement stations

Stations (buoys, tide gauges, GHG sites, solar stations, Argo floats, biodiversity hotspots) live in `src/data/measurement-stations.ts` and `src/data/biodiversity-hotspots.ts`. Each is a typed object with `{ id, name, lat, lon, type, agency, url }`. Add new ones in the same shape and they'll appear on the globe automatically via `station-markers.ts`.

## Code style

- TypeScript, strict mode (no `any` unless you explain why in a comment).
- Pure functions where possible, no global state outside `src/state/`.
- Keep renderer modules self-contained: each file exports a `create*` factory and an `update*` tick function. Don't reach into scene internals from other modules.
- Comments in English.

## Running locally

```
npm install
npm run dev        # http://127.0.0.1:3333
npm run build      # TypeScript check + production build
npm test           # Vitest unit tests
npm run test:e2e   # Playwright visual regression
```

## Pull-request checklist

- [ ] New data source meets the 5 criteria above.
- [ ] `docs/DATA_SOURCES.md` updated.
- [ ] `npm run build` succeeds.
- [ ] `npm test` passes.
- [ ] Graceful fallback verified (temporarily block the endpoint and confirm the app still loads).
- [ ] Screenshot attached if the change is visual.

## Questions, ideas, corrections

Open an issue. Data quality notes, methodology questions, and "this number looks wrong because X" reports are especially welcome — the whole point of the project is that every number should be defensible.
