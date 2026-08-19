# Firefox / Gecko build

PESU-MAX also builds for Firefox and other Gecko browsers (Zen, LibreWolf, Waterfox).
Same features as the Chrome build, from the same sources.

## Build

```bash
npm install
```

```bash
npm run build:firefox
```

Output lands in `dist-firefox/`. The Chrome build is unchanged and still produced by
`npm run build:chrome` (output: `dist/`); `npm run build` defaults to Chrome.

| Script | What it does |
| --- | --- |
| `npm run build:firefox` | Production Firefox build → `dist-firefox/` |
| `npm run dev:firefox` | Firefox build in watch mode |
| `npm run lint:firefox` | `web-ext lint` against the built extension |
| `npm run package:firefox` | Zips `dist-firefox/` into `web-ext-artifacts/` |

## Installing

**For testing:** open `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on…* →
pick `dist-firefox/manifest.json`. Firefox drops temporary add-ons on restart.

**Permanently:** Firefox and its derivatives enforce add-on signing on release builds, so a
permanent install needs a Mozilla-signed XPI. Signing on the **unlisted** channel is free and
automated and does not publish the add-on publicly:

```bash
npx web-ext sign --source-dir dist-firefox --channel unlisted --artifacts-dir web-ext-artifacts --api-key YOUR_JWT_ISSUER --api-secret YOUR_JWT_SECRET
```

API credentials come from https://addons.mozilla.org/en-US/developers/addon/api/key/.

## What differs from the Chrome build

| Area | Chrome | Firefox |
| --- | --- | --- |
| Background | `background.service_worker` | `background.scripts` — Firefox MV3 uses event pages and ignores `service_worker` |
| Add-on identity | n/a | `browser_specific_settings.gecko.id` + `strict_min_version`, required for signing and stable updates |
| File downloads | base64 `data:` URL | Blob URL — `downloads.download()` rejects `data:` URLs on Firefox with "Access denied for URL" |
| Babel target | `chrome: 88` | `firefox: 128` |

Download plumbing is consolidated in `src/helpers/browserDownload.js`, which picks the right
strategy per target from the webpack-injected `__TARGET_BROWSER__` flag and revokes each blob
URL once its download reaches a terminal state. The three call sites (bulk course-material
zip, single PYQ, PYQ zip) all route through it.

The `chrome.*` namespace is left as-is throughout: Firefox aliases it to `browser.*` and
supports the callback style this codebase uses, so no polyfill is needed.

Host permissions are granted at install time on Firefox 127+, but remain revocable from
`about:addons` → PESU-MAX → Permissions.
