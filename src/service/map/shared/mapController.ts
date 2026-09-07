export type LongitudeLatitude = [longitude: number, latitude: number];

export type MapGeometry =
  | { id: string; type: "point"; coordinates: LongitudeLatitude; color: string }
  | { id: string; type: "polygon"; coordinates: LongitudeLatitude[]; color: string }
  | {
      id: string;
      type: "linestring";
      coordinates: LongitudeLatitude[];
      color: string;
      /** 沿線重複顯示的文字（例如路線編號），同色也能直接讀出是哪一條。 */
      label?: string;
    };

export type MapAdapter = {
  flyTo: (center: LongitudeLatitude, zoom: number) => void;
  fitTaiwan: () => void;
  fitCounty: (countyId: string) => void;
  setUserLocation: (coordinate: LongitudeLatitude | null) => void;
  setSearchLocation: (coordinate: LongitudeLatitude | null) => void;
  showGeometry: (geometry: MapGeometry) => void;
  hideGeometry: (id: string) => void;
};

export type MapController = MapAdapter & {
  attach: (adapter: MapAdapter | null) => void;
};

/** 建立與地圖實作解耦的操作介面。 */
export function createMapController(): MapController {
  let adapter: MapAdapter | null = null;
  return {
    attach(nextAdapter) { adapter = nextAdapter; },
    flyTo(center, zoom) { adapter?.flyTo(center, zoom); },
    fitTaiwan() { adapter?.fitTaiwan(); },
    fitCounty(countyId) { adapter?.fitCounty(countyId); },
    setUserLocation(coordinate) { adapter?.setUserLocation(coordinate); },
    setSearchLocation(coordinate) { adapter?.setSearchLocation(coordinate); },
    showGeometry(geometry) { adapter?.showGeometry(geometry); },
    hideGeometry(id) { adapter?.hideGeometry(id); },
  };
}
