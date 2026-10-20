# library-wrapper

A small static TypeScript site for searching an Ex Libris Alma catalogue. The page queries Alma's public SRU endpoint directly from the browser (Alma allows cross-origin requests) and renders the results.

## Setup

1. `npm install`
2. Set `ALMA_SRU_URL` in `src/alma.ts` to `https://<host>/view/sru/<INSTITUTION_CODE>`.
3. `npm run dev` to serve locally at http://localhost:8000.

`npm run build` writes `public/app.js`; `npm run typecheck` checks the code.

## Deploy

Pushing to `master` builds the site and publishes `public/` to GitHub Pages via `.github/workflows/pages.yml`. In the repo's Settings → Pages, set **Source** to **GitHub Actions** once.
