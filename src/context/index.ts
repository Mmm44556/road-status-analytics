import { createContext } from "react";
import type { MapController } from "@/service/map/shared/mapController";

export const TrafficMapViewContext = createContext<{
  mapController: MapController;
}>({
  mapController: {
    attach: () => undefined,
    flyTo: () => undefined,
    fitTaiwan: () => undefined,
    fitCounty: () => undefined,
  setUserLocation: () => undefined,
  setSearchLocation: () => undefined,
    showGeometry: () => undefined,
    hideGeometry: () => undefined,
  },
});
