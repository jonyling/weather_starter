import type { CreateLocationPayload, Location } from './types';

export const GEO_TIMEOUT_MS = 10_000;

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeolocationRequestOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export type GetCurrentPosition = (
  options?: GeolocationRequestOptions,
) => Promise<GeolocationCoords>;

export interface UseMyLocationDeps {
  getCurrentPosition: GetCurrentPosition;
  create: (payload: CreateLocationPayload) => Promise<void>;
  locations: Location[];
  select: (id: number | null) => void;
  logInteraction: (event: string, metadata?: object) => void;
}

export type UseMyLocationResult = { ok: true } | { ok: false; error: string };

/** Default geolocation options: default accuracy, ~10s timeout. */
export const DEFAULT_GEO_OPTIONS: GeolocationRequestOptions = {
  timeout: GEO_TIMEOUT_MS,
};

export function isDuplicateCreateError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = 'status' in err ? (err as { status?: unknown }).status : undefined;
  if (status === 409) return true;
  return err instanceof Error && err.message === 'Location already exists';
}

export function geolocationErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: number }).code;
    if (code === 1) return 'Location permission denied.';
    if (code === 2) return 'Unable to determine your location.';
    if (code === 3) return 'Location request timed out.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Unable to determine your location.';
}

/**
 * Browser Geolocation API adapter. Rejects with a clear message when unsupported.
 */
export const browserGetCurrentPosition: GetCurrentPosition = (options) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('Geolocation is not supported by this browser.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(error),
      options,
    );
  });
};

/**
 * Primary seam for "Use my location": injectable geolocation + create (+ select/list for 409).
 */
export async function useMyLocation(deps: UseMyLocationDeps): Promise<UseMyLocationResult> {
  deps.logInteraction('location_geolocate_clicked');

  let coords: GeolocationCoords;
  try {
    coords = await deps.getCurrentPosition(DEFAULT_GEO_OPTIONS);
  } catch (err) {
    const error = geolocationErrorMessage(err);
    deps.logInteraction('location_geolocate_failed', {
      reason: 'geolocation',
      error,
    });
    return { ok: false, error };
  }

  const payload: CreateLocationPayload = {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

  try {
    await deps.create(payload);
    deps.logInteraction('location_geolocate_succeeded', {
      latitude: payload.latitude,
      longitude: payload.longitude,
    });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Could not add location';

    if (isDuplicateCreateError(err)) {
      const match = deps.locations.find(
        (location) =>
          location.latitude === payload.latitude && location.longitude === payload.longitude,
      );
      if (match) deps.select(match.id);
    }

    deps.logInteraction('location_geolocate_failed', {
      reason: 'create',
      latitude: payload.latitude,
      longitude: payload.longitude,
      error,
    });
    return { ok: false, error };
  }
}
