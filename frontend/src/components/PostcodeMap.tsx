import { useEffect } from 'react';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  useMap,
} from './ui/mapcn-map-marker';
import {
  UK_CENTER,
  UK_DEFAULT_ZOOM,
  UK_MAX_BOUNDS,
  UK_MAX_ZOOM,
  UK_MIN_ZOOM,
  UK_POSTCODE_ZOOM,
} from '../lib/ukMap';

export interface MapTarget {
  postcode: string;
  longitude: number;
  latitude: number;
  place?: string | null;
}

interface PostcodeMapProps {
  target: MapTarget | null;
  className?: string;
}

/** Flies the map to the active target whenever it changes. */
function FlyToTarget({ target }: { target: MapTarget | null }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !target) return;
    // Shift the camera up so the marker lands in the upper half of the hero,
    // clear of the overlaid search card at the bottom. Negative y moves the
    // marker upward on screen (camera center is offset below the marker).
    const offsetY = -Math.min(map.getContainer().clientHeight * 0.28, 160);
    map.flyTo({
      center: [target.longitude, target.latitude],
      zoom: UK_POSTCODE_ZOOM,
      offset: [0, offsetY],
      duration: 1400,
      essential: true,
    });
  }, [map, isLoaded, target]);

  return null;
}

/** A flare-coloured pin with a soft pulsing halo, styled to match the app. */
function BrandedMarker() {
  return (
    <div className="relative grid h-5 w-5 place-items-center">
      <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-flare/30" />
      <span className="absolute inline-flex h-5 w-5 rounded-full bg-flare/20" />
      <span className="relative h-3.5 w-3.5 rounded-full border-2 border-white bg-flare shadow-lift" />
    </div>
  );
}

export default function PostcodeMap({ target, className }: PostcodeMapProps) {
  const initialCenter: [number, number] = target
    ? [target.longitude, target.latitude]
    : UK_CENTER;
  const initialZoom = target ? UK_POSTCODE_ZOOM : UK_DEFAULT_ZOOM;

  return (
    <Map
      className={className}
      theme="light"
      center={initialCenter}
      zoom={initialZoom}
      minZoom={UK_MIN_ZOOM}
      maxZoom={UK_MAX_ZOOM}
      maxBounds={UK_MAX_BOUNDS}
      attributionControl={false}
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
    >
      <FlyToTarget target={target} />

      <MapControls position="top-right" showZoom />

      {target && (
        <MapMarker
          longitude={target.longitude}
          latitude={target.latitude}
          anchor="bottom"
        >
          <MarkerContent>
            <BrandedMarker />
          </MarkerContent>
          <MarkerPopup offset={20}>
            <div className="space-y-1">
              <p className="nums text-sm font-bold tracking-tight text-ink">
                {target.postcode}
              </p>
              {target.place && (
                <p className="text-xs text-ink-mute">{target.place}</p>
              )}
            </div>
          </MarkerPopup>
        </MapMarker>
      )}
    </Map>
  );
}
