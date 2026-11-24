import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from './api';
import type { Location } from './types';
import {
  DEFAULT_GEO_OPTIONS,
  GEO_TIMEOUT_MS,
  geolocationErrorMessage,
  isDuplicateCreateError,
  useMyLocation,
  type GetCurrentPosition,
  type UseMyLocationDeps,
} from './useMyLocation';

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
  getCurrentPosition: ReturnType<typeof vi.fn<GetCurrentPosition>>;
  create: ReturnType<
    typeof vi.fn<(payload: { latitude: number; longitude: number }) => Promise<void>>
  >;
  select: ReturnType<typeof vi.fn<(id: number | null) => void>>;
  logInteraction: ReturnType<typeof vi.fn<(event: string, metadata?: object) => void>>;
  locations: Location[];
};

function makeDeps(over: Partial<UseMyLocationDeps> = {}): DepMocks {
  const deps: DepMocks = {
    getCurrentPosition: vi.fn<GetCurrentPosition>(async () => ({
      latitude: 1.3508,
      longitude: 103.839,
    })),
    create: vi.fn(async (_payload: { latitude: number; longitude: number }) => {}),
    locations: [],
    select: vi.fn((_id: number | null) => {}),
    logInteraction: vi.fn((_event: string, _metadata?: object) => {}),
  };
  if (over.getCurrentPosition) {
    deps.getCurrentPosition = over.getCurrentPosition as DepMocks['getCurrentPosition'];
  }
  if (over.create) deps.create = over.create as DepMocks['create'];
  if (over.select) deps.select = over.select as DepMocks['select'];
  if (over.logInteraction) {
    deps.logInteraction = over.logInteraction as DepMocks['logInteraction'];
  }
  if (over.locations) deps.locations = over.locations;
  return deps;
}

describe('DEFAULT_GEO_OPTIONS', () => {
  it('uses ~10s timeout and does not force high accuracy', () => {
    expect(DEFAULT_GEO_OPTIONS.timeout).toBe(GEO_TIMEOUT_MS);
    expect(DEFAULT_GEO_OPTIONS.enableHighAccuracy).toBeUndefined();
  });
});

describe('isDuplicateCreateError', () => {
  it('detects 409 ApiRequestError and duplicate message', () => {
    expect(isDuplicateCreateError(new ApiRequestError('Location already exists', 409))).toBe(true);
    expect(isDuplicateCreateError(new Error('Location already exists'))).toBe(true);
    expect(isDuplicateCreateError(new ApiRequestError('bad', 422))).toBe(false);
  });
});

describe('geolocationErrorMessage', () => {
  it('maps PositionError codes to short messages', () => {
    expect(geolocationErrorMessage({ code: 1 })).toBe('Location permission denied.');
    expect(geolocationErrorMessage({ code: 2 })).toBe('Unable to determine your location.');
    expect(geolocationErrorMessage({ code: 3 })).toBe('Location request timed out.');
  });

  it('passes through Error messages (unsupported)', () => {
    expect(geolocationErrorMessage(new Error('Geolocation is not supported by this browser.'))).toBe(
      'Geolocation is not supported by this browser.',
    );
  });
});

describe('useMyLocation', () => {
  it('creates with raw GPS coords on success and logs clicked/succeeded', async () => {
    const deps = makeDeps();
    const result = await useMyLocation(deps);

    expect(result).toEqual({ ok: true });
    expect(deps.getCurrentPosition).toHaveBeenCalledWith(DEFAULT_GEO_OPTIONS);
    expect(deps.create).toHaveBeenCalledWith({ latitude: 1.3508, longitude: 103.839 });
    expect(deps.logInteraction.mock.calls.map((c) => c[0])).toEqual([
      'location_geolocate_clicked',
      'location_geolocate_succeeded',
    ]);
    expect(deps.logInteraction).toHaveBeenCalledWith('location_geolocate_succeeded', {
      latitude: 1.3508,
      longitude: 103.839,
    });
  });

  it('asserts geolocation options include timeout and default accuracy', async () => {
    const deps = makeDeps();
    await useMyLocation(deps);
    const options = deps.getCurrentPosition.mock.calls[0]?.[0];
    expect(options?.timeout).toBe(10_000);
    expect(options?.enableHighAccuracy).toBeUndefined();
  });

  it('shows unsupported error and does not create when geolocation rejects unsupported', async () => {
    const deps = makeDeps({
      getCurrentPosition: vi.fn(async () => {
        throw new Error('Geolocation is not supported by this browser.');
      }),
    });

    const result = await useMyLocation(deps);

    expect(result).toEqual({
      ok: false,
      error: 'Geolocation is not supported by this browser.',
    });
    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.logInteraction).toHaveBeenCalledWith('location_geolocate_failed', {
      reason: 'geolocation',
      error: 'Geolocation is not supported by this browser.',
    });
  });

  it('shows permission denied error and does not create', async () => {
    const deps = makeDeps({
      getCurrentPosition: vi.fn(async () => {
        throw { code: 1, message: 'User denied Geolocation' };
      }),
    });

    const result = await useMyLocation(deps);

    expect(result).toEqual({ ok: false, error: 'Location permission denied.' });
    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.logInteraction).toHaveBeenCalledWith('location_geolocate_failed', {
      reason: 'geolocation',
      error: 'Location permission denied.',
    });
  });

  it('shows timeout error and does not create', async () => {
    const deps = makeDeps({
      getCurrentPosition: vi.fn(async () => {
        throw { code: 3, message: 'Timeout expired' };
      }),
    });

    const result = await useMyLocation(deps);

    expect(result).toEqual({ ok: false, error: 'Location request timed out.' });
    expect(deps.create).not.toHaveBeenCalled();
  });

  it('shows position unavailable error and does not create', async () => {
    const deps = makeDeps({
      getCurrentPosition: vi.fn(async () => {
        throw { code: 2, message: 'Position unavailable' };
      }),
    });

    const result = await useMyLocation(deps);

    expect(result).toEqual({ ok: false, error: 'Unable to determine your location.' });
    expect(deps.create).not.toHaveBeenCalled();
  });

  it('surfaces outside-Singapore create rejection inline and does not select', async () => {
    const message =
      'Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)';
    const deps = makeDeps({
      getCurrentPosition: vi.fn(async () => ({ latitude: 1.0, longitude: 103.8 })),
      create: vi.fn(async () => {
        throw new ApiRequestError(message, 422);
      }),
    });

    const result = await useMyLocation(deps);

    expect(result).toEqual({ ok: false, error: message });
    expect(deps.select).not.toHaveBeenCalled();
    expect(deps.logInteraction).toHaveBeenCalledWith('location_geolocate_failed', {
      reason: 'create',
      latitude: 1.0,
      longitude: 103.8,
      error: message,
    });
  });

  it('on 409 with exact lat/lon match selects that location and returns error', async () => {
    const existing = loc(7, 1.3508, 103.839);
    const deps = makeDeps({
      locations: [existing, loc(8, 1.29, 103.85)],
      create: vi.fn(async () => {
        throw new ApiRequestError('Location already exists', 409);
      }),
    });

    const result = await useMyLocation(deps);

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

    const result = await useMyLocation(deps);

    expect(result).toEqual({ ok: false, error: 'Location already exists' });
    expect(deps.select).not.toHaveBeenCalled();
  });

  it('retry replaces prior failure path (second call can succeed)', async () => {
    const getCurrentPosition = vi
      .fn<GetCurrentPosition>()
      .mockRejectedValueOnce({ code: 1 })
      .mockResolvedValueOnce({ latitude: 1.35, longitude: 103.82 });
    const create = vi.fn(async () => {});
    const deps = makeDeps({ getCurrentPosition, create });

    const first = await useMyLocation(deps);
    expect(first).toEqual({ ok: false, error: 'Location permission denied.' });

    const second = await useMyLocation(deps);
    expect(second).toEqual({ ok: true });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
