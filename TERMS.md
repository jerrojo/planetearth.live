# Terms of use

planetearth.live is a free, open-source visualization layer over public scientific data. Use it, fork it, embed it, cite the agencies. These terms describe how the project is made available and the limits of our responsibility.

## The source code

The planetearth.live codebase is released under the **MIT License** (see `LICENSE`). You may use, copy, modify, merge, publish, and distribute the code, including for commercial purposes, provided you retain the copyright and licence notice.

Forking the code does not transfer:
- The `planetearth.live` trademark, name, or domain.
- The right to imply an endorsement by the project.
- Rights over the data fetched by the code, which remain with the originating agencies.

## The data

planetearth.live does not own the data it displays. Every value is fetched in real time from a public scientific agency or aggregator. Reuse of those values is governed by each agency's own terms:

- NOAA (CO₂, CH₄, N₂O, Kp index, sea-level, tide-gauge): U.S. federal public-domain works.
- NASA GISTEMP: citation requested (see `ATTRIBUTION.md`).
- NSIDC Sea Ice Index v3: free for research with citation (doi:10.7265/N5K072F8).
- Copernicus CAMS via Open-Meteo: CC-BY-4.0.
- OpenAQ: CC-BY-4.0.
- USGS earthquake feeds: U.S. federal public-domain works.
- Global Forest Watch / Hansen et al. 2013: CC-BY-4.0 with citation.
- GBIF: CC-BY-4.0 with citation.
- National Grid ESO Carbon Intensity API: UK Open Government Licence v3.
- Natural Earth cultural vectors: public domain.
- UN DESA population data: citation requested.

If you redistribute values you saw on planetearth.live — in a report, a paper, a press release, a dashboard — cite the originating agency, not us. See `ATTRIBUTION.md` for suggested citation formats.

## No warranty

planetearth.live is provided **"as is"**, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.

In particular:
- We do not warrant that any number shown on the site is correct. We warrant only that it is what the cited agency returned at the time stamped in the provenance record.
- We do not warrant that the site will be available at any given time.
- We do not warrant that the documented cadence of each metric will be met — that depends on the agency.

## Limitation of liability

In no event shall the maintainers or contributors of planetearth.live be liable for any claim, damages, or other liability arising from the use of the project or of any value reproduced from the project. In particular, we are not liable for:

- Decisions made on the basis of a number shown on the site.
- Loss or damage caused by a stale, invalid, or cached fallback value that was labelled as such.
- Loss or damage caused by an upstream agency outage or data revision.

If you are making a decision of material consequence — an evacuation order, a policy proposal, a financial instrument, an operational threshold — **do not rely on planetearth.live**. Fetch the number directly from the agency, verify it against their published uncertainty interval, and cite them.

## Acceptable use

You may not use planetearth.live or the hosted site to:

- Generate automated traffic that degrades the service for other readers (the 30-minute client-side refresh is the intended cadence; do not override it).
- Republish the site under a name, domain, or branding that implies official agency endorsement.
- Misrepresent the provenance, baseline, or uncertainty of a number shown on the site — in particular by stripping the data-status panel, the per-metric citations, or the baselines label.
- Embed the site inside an advertising or tracking wrapper that collects data from visitors (the project collects nothing and would not be credibly described as an "analytics surface").

## Embedding and attribution

You may embed planetearth.live on your own site via `<iframe>`. We ask that the embedding page:
- Keep the data-status panel visible (it is the project's trust signal).
- Link to the source at `https://planetearth.live`.
- Not overlay third-party advertising on top of the embedded frame.

## Changes

These terms may be revised. The date of the most recent revision is recorded in the Git history for this file. Material changes will be called out in `CHANGELOG.md`.

## Contact

Questions about these terms: **hello@planetearth.live**.
