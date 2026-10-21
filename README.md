# Tribal Mischief owners' dashboard

Static dashboard for the owners. `node build.mjs` reads the local sources and writes `dist/index.html`. No dependencies.

The sources live on the build machine. Build there, then deploy the prebuilt `dist/` with the Netlify CLI. Netlify publishes `dist` and runs no build.

## Build

```sh
TM_ROOT=/home/box/tribal-mischief npm run build
```

`TM_ROOT` is the content root. It defaults to `/home/box/tribal-mischief`.

## Deploy

```sh
npm run deploy
```

This sets `DEPLOY=1`, rebuilds, and runs `netlify deploy --prod --dir dist`. With `DEPLOY` set, the header omits the local-prototype label.

`netlify.toml` sets `publish = "dist"` and leaves the build command unset. Every response sends `X-Robots-Tag: noindex` and `Cache-Control: no-store`.

## Access

Access is gated by Netlify site-wide password protection (a paid feature). Set the password in the site settings. It is not stored in this repo.

## Data sources

From `TM_ROOT`:

- `board.md` — task table and Standup notes
- `brand-guide/tokens/colors.css`, `typography.css`, `spacing.css`, and `brand-guide/assets/circle-mark-white.png`
- `graphics/` — carousel and format folders
- `social-playbook.md`

From this repo:

- `data/media.json` — pieces in progress, stages, and carousel labels
- `data/finance.json` — finance tiles. When that file is missing, the build reads `data/finance.example.json`. `data/finance.json` is gitignored so real financials stay off the remote.
