import { useCallback, useEffect, useState } from 'react';

export const THEMES = [
  { id: 'apple', label: 'Apple' },
  { id: 'clear-sky', label: 'Clear Sky' },
  { id: 'midnight', label: 'Midnight Radar' },
  { id: 'glass', label: 'Glass Horizon' },
  { id: 'almanac', label: 'Paper Almanac' },
  { id: 'brutal', label: 'Neo-Brutalist' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'terminal', label: 'Terminal Forecast' },
  { id: 'pastel', label: 'Pastel Cloud' },
  { id: 'swiss', label: 'Swiss Minimal' },
  { id: 'storm', label: 'Storm Front' },
  { id: 'sunset', label: 'Sunset Gradient' },
  { id: 'atlas', label: 'Isometric Atlas' },
  { id: 'weatherstar', label: 'Retro Weatherstar' },
  { id: 'zen', label: 'Zen Ink' },
  { id: 'monsoon', label: 'Monsoon Teal' },
  { id: 'tropical', label: 'Tropical Punch' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const STORAGE_KEY = 'weather-theme';
const DEFAULT_THEME: ThemeId = 'apple';

function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

function readStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(v)) return v;
  } catch {
    // storage unavailable
  }
  return DEFAULT_THEME;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  return { theme, setTheme };
}

export type WeatherKey = 'clear' | 'cloudy' | 'rain' | 'storm' | 'night';

/** Coarse bucket of NEA condition text, used by themes whose background follows the weather. */
export function weatherKey(condition?: string | null): WeatherKey {
  const t = (condition ?? '').toLowerCase();
  if (t.includes('thunder')) return 'storm';
  if (t.includes('rain') || t.includes('shower') || t.includes('drizzle')) return 'rain';
  if (t.includes('night')) return 'night';
  if (t.includes('cloud') || t.includes('overcast') || t.includes('hazy') || t.includes('haze'))
    return 'cloudy';
  return 'clear';
}
