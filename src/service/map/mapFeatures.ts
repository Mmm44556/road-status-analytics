import type { LiveRoadEvent, PreviewRoadEvent } from "@/service/trafficApi";

export type RoadEventMapPoint = {
  objectId: number;
  eventId: string;
  eventTitle: string;
  description: string;
  eventType: number;
  location: string;
  publishTime: string;
  sourceKind: "live" | "preview";
  longitude: number;
  latitude: number;
};

const isCoordinate = (longitude: number, latitude: number) =>
  Number.isFinite(longitude) &&
  Number.isFinite(latitude) &&
  longitude >= -180 && longitude <= 180 &&
  latitude >= -90 && latitude <= 90;

export function getWktRepresentativePoint(wkt: string): [number, number] | null {
  const pointMatch = wkt.match(/^POINT\s*\(\s*([^\s]+)\s+([^\s)]+)\s*\)$/i);
  if (pointMatch) {
    const longitude = Number(pointMatch[1]);
    const latitude = Number(pointMatch[2]);
    return isCoordinate(longitude, latitude) ? [longitude, latitude] : null;
  }

  const polygonMatch = wkt.match(/^POLYGON\s*\(\((.+)\)\)$/i);
  if (!polygonMatch) return null;
  const coordinates = polygonMatch[1].split(",").flatMap((pair) => {
    const [longitude, latitude] = pair.trim().split(/\s+/).map(Number);
    return isCoordinate(longitude, latitude) ? [[longitude, latitude] as const] : [];
  });
  if (coordinates.length === 0) return null;

  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ];
}

export function roadEventsToMapPoints(
  previewEvents: PreviewRoadEvent[],
  liveEvents: LiveRoadEvent[],
) {
  const points: RoadEventMapPoint[] = [];
  const seenIds = new Set<string>();

  const append = (
    event: PreviewRoadEvent | LiveRoadEvent,
    sourceKind: RoadEventMapPoint["sourceKind"],
    wkt: string,
  ) => {
    if (seenIds.has(event.EventID)) return;
    const coordinate = getWktRepresentativePoint(wkt);
    if (!coordinate) return;
    seenIds.add(event.EventID);
    points.push({
      objectId: points.length + 1,
      eventId: event.EventID,
      eventTitle: event.EventTitle,
      description: event.Description,
      eventType: event.EventType,
      location: event.Location.Other,
      publishTime: event.PublishTime,
      sourceKind,
      longitude: coordinate[0],
      latitude: coordinate[1],
    });
  };

  liveEvents.forEach((event) => append(event, "live", event.Positions));
  previewEvents.forEach((event) => append(event, "preview", event.Positions || event.Geometry));
  return points;
}
