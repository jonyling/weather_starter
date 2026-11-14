import { describe, expect, it } from 'vitest';
import { escapeHtml, mapView, pinHtml, pinLabel } from './mapPins';
import type { Location } from '../types';

function loc(id: number, over: Partial<Location['weather']> = {}, lat = 1.3, lng = 103.8): Location {
  return {
    id,
    latitude: lat,
    longitude: lng,
    created_at: '',
    weather: { condition: 'Cloudy', temperature_c: 29.6, ...over } as Location['weather'],
  };
}

describe('pinLabel', () => {
  it('rounds temperature and keeps condition', () => {
    expect(pinLabel(loc(1))).toEqual({ temp: '30°', condition: 'Cloudy' });
  });
  it('uses placeholder for missing temperature', () => {
    expect(pinLabel(loc(1, { temperature_c: null })).temp).toBe('--°');
  });
  it('drops Unavailable/null conditions and trailing parentheticals', () => {
    expect(pinLabel(loc(1, { condition: 'Unavailable' })).condition).toBe('');
    expect(pinLabel(loc(1, { condition: null })).condition).toBe('');
    expect(pinLabel(loc(1, { condition: 'Showers (Day)' })).condition).toBe('Showers');
  });
});

describe('escapeHtml / pinHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<script>"&'`)).toBe('&#60;script&#62;&#34;&#38;&#39;');
  });
  it('escapes condition text in markup', () => {
    expect(pinHtml(loc(1, { condition: '<img onerror=x>' }), false)).not.toContain('<img');
  });
  it('marks the selected variant and omits empty condition line', () => {
    expect(pinHtml(loc(1), true)).toContain('wx-pin--selected');
    expect(pinHtml(loc(1), false)).not.toContain('wx-pin--selected');
    expect(pinHtml(loc(1, { condition: null }), false)).not.toContain('wx-pin__cond');
  });
});

describe('mapView', () => {
  it('defaults for no locations', () => {
    expect(mapView([]).kind).toBe('default');
  });
  it('centres on a single location', () => {
    expect(mapView([loc(1, {}, 1.4, 103.9)])).toEqual({
      kind: 'single',
      center: [1.4, 103.9],
      zoom: 12,
    });
  });
  it('fits bounds for several locations', () => {
    const v = mapView([loc(1), loc(2, {}, 1.4, 103.9)]);
    expect(v).toEqual({ kind: 'bounds', points: [[1.3, 103.8], [1.4, 103.9]] });
  });
});
