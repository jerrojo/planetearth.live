# Privacy policy

**planetearth.live collects nothing about you.**

We consider this line above any feature we might add. If a change would break it, we do not ship it.

## What we do not collect

- No accounts. There is no sign-up, no sign-in, no session.
- No cookies. Not for analytics, not for fingerprinting, not for preferences (we use `localStorage` instead — see below).
- No analytics. No Google Analytics, no Plausible, no Fathom, no Matomo.
- No tracking pixels, no beacons, no fingerprinting scripts.
- No third-party embeds apart from the Google Fonts CSS (which we preconnect but do not authorise to fetch your data).
- No IP address logging at the application layer. The CDN hosting the static site may log IPs at the edge for caching/abuse reasons — that logging is governed by the host's own policy, not ours.
- No contact with a backend of ours, because there is none.

## What we store locally, in your browser

planetearth.live uses `localStorage` and `IndexedDB` **only on your device** — these values never leave your browser.

| Key | Purpose | Typical size |
|---|---|---|
| `pel:locale` | Your preferred interface language | ~2 bytes |
| `planetearth-font-size` | Your text-size preference | ~8 bytes |
| `planetearth-reduced-motion` | Reduced-motion preference | 1 byte |
| `planetearth-high-contrast` | High-contrast preference | 1 byte |
| `pel:cache:<metric-id>` (localStorage) | Last-known-good metric value for offline fallback | ~80 bytes per metric |
| `planetearth-live` (IndexedDB, `metrics` store) | Same fallback values (richer storage) | ~2 KB total |

You can delete them at any time from your browser's storage panel, or by opening the site and running `localStorage.clear()` plus deleting the `planetearth-live` IndexedDB database. The app will keep working — the next live fetch will rebuild the cache.

## What we fetch from the network

On load, and every 30 minutes thereafter, the app calls the public scientific APIs listed in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md): NOAA, NASA, USGS, Copernicus CAMS via Open-Meteo, OpenAQ, NOAA CO-OPS, Global Forest Watch, GBIF, National Grid ESO, NSIDC via global-warming.org. Each of those agencies has its own privacy posture, detailed on their websites.

Because these fetches originate from your browser, the agencies see your IP address and User-Agent. We have no way to prevent that, and we do not log or store any of it.

## GDPR, CCPA, children

- **GDPR.** The legal basis for the processing described above ("what we store locally") is the contractual necessity of delivering a functioning web page. We store no personal data. We transfer no personal data across borders because we do not collect any.
- **CCPA.** We do not sell, share, or otherwise monetise personal data because we do not collect any.
- **Children.** The site is safe for visitors of any age. We collect nothing that could identify a minor.

## Changes to this policy

Any change that would affect what we collect, store, or fetch must be reflected in this document in the same pull request. The policy is versioned alongside the source code; historical versions are visible in Git.

## Contact

For privacy questions: **privacy@planetearth.live**. For security issues, see [SECURITY.md](SECURITY.md).
