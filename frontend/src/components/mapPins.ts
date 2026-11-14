import { formatTemperature } from './format';
import type { Location } from '../types';

export const DEFAULT_CENTER: [number, number] = [1.3521, 103.8198];

export type MapView =
  | { kind: 'default'; center: [number, number]; zoom: number }
  | { kind: 'single'; center: [number, number]; zoom: number }
  | { kind: 'bounds'; points: [number, number][] };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function pinLabel(location: Location): { temp: string; condition: string } {
  const raw = location.weather?.condition;
  const condition = !raw || raw === 'Unavailable' ? '' : raw.replace(/\s*\(.*\)$/, '').trim();
  return { temp: formatTemperature(location.weather?.temperature_c), condition };
}

export function pinHtml(location: Location, selected: boolean): string {
  const { temp, condition } = pinLabel(location);
  return `<div class="wx-pin${selected ? ' wx-pin--selected' : ''}">
  <div class="wx-pin__label">
    <span class="wx-pin__temp">${escapeHtml(temp)}</span>${
      condition ? `<span class="wx-pin__cond">${escapeHtml(condition)}</span>` : ''
    }
  </div>
  <div class="wx-pin__dot"></div>
</div>`;
}

export function mapView(locations: Location[]): MapView {
  if (locations.length === 0) return { kind: 'default', center: DEFAULT_CENTER, zoom: 11 };
  if (locations.length === 1) {
    return { kind: 'single', center: [locations[0].latitude, locations[0].longitude], zoom: 12 };
  }
  return { kind: 'bounds', points: locations.map((l) => [l.latitude, l.longitude]) };
}
