# Weather Starter

TypeScript app that tracks Singapore locations (lat/lon) and stores the latest weather snapshot for each, sourced from data.gov.sg. npm workspaces (`backend`, `frontend`), ESM. This directory (`weather_starter/`) is the repo root; run all commands from here.

## Commands

```bash
npm run dev          # Express + Vite via Portless -> http://weather-starter.localhost:1355
npm run build        # vite build (frontend) + tsc -p backend/tsconfig.json
npm start            # compiled production server
npm run doctor       # checks /health and /api/locations on a running server
npm run reset        # deletes the local SQLite DB
npm run db:generate  # generate migration after editing backend/src/schema.ts
```

No lint/format script exists, and `.husky/pre-commit` is empty.

## Security

`.env` and `backend/*.db` are gitignored. A stray `Untitled` file in this directory contains an API key — never copy it into commits.

## More detail

- [Architecture](docs/architecture.md) — request flow, snapshot pattern, error codes
- [Backend](docs/backend.md) — layers and the checklist for adding a weather field
- [Frontend](docs/frontend.md) — state, theming, map
- [Testing](docs/testing.md) — test commands, DB isolation, fakes
- [Themes](docs/THEMES.md) — theme list, design considerations, how to add one
- [TypeScript conventions](../docs/TYPESCRIPT.md)
