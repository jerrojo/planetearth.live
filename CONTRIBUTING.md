# Contributing to planetearth.live

Thanks for your interest. The most valuable contributions to this project are **new data sources** that expand what the visualization can show about the Earth's health — but accessibility work, translations, security hardening, and performance improvements are equally welcome.

Start with [`GOVERNANCE.md`](GOVERNANCE.md) for the editorial stance (state, don't persuade; political neutrality; privacy by construction) and the decision process we apply to different classes of change.

## The bar for a new data source

A good data source for planetearth.live is:

1. **Public.** No API key should be required, or if one is, it should be free, unlimited, and obtainable in under a minute.
2. **From a reputable institution.** Government agency (NOAA, NASA, USGS, ESA, EEA, WHO, UN), established scientific body (IPCC, WMO, IUCN), or a research platform with transparent methodology (Global Forest Watch, OpenAQ, Argo, Copernicus).
3. **Live or near-live.** Updated at least daily, ideally hourly or streaming. Historical-only datasets belong in `docs/` as references, not on the dashboard.
4. **CORS-enabled** for browser fetches. Everything runs client-side — there is no backend. If a source blocks CORS from the browser, it can still be useful via a build-time snapshot, but prefer live CORS-open endpoints.
5. **Documented.** The source must have a public page describing what the numbers mean, the sensor/method, the units, and the update cadence.
6. **Methodologically defensible.** A canonical peer-reviewed or official reference must exist. See `docs/METHODOLOGY.md` for the style we expect.

Open an issue using the `.github/ISSUE_TEMPLATE/new-source.md` template before writing code — the intake checklist there is the fastest way to surface blockers.

## How to add a new data source

1. **Add the fetch.** Open `src/services/api-client.ts`. Add a new entry to the `Promise.allSettled` block with a clear comment: what the metric is, which agency owns it, a link to the documentation page, and the units.
2. **Write a named runtime validator.** Add it to `src/services/validation.ts`. The validator must check shape, coerce numbers where appropriate, and enforce published sanity bounds. Add the bound to the `BOUNDS` table with a source-citing comment. A failing validator MUST not crash the app — it returns a `ValidationResult` that the caller turns into a labelled fallback.
3. **Register provenance.** Add a `registerProvenance({ id, label, unit, source, originalSource, url, cadence, staleAfterMs })` entry to `registerDefaultProvenance()` in `src/services/provenance.ts`. This is what makes the metric visible in the data-status panel and in the CSV/JSON export.
4. **Type it and wire it into state.** Add the field to `LiveDataResult` and update `src/state/live-data.ts`.
5. **Visualize it.** Either add a card to the dashboard (`src/ui/components/dashboard.ts`) or tie the metric to a visual channel on the globe — colour, particle density, station glow, etc.
6. **Fail gracefully.** The app must still render correctly if your new endpoint is down. Use `try/catch`, `Promise.allSettled`, sensible defaults, and never throw from a fetch. The provenance panel must label the fallback clearly (`offline` or `stale`).
7. **Document it.** Update these in the same PR:
   - `docs/DATA_SOURCES.md` — the agency, URL, metric, units, update cadence.
   - `docs/METHODOLOGY.md` — baseline, validator, uncertainty, reproducibility note.
   - `ATTRIBUTION.md` — suggested citation, DOI if available.
   - `docs/GLOSSARY.md` — any new scientific terms the UI exposes.
   - **CSP allowlist** — add the new endpoint origin to `connect-src` in **both** `public/_headers` (Netlify/Cloudflare Pages) and `vercel.json`.
8. **Add tests.** Unit tests for the validator (pass + fail cases) in `tests/unit/validation.test.ts`. A provenance registration assertion in `tests/unit/provenance.test.ts`.
9. **Verify end-to-end.** Run `npm run verify` (typecheck + unit tests + build) and, if the change has a UI surface, run `npm run test:e2e` to confirm the Playwright smoke tests still pass.

## How to add new measurement stations

Stations (buoys, tide gauges, GHG sites, solar stations, Argo floats, biodiversity hotspots) live in `src/data/measurement-stations.ts` and `src/data/biodiversity-hotspots.ts`. Each is a typed object with `{ id, name, lat, lon, type, agency, url }`. Add new ones in the same shape and they'll appear on the globe automatically via `station-markers.ts`.

## How to add a new language

1. Extend `Locale` and `LOCALES` in `src/i18n/dictionaries.ts`.
2. Add a full dictionary under `DICTS` for your language. Every `StringKey` must be present — the i18n module falls back to the default locale if a key is missing, but a partial dictionary is considered a bug.
3. Add a `<link rel="alternate" hreflang="..." href="..." />` tag in `index.html`.
4. Run `npm test` to confirm the dictionary-integrity tests still pass.

## Accessibility

All interactive controls must satisfy WCAG 2.2 AA:
- Keyboard-operable (Tab, Enter / Space, Escape to close).
- `aria-label` / `aria-labelledby` on any icon-only button.
- `role="radiogroup"` for segmented controls; `role="radio"` with `aria-checked` on the children.
- `data-i18n-aria` for translatable aria labels (avoids a separate mechanism).
- No `color`-only signalling — status badges carry text AND colour.
- Respect `prefers-reduced-motion` and the Reduced-Motion toggle.

Run `npm run test:e2e` before a PR touching UI — the Playwright smoke test asserts keyboard navigation reaches ≥3 focusable elements without trapping.

## Security

All external endpoints must be allowlisted in the CSP `connect-src` header (`public/_headers` and `vercel.json`, kept in sync). See [`SECURITY.md`](SECURITY.md) for the full posture and the responsible-disclosure channel.

Do not introduce:
- `innerHTML` with untrusted strings (use `textContent`).
- Inline scripts (the CSP forbids them).
- Third-party runtime scripts without Subresource Integrity.
- Any storage of user identifiers (no analytics, no cookies, no session tokens — see `PRIVACY.md`).

## Code style

- TypeScript, strict mode (no `any` unless you explain why in a comment).
- Pure functions where possible; no global state outside `src/state/` and the provenance / cache / telemetry registries.
- Keep renderer modules self-contained: each file exports a `create*` factory and an `update*` tick function. Don't reach into scene internals from other modules.
- Comments in English.
- No emoji in code or config files.

## Running locally

```
npm install
npm run dev            # http://127.0.0.1:3333
npm run typecheck      # tsc --noEmit
npm run build          # typecheck + production build
npm test               # Vitest unit tests
npm run test:coverage  # Vitest with v8 coverage (floors enforced)
npm run test:e2e       # Playwright smoke (Chromium/Firefox/WebKit/iPhone)
npm run audit          # npm audit --omit=dev
npm run verify         # typecheck + test + build
```

## Pull-request checklist

The `.github/PULL_REQUEST_TEMPLATE.md` file enforces the canonical checklist; the most common items are:

- [ ] New data source meets the 6 criteria above.
- [ ] Runtime validator added to `src/services/validation.ts`.
- [ ] Provenance entry registered in `src/services/provenance.ts`.
- [ ] CSP allowlist updated in both `public/_headers` and `vercel.json`.
- [ ] `docs/DATA_SOURCES.md`, `docs/METHODOLOGY.md`, `ATTRIBUTION.md`, `docs/GLOSSARY.md` updated in the same PR.
- [ ] New i18n strings added to **every** locale dictionary.
- [ ] `npm run verify` succeeds locally.
- [ ] Graceful fallback verified (temporarily block the endpoint and confirm the app still loads with the metric labelled `offline`).
- [ ] Screenshot attached if the change is visual.
- [ ] COI disclosure added to the PR body if you are affiliated with the source.

## Questions, ideas, corrections

Open an issue using one of the templates in `.github/ISSUE_TEMPLATE/`:

- `bug.md` — something on the site is broken.
- `data-anomaly.md` — a number looks scientifically wrong, or uses the wrong baseline.
- `new-source.md` — propose a new agency feed.

Data quality notes, methodology questions, and "this number looks wrong because X" reports are especially welcome — the whole point of the project is that every number should be defensible.

Security issues go to **security@planetearth.live**, not to public issues — see [`SECURITY.md`](SECURITY.md).
