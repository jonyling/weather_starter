# Testing

```bash
npm test                                                  # vitest run (backend/src/**/*.test.ts, frontend/src/**/*.test.ts)
npm run test:watch
npx vitest run backend/src/routes/locations.test.ts       # single file
npx vitest run -t "test name pattern"                     # single test
```

- Tests run with `pool: 'forks'` and `fileParallelism: false` because they share the SQLite file. Env: `NODE_ENV=test`, `LOG_LEVEL=silent`.
- Tests that touch the DB should clean up via `resetStore()` from `db.ts`.
- Inject a fake weather client with `createApp({ weatherClient })`.
- Frontend tests exist only for pure helpers (e.g. `mapPins.test.ts`). Vitest runs in a `node` environment, so there are no DOM tests.
