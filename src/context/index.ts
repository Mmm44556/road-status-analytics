import { createContext } from "react";
import type { MapController } from "@/service/map/mapController";

export const TrafficMapViewContext = createContext<{
  mapController: MapController;
}>({
  mapController: {
    attach: () => undefined,
    flyTo: () => undefined,
    showGeometry: () => undefined,
  },
});
