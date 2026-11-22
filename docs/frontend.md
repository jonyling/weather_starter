# Frontend (`frontend/src/`)

React 18 + Tailwind + Vite.

- State lives in a single context in `state/store.tsx` (locations, selectedId, loading/refreshing/error), backed by `api.ts`.
- `theme.ts` / `ThemeSelector` handle theming.
- `components/WeatherMapCard.tsx` + `mapPins.ts` implement the Leaflet map.
