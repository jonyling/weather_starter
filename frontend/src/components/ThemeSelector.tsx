import { useEffect } from 'react';
import { useSelectedLocation } from '../state/store';
import { THEMES, useTheme, weatherKey, type ThemeId } from '../theme';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const condition = useSelectedLocation()?.weather?.condition;

  useEffect(() => {
    document.documentElement.dataset.weather = weatherKey(condition);
  }, [condition]);

  return (
    <label className="fixed right-4 top-4 z-[1000] flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-xl">
      <span>Theme</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeId)}
        className="cursor-pointer bg-transparent text-white focus:outline-none"
        aria-label="Theme"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id} className="text-black">
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}
