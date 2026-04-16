# Security policy

planetearth.live is an open-source, public-facing web application that fetches data from public scientific APIs. It has **no backend, no authentication, no database, and no user accounts.** It ships a static bundle that runs entirely in the reader's browser.

That narrow surface area means the security posture is primarily about:

1. The integrity of the static bundle we serve.
2. The CSP / HTTP-header hardening of the host.
3. The supply chain (npm dependencies).
4. The correctness of the public-API data path — no upstream API is allowed to inject executable code into the page.

## Reporting a vulnerability

Please email **security@planetearth.live** (or the maintainer listed in `package.json` if the address is unreachable). We aim to:

- Acknowledge receipt within **72 hours**.
- Provide a triage outcome within **7 days**.
- Fix confirmed vulnerabilities within **30 days** for critical/high, **90 days** for medium/low.

Please **do not open public GitHub issues** for security reports. We will coordinate a CVE if the impact warrants one.

Responsible-disclosure rewards: we cannot offer monetary bounties, but every valid report earns an acknowledgement in the changelog and contributor list.

## Security controls in place

### HTTP headers

Both `public/_headers` (Netlify / Cloudflare Pages) and `vercel.json` ship a hardened header set: Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. Update both files together.

### Content-Security-Policy

The CSP allows `connect-src` only for the documented agency endpoints (see [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)) plus `'self'`. Any new data source must be added to the CSP allowlist in the same pull request. Inline scripts are forbidden; inline styles are permitted for the sake of Three.js shader code strings (reviewed case-by-case).

### Dependency hygiene

- We pin only Three.js as a runtime dependency. Every other package is `devDependencies`.
- `npm audit` is run in CI on every pull request (see `.github/workflows/ci.yml`).
- We do not use optional runtime dependencies loaded from the CDN at runtime. Google Fonts is the only third-party CDN resource; it is preconnected but not script-injected.

### Runtime data validation

Every value from a public API passes through a named validator in `src/services/validation.ts` before it reaches the UI. This is a defense-in-depth control: a compromised aggregator cannot silently inject out-of-range data or structural surprises into the renderer.

### Client-side storage

We store only:

- `pel:locale` (user's preferred language) in localStorage.
- `planetearth-font-size`, `planetearth-reduced-motion`, `planetearth-high-contrast` (UI preferences) in localStorage.
- `pel:cache:{metric-id}` — last-known-good values for labelled offline fallback, in localStorage and/or IndexedDB.

No session tokens, no identifiers, no user data of any kind. See [PRIVACY.md](PRIVACY.md).

### Subresource integrity

Third-party scripts (currently only Google Fonts) are loaded via `<link>` not `<script>`. If we ever add a script tag pointing at a CDN, it will carry an `integrity="sha384-..."` attribute and a `crossorigin="anonymous"` attribute.

### Build pipeline

The site is built with Vite. The production bundle is checked in via the CI workflow (TypeScript strict, tests passing) before deploy. Nothing is installed or built on the production host at request time.

## Threat model

### In scope

- Tampered `dist/` bundle (defense: CI integrity, deploy signature).
- Malicious or compromised dependency (defense: audit, minimal runtime dep set).
- Malicious or compromised API aggregator injecting unphysical data (defense: per-source validators, bounds checks).
- XSS via data from public APIs (defense: we never `innerHTML` untrusted strings; agency text content is set via `textContent`).
- Clickjacking (defense: `X-Frame-Options: DENY` header).

### Out of scope

- Denial of service against the public APIs we call (not our infrastructure).
- Vulnerabilities in the reader's browser runtime.
- Social engineering of maintainers.

## Hardening roadmap

Tracked in [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md):

- Automated CSP violation reporting (opt-in).
- Signed release tarballs.
- SBOM generation in CI (CycloneDX).

We welcome issues or PRs against any of these.
