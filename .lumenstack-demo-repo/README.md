# Atlas Catalog API

Atlas Catalog is a small teaching API for browsing and searching a curated product catalog. The sample is intentionally compact so you can follow one request from the server entrypoint through a route and service to its data.

## Run locally

```sh
npm test
npm start
```

The project uses Node.js and Express. Tests use Node's built-in test runner. `render.yaml` describes an example deployment configuration; it does not mean this sample is deployed.

## Request path

`server.js` starts the HTTP server, `src/routes/catalog.js` handles catalog requests, and `src/services/catalogService.js` applies search behavior to `src/data/catalog.js`.
