# Bhandaro web

React + TypeScript web app for the Bhandaro inventory API (login, items, locations, stock in/out with no-oversell handling, users and roles). English and Hindi.

```bash
npm install
cp .env.example .env.local   # set VITE_API_URL
npm run dev                  # http://localhost:5173
npm test && npm run build
```

- `openapi.yaml` is a copy of the backend contract (`bhandaro-backend/api/openapi.yaml`). After it changes: copy it here, then `npm run gen`.
- Add a language: new `src/locales/xx.json` + one line in `src/i18n.ts`. The test fails if any key or `{{placeholder}}` is missing.
- Login tokens are kept in memory only: a page reload logs the user out (deliberate).
- Backend must list this site's origin in `CORS_ORIGINS`.
