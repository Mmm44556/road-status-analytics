import type Feature from 'ol/Feature';
import FeatureClass from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type Point from 'ol/geom/Point';
import PointClass from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import { unByKey } from 'ol/Observable';
import { typographyTokens } from '@/config/designTokens';
import { createClusterExpansionCoordinates } from '@/service/map/shared/clusterExpansion';
import { createConvexHull, type MapCoordinate } from '@/service/map/shared/clusterHull';
import { getClusterLevel } from '@/service/map/shared/clusterLevel';

type CreateClusteredPointLayerOptions = {
  source: VectorSource;
  distance?: number;
  minDistance?: number;
  hullFillColor: string;
  hullStrokeColor: string;
  /** 單一點位（未聚合）的樣式，由各圖層依自己的資料決定。 */
  singleStyle: (feature: Feature<Point>) => Style | Style[];
};

export type ClusteredPointLayer = {
  hullLayer: VectorLayer;
  dataLayer: VectorLayer;
  expansionLegLayer: VectorLayer;
  expansionDataLayer: VectorLayer;
  clusterSource: Cluster;
  setHoverFeature: (feature: Feature<Point> | undefined) => void;
  expand: (
    members: Feature<Point>[],
    center: MapCoordinate,
    resolution: number,
  ) => void;
  clearExpansion: () => void;
  getExpandedMember: (feature: Feature | undefined) => Feature<Point> | undefined;
  dispose: () => void;
};

/** 建立聚合點位圖層：hover 凸包＋依聚合數量分級的樣式，供各圖層共用。 */
export function createClusteredPointLayer({
  source,
  distance = 64,
  minDistance = 20,
  hullFillColor,
  hullStrokeColor,
  singleStyle,
}: CreateClusteredPointLayerOptions): ClusteredPointLayer {
  const clusterSource = new Cluster({ distance, minDistance, source });

  let hoverFeature: Feature<Point> | undefined;
  const hullLayer = new VectorLayer({
    source: clusterSource,
    style: (feature) => {
      if (feature !== hoverFeature) return undefined;
      const members = feature.get('features') as Feature<Point>[];
      const hull = createConvexHull(
        members.map(
          (member) => member.getGeometry()!.getCoordinates() as MapCoordinate,
        ),
      );
      if (!hull) return undefined;

      return new Style({
        geometry: new Polygon([hull]),
        fill: new Fill({ color: hullFillColor }),
        stroke: new Stroke({ color: hullStrokeColor, width: 2 }),
      });
    },
  });

  const styleCache = new globalThis.Map<number, Style[]>();
  const dataLayer = new VectorLayer({
    source: clusterSource,
    style: (feature) => {
      const members = feature.get('features') as Feature<Point>[];
      const size = members.length;
      if (size === 1) return singleStyle(members[0]);

      let style = styleCache.get(size);
      if (!style) {
        const level = getClusterLevel(size);
        style = [
          new Style({
            image: new CircleStyle({
              radius: level.radius,
              fill: new Fill({ color: level.color }),
              stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
            }),
          }),
          new Style({
            text: new Text({
              text: String(size),
              fill: new Fill({ color: '#FFFFFF' }),
              stroke: new Stroke({ color: 'rgba(16,47,58,.6)', width: 2 }),
              font: `${typographyTokens.fontWeight.bold} ${typographyTokens.fontSize.metadata} Inter, sans-serif`,
            }),
          }),
        ];
        styleCache.set(size, style);
      }
      return style;
    },
  });

  const expansionLegSource = new VectorSource();
  const expansionPointSource = new VectorSource();
  const expansionLegLayer = new VectorLayer({
    source: expansionLegSource,
    style: new Style({
      stroke: new Stroke({ color: hullStrokeColor, width: 1.5 }),
    }),
  });
  const expansionDataLayer = new VectorLayer({
    source: expansionPointSource,
    style: (feature) => {
      const member = feature.get('clusterMember') as Feature<Point> | undefined;
      return member ? singleStyle(member) : undefined;
    },
  });

  /** 清除目前圖層展開的 spiderfy 點位與連接線。 */
  const clearExpansion = () => {
    expansionLegSource.clear();
    expansionPointSource.clear();
  };
  const sourceChangeKey = source.on('change', clearExpansion);

  return {
    hullLayer,
    dataLayer,
    expansionLegLayer,
    expansionDataLayer,
    clusterSource,
    setHoverFeature: (feature) => {
      if (feature === hoverFeature) return;
      hoverFeature = feature;
      hullLayer.changed();
    },
    expand: (members, center, resolution) => {
      clearExpansion();
      const coordinates = createClusterExpansionCoordinates(
        members.length,
        center,
        resolution,
      );
      coordinates.forEach((coordinate, index) => {
        expansionLegSource.addFeature(
          new FeatureClass({
            geometry: new LineString([center, coordinate]),
          }),
        );
        expansionPointSource.addFeature(
          new FeatureClass({
            geometry: new PointClass(coordinate),
            clusterMember: members[index],
          }),
        );
      });
    },
    clearExpansion,
    getExpandedMember: (feature) =>
      feature?.get('clusterMember') as Feature<Point> | undefined,
    dispose: () => {
      clearExpansion();
      unByKey(sourceChangeKey);
      clusterSource.setSource(null);
    },
  };
}
