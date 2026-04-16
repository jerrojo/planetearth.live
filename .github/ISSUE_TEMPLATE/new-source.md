---
name: New data source
about: Propose a new scientific data source to be added to planetearth.live
title: "[source] "
labels: new-source
---

## Summary

<!-- One paragraph. What metric would this add? Why does it belong on planetearth.live? -->

## Agency / publisher

- Organisation:
- Country / scope:
- Is this the canonical publisher of the metric? <!-- yes / no / explain -->
- Relationship to existing sources on the site (complementary / redundant / successor):

## Metric

- Name:
- Unit:
- Baseline / reference period (if applicable):
- Documented uncertainty interval:
- Cadence (how often it updates):
- Geographic coverage (global / regional / station):

## API

- Endpoint URL:
- Authentication (none / API key / OAuth):
- Rate limits:
- Documented uptime or SLA:
- Expected response shape (paste a small example below):

```
paste a sample response here
```

## Licence

- Terms of use URL:
- Attribution requirement:
- Redistribution allowed:
- Commercial use allowed:
- Is the licence compatible with client-side redistribution over a CC-BY-like attribution model?

## Methodological notes

<!--
Why this source and not a competing one? What is its peer-reviewed or official reference?
What are the known caveats (coverage gaps, preliminary vs final release, assimilation lag)?
If the value should be blended with another source, describe the weighting.
-->

## Intake checklist

- [ ] Source is a public scientific agency, or a public aggregator of public-agency data.
- [ ] Agency has a documented API.
- [ ] Agency has a canonical peer-reviewed or official reference.
- [ ] Metric extends the project's coverage without duplicating an existing indicator.
- [ ] Licence allows inclusion in the project.
- [ ] Sanity bounds can be grounded in a published source.
- [ ] The addition will update `docs/METHODOLOGY.md`, `ATTRIBUTION.md`, and the CSP `connect-src` allowlist in the same PR.

## Your affiliation / COI

<!--
Optional. If you are affiliated with the source, say so here.
-->
