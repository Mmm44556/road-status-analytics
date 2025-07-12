import { createContext } from "react";
import MapView from "@arcgis/core/views/MapView";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";

export type FlyTo = (geometry: Polygon | Point | null) => void;

export const TrafficMapViewContext = createContext<{
  view: React.RefObject<MapView | null>;
}>({
  view: { current: null },
});
