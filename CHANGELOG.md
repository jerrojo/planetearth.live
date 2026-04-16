# Changelog

All notable changes to planetearth.live are recorded here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: the project ships a single rolling v2.x while on the public-data beta; the export snapshot schema carries its own `schemaVersion`.

## [Unreleased]

## [2.1.0] — 2026-04-16

Second major remediation pass. Elevates the project from "solid hobby" to institutional-trust surface — every number on screen now carries named provenance, labelled fallback, and a reproducible export trail.

### Added
- **Runtime validation layer** (`src/services/validation.ts`). 13 named per-agency validators with published sanity bounds citing IPCC AR6, NOAA GML, NSIDC, WHO 2021. Zero runtime dependencies (saves ≈13 kB vs zod).
- **Per-metric provenance registry** (`src/services/provenance.ts`). Every fetch writes `{ id, source, url, value, fetchedAt, latencyMs, cadence, staleAfterMs, status, reason }`. Status transitions: `pending → ok → stale | invalid | offline`.
- **Labelled offline fallback cache** (`src/services/cache.ts`). IndexedDB + localStorage + in-memory. `loadFallback(id, maxAgeMs)` never returns an unlabelled value.
- **Local telemetry buffer** (`src/services/telemetry.ts`). 500 events, subscriber pattern, no network sink.
- **Snapshot export** (`src/services/export.ts`). Reproducible CSV and JSON with `schemaVersion: 1`, attribution, and per-row source/URL/timestamp.
- **Data-status panel** (`src/ui/components/data-status.ts`). Toggle + live table of every metric with colour-coded status badge, age, latency, URL, reason. CSV/JSON export buttons.
- **Dependency-free i18n** (`src/i18n/*`). Spanish + English dictionaries (30+ keys), `{name}`-style interpolation, URL / localStorage / html-lang / navigator detection, `applyStaticI18n` rewrites `data-i18n` / `data-i18n-aria` / `data-i18n-title` attributes.
- **Language switcher** injected into the accessibility panel; persists to `localStorage` (`pel:locale`).
- **JSON-LD schema.org `Dataset` markup** in `index.html` with `variableMeasured`, `measurementTechnique`, CSV + JSON distributions, licence — crawlable by Google Dataset Search.
- **Institutional documentation suite**: `SECURITY.md`, `PRIVACY.md`, `CODE_OF_CONDUCT.md`, `ATTRIBUTION.md`, `GOVERNANCE.md`, `TERMS.md`, `docs/METHODOLOGY.md`, `docs/GLOSSARY.md`, `docs/FAQ.md`, this `CHANGELOG.md`, `REVIEWERS.md`.
- **GitHub intake surface**: `.github/ISSUE_TEMPLATE/bug.md`, `data-anomaly.md`, `new-source.md`, `config.yml`, plus `.github/PULL_REQUEST_TEMPLATE.md` with methodology/attribution/CSP checklist.
- **Security headers**: `public/_headers` (Netlify / Cloudflare Pages) and `vercel.json` with strict CSP (`connect-src` allowlist per agency), HSTS with `preload`, `X-Frame-Options: DENY`, strict Referrer-Policy, Permissions-Policy disabling geolocation/camera/microphone/payment, COOP/CORP `same-origin`.
- **Playwright E2E smoke tests** (`tests/e2e/smoke.spec.ts`) across Chromium / Firefox / WebKit / iPhone — boot, canvas render, status panel, locale toggle, keyboard navigation.
- **Vitest coverage** (`@vitest/coverage-v8`) with floor thresholds (lines 70 / branches 60) so regressions fail CI.
- **New unit test suites**: `validation.test.ts` (27), `provenance.test.ts` (10), `i18n.test.ts` (12), `cache.test.ts` (7), `export.test.ts` (6). Total test count now **101** across 10 files.
- **CI workflow rewrite** (`.github/workflows/ci.yml`): `verify` matrix (Node 20 + 22) → `audit` (runtime deps only) → `e2e` (Playwright on PRs). Coverage artefact uploaded.
- `package.json` scripts: `typecheck`, `test:coverage`, `audit`, `verify`.

### Changed
- `src/services/api-client.ts` — complete refactor. Every fetch now runs through a named validator, records provenance, writes to the cache on success, and serves a clearly labelled fallback on failure. Public API surface (`LiveDataResult`, `NaturalEvent`, `getStatusText`) preserved.
- `index.html` — `meta referrer`, `hreflang` alternates (`es`, `en`, `x-default`), full `data-i18n` attribute coverage.
- `README.md` — documents the new institutional surface, scripts, and trust documents.
- `CONTRIBUTING.md` — rewritten around the validator/provenance/CSP workflow.
- `docs/MASTER_PLAN.md` — added Session 2 execution log at the top.

### Fixed
- `src/i18n/index.ts` now re-exports `LOCALES`, `DEFAULT_LOCALE`, `DICTS`, and the `Locale` / `StringKey` types so the accessibility panel can import them from `../../i18n` without reaching into the dictionaries module.

### Security
- Strict CSP with no `unsafe-inline` on `script-src`. Inline styles retained only for Three.js shader code strings (reviewed case-by-case — documented in `SECURITY.md`).
- `npm audit --omit=dev` is now a required CI check; high-severity findings fail the build.

---

## [2.0.0] — 2026-04-16 (Session 1)

Initial hardening pass: type-safe API-client interfaces, retry with exponential backoff + jitter, `MetricId` and `CategoryId` enums, font fallback stack, locale-aware number formatting, first test suites (39 tests), initial CI pipeline. See `docs/MASTER_PLAN.md` for the full Session 1 log.
