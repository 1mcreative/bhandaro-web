# Bhandaro web

React + TypeScript web app for the Bhandaro inventory API (login, items, locations, stock in/out with no-oversell handling, users and roles). English and Hindi.

```bash
npm install
cp .env.example .env.local   # set VITE_API_URL
npm run dev                  # http://localhost:5173
npm test && npm run build
```

- `openapi.yaml` is a copy of the backend contract (`bhandaro-backend/api/openapi.yaml`). After it changes: copy it here, then `npm run gen`.
- Add a language: drop `src/locales/xx.json` (copy `en.json`, set `meta.name`). Nothing else to edit; the test fails if any key or `{{placeholder}}` is missing.
- Login tokens are kept in memory only: a page reload logs the user out (deliberate). A stock change that was sent but whose reply was lost cannot be safely re-sent after a reload (its idempotency key is gone): check the history first.
- Backend must list this site's origin in `CORS_ORIGINS`.

## Deploy (GitHub Pages)
```bash
VITE_API_URL=https://your-api.example.com npm run build   # builds ./dist with a CSP allowing only that API
# publish ./dist (e.g. a GitHub Actions Pages workflow: npm ci && npm test && npm run build, then upload dist/)
```
Production builds fail if `VITE_API_URL` is unset. The API must list the Pages origin (e.g. `https://<user>.github.io`) in `CORS_ORIGINS`.
