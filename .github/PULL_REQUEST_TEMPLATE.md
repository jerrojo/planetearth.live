# Pull request

## What

<!-- One or two sentences. What does this PR change? -->

## Why

<!-- The reason for the change, linked to an issue if one exists (fixes #123). -->

## Classification

<!-- Delete the rows that do not apply. -->

- [ ] **Routine** — typo, UI polish, bundle-size fix, translation, test-only change.
- [ ] **Methodological** — new source, changed baseline, changed validator bounds, changed blending weights. See `GOVERNANCE.md`.
- [ ] **Breaking** — schema bump in export, removed metric, changed UI language for a documented value. See `GOVERNANCE.md`.
- [ ] **Security** — see `SECURITY.md` first; some security changes should not be discussed in a public PR.

## Checklist

- [ ] I have read `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.
- [ ] Changes to methodology update `docs/METHODOLOGY.md` in this PR.
- [ ] Changes to attribution update `ATTRIBUTION.md` in this PR.
- [ ] Changes to the privacy posture update `PRIVACY.md` in this PR.
- [ ] Changes to the security posture update `SECURITY.md` in this PR.
- [ ] New external endpoints are added to the CSP `connect-src` allowlist in **both** `public/_headers` and `vercel.json`.
- [ ] New strings are added to **all** locale dictionaries under `src/i18n/dictionaries.ts`.
- [ ] Interactive UI changes pass `axe` keyboard checks and have `aria-*` labels.
- [ ] Breaking changes bump `schemaVersion` in `src/services/export.ts` and are entered in `CHANGELOG.md`.
- [ ] Tests added or updated for the behaviour that changed.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` all pass locally.

## Screenshots / before-after

<!-- For visual changes, paste a before and after. For data-facing changes, paste the relevant rows of the data-status panel. -->

## Affiliation / COI

<!--
If you are affiliated with an agency whose data this change touches, please disclose here.
Disclosure is not disqualifying; silence is.
-->

## Additional context

<!-- Anything a reviewer should know before reading the diff. -->
