# Architecture

**Single process in dev.** `backend/src/server.ts` exports `createApp()`, which mounts JSON parsing, `/health`, `POST /api/logs` (frontend interaction logging via pino), the locations router under `/api`, and then either Vite middleware (dev, `appType: 'spa'`) or static `frontend/dist` (when `NODE_ENV=production`). There is no separate frontend port; the frontend uses relative `/api` URLs. `scripts/dev.mjs` runs `tsx watch backend/src/server.ts` under Portless, which injects `PORT`.

**Snapshot pattern.** Weather is not fetched on page load. Creating a location inserts a row with placeholder weather, then immediately attempts a refresh (on `WeatherProviderError` it still returns 201 with the placeholder). `POST /api/locations/:id/refresh` re-fetches and overwrites the row.

Error codes: duplicate lat/lon -> 409, provider failure on refresh -> 502, missing -> 404.

See also: [backend.md](backend.md), [frontend.md](frontend.md).
