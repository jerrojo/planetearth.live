# Governance

planetearth.live is an open-source project. Its legitimacy comes from **scientific accuracy**, **full source traceability**, and **political neutrality** — not from the identity of whoever currently maintains it. This document describes how the project is run, how decisions are made, and how that legitimacy is protected as maintainership evolves.

## Guiding principles

1. **State, don't persuade.** Every number on the site is sourced from a public scientific agency and is shown with its baseline, uncertainty, and last-fetch timestamp. Editorial framing — what is "bad", what we should "do about it" — does not belong on the site. It belongs in the work of the agencies, journalists, and institutions we link to.
2. **Nothing silent.** A fallback is labelled. A stale value is labelled. A blended value is labelled with its weights. If the project cannot be transparent about a number, the project does not show it.
3. **Scientific integrity over convenience.** If an agency revises a number, we revise. If a metric we show turns out to be methodologically weaker than a successor, we deprecate it. If two sources disagree, we pick the canonical one and say why.
4. **Political neutrality.** The project has no campaign, no endorsement, no sponsored content. Disagreements about climate policy are not resolved here; disagreements about climate measurement are.
5. **Privacy-by-construction.** The project collects nothing about its users and cannot be used to collect anything about its users. Any proposed change that breaks this is rejected regardless of the intended benefit. See `PRIVACY.md`.

## Roles

### Maintainer
A maintainer has commit access and may merge pull requests. Maintainers are responsible for:
- Reviewing pull requests against the principles above.
- Triaging issues within 7 days.
- Reviewing security reports within the timelines in `SECURITY.md`.
- Keeping `docs/METHODOLOGY.md` and `ATTRIBUTION.md` in sync with any source change.

A maintainer who is inactive for 6 months is moved to **alumnus** status and loses commit access. Alumnus status is reversible — an alumnus who returns and is willing to commit to the role again is reinstated by the remaining maintainers.

### Contributor
Anyone who submits a pull request or an issue. No prior approval is required. Contributors retain copyright over their contributions under the project's MIT license.

### Scientific reviewer
A volunteer domain expert (atmospheric science, oceanography, seismology, biodiversity, etc.) who can be consulted on methodological questions. Scientific reviewers are listed in `REVIEWERS.md` (pending, see roadmap) with their affiliation and disclosed conflicts of interest. They have no write access to the repo; they review pull requests that touch methodology.

## Decision process

### Routine changes (typos, UI polish, bundle-size fixes, new translations)
One maintainer review, merge.

### Methodological changes (new source, changed baseline, changed validator bounds, changed blending weights)
Two-maintainer review **and** consultation with at least one scientific reviewer if the domain has one. The change must update `docs/METHODOLOGY.md` and `ATTRIBUTION.md` in the same pull request.

### Breaking changes (schema version bump in export, removal of a metric, change in visible UI language for a documented value)
Two-maintainer review **and** a 14-day comment period on the relevant GitHub issue before merge. The change must update the `CHANGELOG.md` in the same pull request.

### Security changes
Handled under the confidential process in `SECURITY.md`. Public issues for in-scope vulnerabilities will be refused until a fix lands.

### Code of conduct enforcement
Handled by maintainers as described in `CODE_OF_CONDUCT.md`. Actions beyond a private warning require two-maintainer agreement.

## Disagreement resolution

If two maintainers disagree on a methodological question, the sequence is:

1. Surface the disagreement in a public GitHub issue, clearly stating both positions.
2. Invite comment from the scientific reviewers.
3. If consensus is reached, document the resolution in the issue and update `docs/METHODOLOGY.md` if the outcome changes behaviour.
4. If consensus is not reached after 30 days, **default to the more conservative position**: show the number with wider uncertainty, or remove the metric entirely. The rationale is that a project whose value is trust cannot afford contested numbers.

## Funding disclosure

If the project ever accepts money (sponsorship, grant, donation, contracted work), the following is published in the same pull request that accepts it:
- The funder.
- The amount (bucketed: <$1k, $1k–$10k, $10k–$100k, $100k–$1M, >$1M).
- Any restriction, no matter how mild.
- The resulting change in maintainership or editorial process, if any.

If the project is ever offered money with a restriction that is incompatible with the principles above, the funding is declined and the offer is recorded (anonymised) in `CHANGELOG.md` for that month.

## Editorial boundaries

The project does **not** accept:
- Sponsored content, native advertising, or promoted metrics.
- Changes that would shift a baseline to make a trend appear better or worse without a documented methodological reason.
- Changes that would silently remove a metric currently shown, unless the metric has been deprecated following the process above.
- Changes that involve writing editorial commentary on climate policy or on specific governments, corporations, or individuals.

The project **does** accept:
- Additional authoritative data sources that meet the intake criteria.
- Translations into additional languages.
- Accessibility, performance, and security improvements.
- Critiques (as GitHub issues) of our baselines, validator bounds, blending weights, or methodology. Critique is how the project stays honest.

## Conflict of interest

Maintainers and scientific reviewers disclose any material conflict of interest relevant to the project:
- Employment by an organisation whose metrics we show (NOAA, NASA, NSIDC, Global Forest Watch, etc.).
- Consulting relationships with climate-adjacent organisations.
- Financial stake in a company whose reputation is affected by a metric we show (e.g. an energy company for carbon intensity).

Disclosure does not disqualify — it is recorded in `REVIEWERS.md` (and in the maintainer's GitHub profile if they prefer) so that reviewers of a contentious pull request have the context.

## Succession

If the current maintainer(s) step down:

1. They nominate one or more successors by opening a pull request to this file.
2. The nomination is open for comment for 30 days.
3. If no substantive objection is raised, the succession is merged and commit rights transferred.
4. The outgoing maintainer is retained in `REVIEWERS.md` as an alumnus for continuity.

If no successor is available the domain, repository, and data-status feed remain read-only until one is, and a notice is posted at the top of the site.

## Amending this document

Changes to `GOVERNANCE.md` follow the breaking-change process: two-maintainer review, 14-day comment period, CHANGELOG update. The principles section (at the top of this file) may only be changed if the change clarifies an existing principle — adding, removing, or reversing a principle is out of scope.

## Contact

- Routine questions: **hello@planetearth.live**
- Security: **security@planetearth.live**
- Code of conduct: **conduct@planetearth.live**
- Privacy: **privacy@planetearth.live**
