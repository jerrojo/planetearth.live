# Frequently asked questions

This FAQ is written for the three groups of people most likely to evaluate planetearth.live: **climate scientists**, **NGOs and policy staff**, and **developers / data engineers**. If your question is not answered here, open an issue or email **hello@planetearth.live**.

## For climate scientists

### Are the numbers you show authoritative?
No — the **agencies** are authoritative. planetearth.live is a visualization layer. Every on-screen value carries a provenance record pointing at the originating source (NOAA, NASA, USGS, Copernicus CAMS, NSIDC, NOAA CO-OPS, Global Forest Watch, GBIF, National Grid ESO). For citation-grade use, fetch the source directly and cite the agency. The download buttons on the site produce CSV/JSON files that include the source URL and the exact fetch timestamp so reproducing the number is trivial.

### Which baseline do you use for temperature anomalies?
We quote the **GISTEMP 1951–1980** baseline because that is the baseline NASA GISS publishes. The IPCC AR6 convention is **1850–1900** (pre-industrial); the two differ by ≈+0.3 °C. Every anomaly on the site is labelled with the baseline that accompanied it. See `docs/METHODOLOGY.md` for the full discussion.

### How do you handle conflicting values between agencies?
For metrics where we blend more than one source (currently only surface PM2.5, which combines Copernicus CAMS model output with OpenAQ station averages), we state the blending weights explicitly (CAMS 40% / OpenAQ 60%) and label the value **"blended"** in the provenance panel. For every other metric, we pick one agency, cite it, and do not silently average with alternative sources.

### Do you publish uncertainty intervals?
Where the source publishes them, yes — we show the 95% interval (2.5th / 97.5th percentile) alongside the point estimate. For metrics where the agency publishes a point estimate only (e.g. UK grid carbon intensity), we state that explicitly in `docs/METHODOLOGY.md`.

### How fresh is each value?
Each metric has a documented **cadence** (how often the agency updates it) and a **stale-after** threshold (2× the cadence). The status panel shows a live **age** for every record and flips it to **"stale"** if we are past the threshold. Methane and N₂O, for example, are updated monthly by NOAA GML, so they stale after ~60 days. Kp index is updated every 3 hours, so it stales after 6 hours.

### Are you hiding downward-moving indicators to make the picture look worse?
No. We publish everything on the same footing, including indicators that currently trend in a favourable direction (e.g. UK grid carbon intensity, Montreal-Protocol-driven ozone recovery where relevant). The `CODE_OF_CONDUCT.md` explicitly flags misrepresentation of scientific evidence — in either direction — as a violation. The site's editorial stance is: show the numbers, cite the sources, explain the baselines, let the reader decide.

## For NGOs and policy staff

### Can we embed planetearth.live on our site?
Yes, it is MIT-licensed. The recommended embed is an `<iframe>` pointing at the public site, but you can also fork the repo, configure your own CDN, and run it at a subdomain. If you embed, please keep the per-metric source attribution visible (it already appears inline in the UI). See `ATTRIBUTION.md` for the full citation list.

### Can we cite you in a report?
Cite the **original agencies**, not us. For every number, the agency, their URL, and a timestamp are reachable from the provenance panel or the downloadable CSV/JSON snapshot. If for some reason you need to cite us, the suggested form is in `ATTRIBUTION.md`.

### Do you accept regional or country-specific data requests?
Yes, as GitHub issues. The project's preference is always **globally comparable indicators** first, with **representative local examples** to make the numbers tangible (the three-city PM2.5 average is an example). Country-level additions are reviewed against three criteria: (1) is there a canonical public agency for the number, (2) does it share comparability with what we already show, (3) does the agency have a stable API with documented uptime. See `GOVERNANCE.md` for the intake process.

### Is there a way to tell if the site is having a problem and I should not cite a number I just saw?
Open the **data status** panel (bottom-left corner of the site). Each row reports `ok` / `stale` / `invalid` / `offline` / `pending` plus the exact reason. Any status other than `ok` means the value is a labelled fallback and should not be cited without first checking the source.

### Do you plan to tell specific stories or run campaigns?
No. The project's editorial stance is **state, not persuade**. The site does not host op-eds, does not run campaigns, and does not accept sponsored content. If a story is best told by another publisher, we link to it; we do not replace it. This is explicit in `GOVERNANCE.md`.

## For developers and data engineers

### How big is the JavaScript bundle?
The runtime bundle is ≤ 250 kB gzipped, dominated by Three.js for the globe render. There is no analytics SDK, no runtime framework beyond Three, no tracking pixel, no ad script. See `SECURITY.md` for the dependency policy.

### Do you have an API?
Not a bespoke one — the project is a visualization over the agencies' APIs. If you want programmatic access to the exact set of values we show, download a snapshot (JSON or CSV) from the data status panel. The JSON schema is versioned (`schemaVersion: 1`); additive changes will not bump the major version.

### How do you validate incoming data?
Every agency response passes through a named validator in `src/services/validation.ts` before it is allowed to touch the UI. Validators check shape, coerce numeric strings, and enforce published sanity bounds (e.g. CO₂ must be in 380–600 ppm; Kp index must be in 0–9). If validation fails the value is rejected, a fallback is served, the fallback is labelled, and an entry is written to the telemetry buffer. See `docs/METHODOLOGY.md` for the full bounds table.

### What happens if an agency's API goes down?
Each metric has a documented **fallback cache** — the last-known-good value, kept in the browser's `IndexedDB` (and mirrored to `localStorage`). When the live fetch fails, we serve the cached value and flag the row as `offline` in the status panel. Nothing is served silently from cache — if we do not have a live value, the UI says so.

### Can I run the site offline?
After a single successful visit you can revisit the site offline and the last-known-good values will render, labelled as offline fallback. There is no service worker caching the bundle itself yet — that is on the hardening roadmap.

### How do you handle rate limits with upstream APIs?
The site fetches on load and then every 30 minutes. Refreshes are staggered so no two fetches land in the same tick. For CAMS (via Open-Meteo) and OpenAQ, the client batches stations into a single request where the API supports it. No server-side proxy is involved — all fetches originate directly from the user's browser to the agency endpoint.

### Why no backend?
Three reasons: **privacy** (nothing to log), **cost** (nothing to bill), **trust** (nothing between you and the agency). See `PRIVACY.md`. The trade-off is that rate-limit headroom belongs to the visitor, not to us — if an agency ever requires a server-side key for a metric we show, we will document it prominently.

### How do you measure accuracy over time?
Two mechanisms: (1) the CSV/JSON export is a timestamped snapshot, so you can diff snapshots between fetches to detect unexpected jumps, and (2) the telemetry buffer records validator failures (`fetch.invalid`), which is where an upstream shape change shows up first. We plan to publish a monthly **drift report** summarising validator failures over the previous 30 days — tracked in the hardening roadmap.

### Can I contribute a new source?
Yes. Open a GitHub issue using the `new-source.md` template. The intake checks: is the source a public agency (or a public aggregator of public-agency data), is there a documented API, is there a canonical peer-reviewed or official reference, does the metric extend our coverage without duplicating an existing indicator. See `GOVERNANCE.md` for the full review.

### Is the project looking for maintainers?
Always. Areas where an experienced contributor would make an immediate difference: (1) additional language translations, (2) accessibility review (WCAG 2.2 AA), (3) additional agency sources with the discipline documented in `METHODOLOGY.md`, (4) bundle size reduction, (5) visual rendering improvements on low-end GPUs. Contact hello@planetearth.live.

## General

### Who funds this?
Currently no one — it is maintained by volunteers. If the project ever accepts institutional funding, the funder, the amount, and the restriction (if any) will be published in `GOVERNANCE.md` in the same pull request that accepts the money.

### Why "planetearth.live"?
Because the values are live (refreshed every 30 minutes) and the project is about the planet. The domain was chosen to be explicit about both.
