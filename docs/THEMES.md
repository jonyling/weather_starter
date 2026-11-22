# Themes

Themes are selected via the dropdown in `frontend/src/components/ThemeSelector.tsx`. The list lives in `THEMES` in `frontend/src/theme.ts`; the choice is stored in `localStorage` under `weather-theme` and applied as `<html data-theme="...">`.

## Existing themes (15, plus Monsoon Teal and Tropical Punch below)

Apple (default), Clear Sky, Midnight Radar, Glass Horizon, Paper Almanac, Neo-Brutalist, Aurora, Terminal Forecast, Pastel Cloud, Swiss Minimal, Storm Front, Sunset Gradient, Isometric Atlas, Retro Weatherstar, Zen Ink.

## Implemented in this round

| id | Label | Status |
|----|-------|--------|
| `monsoon` | Monsoon Teal | Implemented, added to the selector |
| `tropical` | Tropical Punch | Implemented, added to the selector |

## Proposed themes (10)

| # | id | Label | Look | Status |
|---|----|-------|------|--------|
| 1 | `monsoon` | Monsoon Teal | Deep teal and slate with rain-streak texture and cool white text | Done |
| 2 | `tropical` | Tropical Punch | Saturated coral, mango and palm green with rounded, playful cards | Done |
| 3 | `blueprint` | Blueprint | White grid lines on cyan-navy, monospaced labels and technical annotations | Proposed |
| 4 | `dusk` | Golden Hour | Warm amber and rose gradients, soft shadows and serif headings | Proposed |
| 5 | `frost` | Frostbite | Icy blue-white with crisp thin borders and subtle crystalline highlights | Proposed |
| 6 | `synthwave` | Synthwave | Neon magenta and cyan on near-black, glow effects and a perspective grid | Proposed |
| 7 | `kraft` | Kraft Paper | Brown paper, stamped borders and hand-lettered feel, a field-notebook style | Proposed |
| 8 | `highcontrast` | High Contrast | Pure black and white with a yellow accent, large type, built for accessibility | Proposed |
| 9 | `jungle` | Rainforest | Layered greens, moss textures and warm earthy accents | Proposed |
| 10 | `neon-tokyo` | Night Market | Dark navy with lantern red and yellow, dense and busy like a street at night | Proposed |

These were chosen to avoid repeating any of the 15 existing themes.

## Design considerations

- **Components use white-on-glass utility classes** (`text-white`, `bg-white/10`, `border-white/...`). Themes don't change the components; they remap those classes with attribute selectors such as `[class*=' bg-white/']` in `frontend/src/index.css`.
- **Scope every rule** under `:root[data-theme='<id>']` so a theme cannot leak into others.
- **Set `--app-bg`** on the theme root. `body` paints it with `background: var(--app-bg)`.
- **Dark themes** (e.g. Midnight Radar, Monsoon Teal) keep the default white text and only remap surfaces, borders and accents. **Light themes** (e.g. Clear Sky) must also remap text to dark slate, and lighten the low-opacity text levels (`text-white/4`–`/7`).
- **Remap these surfaces and states:** `bg-white/10`, `/20`, `/70`, `/90` (the `/90` button also needs readable text colour), `rounded-2xl` shadows, `border-white`/`divide-white`, `aside`, `input` text and placeholder, `uppercase` labels, error classes (`border-red`, `text-red`), and focus rings via `--tw-ring-color`.
- **Map pins** are styled separately: `.wx-pin__label`, `.wx-pin__dot`, `.wx-pin--selected .wx-pin__label`.
- **Weather-reactive backgrounds:** `ThemeSelector` sets `html[data-weather]` to `clear`, `cloudy`, `rain`, `storm` or `night` (via `weatherKey()` in `theme.ts`). A theme can vary its background on this, as Glass Horizon does.
- **Density:** Midnight Radar tightens padding and gaps; most themes leave spacing alone.
- **Accessibility:** check text contrast on translucent panels over the gradient. High Contrast is intended specifically for this.

## Adding a theme

1. Add `{ id, label }` to `THEMES` in `frontend/src/theme.ts`. The selector picks it up automatically.
2. Append a `:root[data-theme='<id>']` block to `frontend/src/index.css`.
3. Run `npm run dev` and check every panel, the sidebar, the map pins and the error state.

## Caveats

- Monsoon Teal and Tropical Punch were typechecked but not viewed in a browser, so contrast (and the rain texture) are unverified.
