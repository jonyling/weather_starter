import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { logInteraction } from '../api';
import { mapClickAddLocation } from '../mapClickAddLocation';
import { useStore } from '../state/store';
import { CloseIcon, LocationIcon } from './icons';
import { DEFAULT_CENTER, mapView, pinHtml } from './mapPins';
import type { Location } from '../types';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function pinIcon(location: Location, selected: boolean): L.DivIcon {
  // Anchor bottom-centre so the dot sits exactly on the coordinate.
  return L.divIcon({
    html: pinHtml(location, selected),
    className: 'wx-pin-wrapper',
    iconSize: [120, 56],
    iconAnchor: [60, 56],
  });
}

function FitToLocations({ locations, padding }: { locations: Location[]; padding: number }) {
  const map = useMap();
  const key = locations.map((l) => `${l.id}:${l.latitude}:${l.longitude}`).join('|');

  useEffect(() => {
    map.invalidateSize();
    const view = mapView(locations);
    if (view.kind === 'bounds') {
      map.fitBounds(L.latLngBounds(view.points), { padding: [padding, padding], maxZoom: 13 });
    } else {
      map.setView(view.center, view.zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the relevant location data
  }, [map, key, padding]);

  return null;
}

function MapClickToAdd({
  enabled,
  onMapClick,
}: {
  enabled: boolean;
  onMapClick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

interface WeatherMapProps {
  interactive: boolean;
  onPinClick?: (id: number) => void;
  onMapClick?: (latitude: number, longitude: number) => void;
  clickToAddEnabled?: boolean;
}

function WeatherMap({
  interactive,
  onPinClick,
  onMapClick,
  clickToAddEnabled = false,
}: WeatherMapProps) {
  const { locations, selectedId } = useStore();
  const pins = useMemo(
    () => locations.map((l) => ({ location: l, icon: pinIcon(l, l.id === selectedId) })),
    [locations, selectedId],
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={11}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive && !clickToAddEnabled}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      attributionControl={interactive}
      className={`h-full w-full${clickToAddEnabled ? ' cursor-crosshair' : ''}`}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} className="wx-tiles" maxZoom={19} />
      <FitToLocations locations={locations} padding={interactive ? 80 : 30} />
      {onMapClick && (
        <MapClickToAdd enabled={clickToAddEnabled} onMapClick={onMapClick} />
      )}
      {pins.map(({ location, icon }) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
          icon={icon}
          interactive={interactive}
          keyboard={interactive}
          zIndexOffset={location.id === selectedId ? 1000 : 0}
          eventHandlers={onPinClick ? { click: () => onPinClick(location.id) } : undefined}
        />
      ))}
    </MapContainer>
  );
}

function ExpandIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

export function WeatherMapCard() {
  const { locations, select, create } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) {
      setMapError(null);
      setAdding(false);
    }
  }, [expanded]);

  const onMapClickAdd = async (latitude: number, longitude: number) => {
    if (adding) return;
    setAdding(true);
    setMapError(null);
    try {
      const result = await mapClickAddLocation(
        { latitude, longitude },
        { create, locations, select, logInteraction },
      );
      if (!result.ok) setMapError(result.error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl">
        <header className="flex items-center gap-1.5 px-4 pb-3 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          <LocationIcon className="h-3.5 w-3.5" />
          <span>Weather Map</span>
          <span className="ml-auto normal-case tracking-normal text-white/50">
            {locations.length} {locations.length === 1 ? 'location' : 'locations'}
          </span>
        </header>
        <div className="relative isolate h-64">
          {!expanded && <WeatherMap interactive={false} />}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand weather map to fullscreen"
            className="absolute inset-0 z-[500] cursor-pointer bg-transparent"
          />
          <span className="pointer-events-none absolute right-3 top-3 z-[501] flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
            <ExpandIcon />
            Expand
          </span>
        </div>
      </section>

      {expanded &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Weather map"
            className="fixed inset-0 z-[2000] isolate bg-[#1c2530]"
          >
            <WeatherMap
              interactive
              onPinClick={select}
              onMapClick={onMapClickAdd}
              clickToAddEnabled={!adding}
            />
            <div className="pointer-events-none absolute left-4 right-16 top-4 z-[1000] flex flex-col gap-2">
              <p className="w-fit rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                {adding ? 'Adding location…' : 'Click the map to add a location'}
              </p>
              {mapError && (
                <p
                  role="alert"
                  className="w-fit max-w-md rounded-md border border-red-300/30 bg-red-500/20 px-2.5 py-1.5 text-xs text-red-100 backdrop-blur"
                >
                  {mapError}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close fullscreen map"
              disabled={adding}
              className="absolute right-4 top-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
