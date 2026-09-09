import Feature, { type FeatureLike } from 'ol/Feature';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import MultiLineString from 'ol/geom/MultiLineString';
import Point from 'ol/geom/Point';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import { fromLonLat } from 'ol/proj';
import { uiColors } from '@/config/semanticColors';
import type { RouteResult } from '@/service/routeApi';

type RouteGeometry = RouteResult['geometry'];

/** 將 API 路線轉成投影後的線與起終點圖徵。 */
export function createRouteFeatures(geometry: RouteGeometry): Feature[] {
  const lines = geometry.coordinates.map((line) =>
    line.map((coordinate) => fromLonLat(coordinate)),
  );
  const route = new Feature({ geometry: new MultiLineString(lines) });
  route.set('routeFeatureKind', 'route');

  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];
  if (!firstLine?.length || !lastLine?.length) {
    throw new Error('Route geometry has no coordinates');
  }
  const origin = new Feature({ geometry: new Point(firstLine[0]) });
  origin.set('routeFeatureKind', 'origin');
  const destination = new Feature({
    geometry: new Point(lastLine[lastLine.length - 1]),
  });
  destination.set('routeFeatureKind', 'destination');
  return [route, origin, destination];
}

const routeLineStyle = [
  new Style({
    stroke: new Stroke({ color: 'rgba(255,255,255,.92)', width: 10 }),
    zIndex: 20,
  }),
  new Style({
    stroke: new Stroke({ color: uiColors.brand.teal, width: 6 }),
    zIndex: 21,
  }),
];

const endpointStyles = {
  origin: new Style({
    image: new CircleStyle({
      radius: 12,
      fill: new Fill({ color: uiColors.brand.ink }),
      stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
    }),
    text: new Text({
      text: '起',
      fill: new Fill({ color: '#FFFFFF' }),
      font: '700 11px "Noto Sans TC", sans-serif',
    }),
    zIndex: 23,
  }),
  destination: new Style({
    image: new CircleStyle({
      radius: 12,
      fill: new Fill({ color: uiColors.brand.teal }),
      stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
    }),
    text: new Text({
      text: '終',
      fill: new Fill({ color: '#FFFFFF' }),
      font: '700 11px "Noto Sans TC", sans-serif',
    }),
    zIndex: 23,
  }),
} as const;

/** 依路線圖徵種類套用線條或端點樣式。 */
export function getRouteFeatureStyle(feature: FeatureLike): Style | Style[] {
  const kind = feature.get('routeFeatureKind') as
    | 'route'
    | 'origin'
    | 'destination';
  if (kind === 'origin') return endpointStyles.origin;
  if (kind === 'destination') return endpointStyles.destination;
  return routeLineStyle;
}
