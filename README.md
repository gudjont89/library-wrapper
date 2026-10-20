# library-wrapper

A small TypeScript site for searching an Ex Libris Alma catalogue. A Cloudflare Worker proxies queries to Alma's public SRU endpoint and returns JSON; a static page calls it.

## Setup

1. `npm install`
2. Set `ALMA_SRU_URL` in `wrangler.toml` to `https://<host>/view/sru/<INSTITUTION_CODE>`.
3. `npm run dev` to run locally, `npm run deploy` to publish.

`npm run typecheck` checks both the worker and the client.

## API

`GET /api/search?q=<text>&index=any|title|author|subject|isbn` returns `{ total, results[] }`.
