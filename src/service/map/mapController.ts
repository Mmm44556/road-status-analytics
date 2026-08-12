export type LongitudeLatitude = [longitude: number, latitude: number];

export type MapGeometry =
  | { id: string; type: "point"; coordinates: LongitudeLatitude; color: string }
  | { id: string; type: "polygon"; coordinates: LongitudeLatitude[]; color: string };

export type MapAdapter = {
  flyTo: (center: LongitudeLatitude, zoom: number) => void;
  showGeometry: (geometry: MapGeometry) => void;
};

export type MapController = MapAdapter & {
  attach: (adapter: MapAdapter | null) => void;
};

export function createMapController(): MapController {
  let adapter: MapAdapter | null = null;
  return {
    attach(nextAdapter) { adapter = nextAdapter; },
    flyTo(center, zoom) { adapter?.flyTo(center, zoom); },
    showGeometry(geometry) { adapter?.showGeometry(geometry); },
  };
}
