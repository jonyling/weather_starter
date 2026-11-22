# Backend (`backend/src/`)

- `routes/locations.ts` — `createLocationsRouter({ weatherClient })`. The `WeatherClient` is injected so tests can pass a fake (use `createApp({ weatherClient })`). In `NODE_ENV=test`, Vite serving and request logging are off by default.
- `weather.ts` — `SingaporeWeatherClient` for data.gov.sg: resolves the nearest forecast area / station readings to a lat/lon and builds a `WeatherSnapshot`. Optional `WEATHER_API_KEY`.
- `db.ts` — uses Node's built-in `node:sqlite` (`DatabaseSync`) wrapped by Drizzle's `sqlite-proxy` driver via a hand-written callback. Migrations are applied at module import (top-level await) from `backend/drizzle` relative to `process.cwd()`, so run from the repo root. DB path is `DATABASE_PATH` or `backend/weather.db`. Maps flat DB columns (camelCase) <-> nested `LocationRecord.weather` snapshot (snake_case) in `weatherToColumns` / `rowToRecord`.
- `schema.ts` — Drizzle table plus the `WeatherSnapshot` type. `forecast_periods` and `daily_forecast` are JSON text columns.

## Adding a weather field

Touch all of these:
1. `schema.ts` (column + `WeatherSnapshot`)
2. a new migration (`npm run db:generate`)
3. `db.ts` (`defaultWeather`, `weatherToColumns`, `rowToRecord`)
4. `weather.ts` (`WeatherSnapshot` there, and the client)
5. `frontend/src/types.ts`
