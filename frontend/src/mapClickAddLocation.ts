import type { CreateLocationPayload, Location } from './types';
import { isDuplicateCreateError } from './useMyLocation';

export interface MapClickCoords {
  latitude: number;
  longitude: number;
}

export interface MapClickAddLocationDeps {
  create: (payload: CreateLocationPayload) => Promise<void>;
  locations: Location[];
  select: (id: number | null) => void;
  logInteraction: (event: string, metadata?: object) => void;
}

export type MapClickAddLocationResult = { ok: true } | { ok: false; error: string };

/**
 * Primary seam for map click-to-add: injectable create (+ select/list for 409).
 * Posts raw click coordinates through the existing create-location path.
 */
export async function mapClickAddLocation(
  coords: MapClickCoords,
  deps: MapClickAddLocationDeps,
): Promise<MapClickAddLocationResult> {
  const payload: CreateLocationPayload = {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

  deps.logInteraction('location_map_click_add_clicked', {
    latitude: payload.latitude,
    longitude: payload.longitude,
  });

  try {
    await deps.create(payload);
    deps.logInteraction('location_map_click_add_succeeded', {
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

    deps.logInteraction('location_map_click_add_failed', {
      latitude: payload.latitude,
      longitude: payload.longitude,
      error,
    });
    return { ok: false, error };
  }
}
