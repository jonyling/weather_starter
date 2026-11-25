import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from './api';
import { mapClickAddLocation, type MapClickAddLocationDeps } from './mapClickAddLocation';
import type { Location } from './types';

function loc(id: number, latitude: number, longitude: number): Location {
  return {
    id,
    latitude,
    longitude,
    created_at: '',
    weather: {
      condition: null,
      observed_at: null,
      source: null,
      area: null,
      valid_period_text: null,
      temperature_c: null,
      humidity_percent: null,
      rainfall_mm: null,
      wind_speed_knots: null,
      wind_direction_degrees: null,
      forecast_low_c: null,
      forecast_high_c: null,
      uv_index: null,
      psi_twenty_four_hourly: null,
      pm25_one_hourly: null,
      air_quality_region: null,
      forecast_periods: [],
      daily_forecast: [],
    },
  };
}

type DepMocks = {
  create: ReturnType<
    typeof vi.fn<(payload: { latitude: number; longitude: number }) => Promise<void>>
  >;
  select: ReturnType<typeof vi.fn<(id: number | null) => void>>;
  logInteraction: ReturnType<typeof vi.fn<(event: string, metadata?: object) => void>>;
  locations: Location[];
};

function makeDeps(over: Partial<MapClickAddLocationDeps> = {}): DepMocks {
  const deps: DepMocks = {
    create: vi.fn(async (_payload: { latitude: number; longitude: number }) => {}),
    locations: [],
    select: vi.fn((_id: number | null) => {}),
    logInteraction: vi.fn((_event: string, _metadata?: object) => {}),
  };
  if (over.create) deps.create = over.create as DepMocks['create'];
  if (over.select) deps.select = over.select as DepMocks['select'];
  if (over.logInteraction) {
    deps.logInteraction = over.logInteraction as DepMocks['logInteraction'];
  }
  if (over.locations) deps.locations = over.locations;
  return deps;
}

describe('mapClickAddLocation', () => {
  it('creates with raw click coords on success and logs clicked/succeeded', async () => {
    const deps = makeDeps();
    const result = await mapClickAddLocation({ latitude: 1.3521, longitude: 103.8198 }, deps);

    expect(result).toEqual({ ok: true });
    expect(deps.create).toHaveBeenCalledWith({ latitude: 1.3521, longitude: 103.8198 });
    expect(deps.logInteraction.mock.calls.map((c) => c[0])).toEqual([
      'location_map_click_add_clicked',
      'location_map_click_add_succeeded',
    ]);
    expect(deps.logInteraction).toHaveBeenCalledWith('location_map_click_add_succeeded', {
      latitude: 1.3521,
      longitude: 103.8198,
    });
  });

  it('surfaces outside-Singapore create rejection inline and does not select', async () => {
    const message =
      'Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)';
    const deps = makeDeps({
      create: vi.fn(async () => {
        throw new ApiRequestError(message, 422);
      }),
    });

    const result = await mapClickAddLocation({ latitude: 1.0, longitude: 103.8 }, deps);

    expect(result).toEqual({ ok: false, error: message });
    expect(deps.select).not.toHaveBeenCalled();
    expect(deps.logInteraction).toHaveBeenCalledWith('location_map_click_add_failed', {
      latitude: 1.0,
      longitude: 103.8,
      error: message,
    });
  });

  it('on 409 with exact lat/lon match selects that location and returns error', async () => {
    const existing = loc(7, 1.3521, 103.8198);
    const deps = makeDeps({
      locations: [existing, loc(8, 1.29, 103.85)],
      create: vi.fn(async () => {
        throw new ApiRequestError('Location already exists', 409);
      }),
    });

    const result = await mapClickAddLocation({ latitude: 1.3521, longitude: 103.8198 }, deps);

    expect(result).toEqual({ ok: false, error: 'Location already exists' });
    expect(deps.select).toHaveBeenCalledWith(7);
  });

  it('on 409 without exact match shows error and does not select by area name', async () => {
    const deps = makeDeps({
      locations: [loc(1, 1.351, 103.84)],
      create: vi.fn(async () => {
        throw new ApiRequestError('Location already exists', 409);
      }),
    });

    const result = await mapClickAddLocation({ latitude: 1.3521, longitude: 103.8198 }, deps);

    expect(result).toEqual({ ok: false, error: 'Location already exists' });
    expect(deps.select).not.toHaveBeenCalled();
  });

  it('surfaces non-duplicate create errors without selecting', async () => {
    const deps = makeDeps({
      create: vi.fn(async () => {
        throw new Error('Request failed');
      }),
    });

    const result = await mapClickAddLocation({ latitude: 1.3, longitude: 103.8 }, deps);

    expect(result).toEqual({ ok: false, error: 'Request failed' });
    expect(deps.select).not.toHaveBeenCalled();
  });

  it('retry replaces prior failure path (second call can succeed)', async () => {
    const create = vi
      .fn<(payload: { latitude: number; longitude: number }) => Promise<void>>()
      .mockRejectedValueOnce(new ApiRequestError('Location already exists', 409))
      .mockResolvedValueOnce(undefined);
    const deps = makeDeps({ create, locations: [loc(1, 1.351, 103.84)] });

    const first = await mapClickAddLocation({ latitude: 1.3521, longitude: 103.8198 }, deps);
    expect(first).toEqual({ ok: false, error: 'Location already exists' });

    const second = await mapClickAddLocation({ latitude: 1.29, longitude: 103.85 }, deps);
    expect(second).toEqual({ ok: true });
    expect(create).toHaveBeenCalledTimes(2);
  });
});
