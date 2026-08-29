import { useEffect, useRef, useState, type RefObject } from 'react';
import Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { defaults as defaultControls } from 'ol/control/defaults';
import { boundingExtent } from 'ol/extent';
import { unByKey } from 'ol/Observable';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import IconStyle from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import { getRoadEventType } from '@/config/roadEventTypes';
import { trafficLayerCatalog } from '@/data/trafficLayerCatalog';
import { createClusteredPointLayer } from '@/service/map/shared/createClusteredPointLayer';
import { getTrafficLayerIconDataUrl } from '@/service/map/shared/layerIcon';
import type { MapController } from '@/service/map/shared/mapController';
import { getMapFeatureCursor } from '@/service/map/shared/mapInteractions';
import {
  getRoadEventPopupCoordinate,
  type RoadEventMapPoint,
} from '@/service/map/features/mapFeatures';
import { getNlscTileUrl } from '@/service/map/shared/nlscTiles';
import type { CctvMapPoint } from '@/service/map/features/cctvFeatures';
import type { VdMapPoint } from '@/service/map/features/vdFeatures';
import type { BikeMapPoint } from '@/service/map/features/bikeFeatures';
import type { MetroMapPoint } from '@/service/map/features/metroFeatures';
import type { ParkingLotMapPoint } from '@/service/map/features/parkingLotFeatures';
import type { ParkingSegmentMapPoint } from '@/service/map/features/parkingSegmentFeatures';
import { getCongestionPresentation } from '@/config/liveTraffic';
import type { LiveTrafficSegment } from '@/service/liveTrafficApi';
import type { useCctvLayer } from '@/service/map/layers/useCctvLayer';
import type { useLiveTrafficLayer } from '@/service/map/layers/useLiveTrafficLayer';
import type { useRoadEventLayer } from '@/service/map/layers/useRoadEventLayer';
import type { useVdLayer } from '@/service/map/layers/useVdLayer';
import type { useBikeLayer } from '@/service/map/layers/useBikeLayer';
import type { useMetroLayer } from '@/service/map/layers/useMetroLayer';
import type { useParkingLotLayer } from '@/service/map/layers/useParkingLotLayer';
import type { useParkingSegmentLayer } from '@/service/map/layers/useParkingSegmentLayer';

export type SelectedFeature =
  | { kind: 'event'; data: RoadEventMapPoint }
  | { kind: 'cctv'; data: CctvMapPoint }
  | { kind: 'liveTraffic'; data: LiveTrafficSegment }
  | { kind: 'vd'; data: VdMapPoint }
  | { kind: 'bike'; data: BikeMapPoint }
  | { kind: 'metro'; data: MetroMapPoint }
  | { kind: 'parkingLot'; data: ParkingLotMapPoint }
  | { kind: 'parkingSegment'; data: ParkingSegmentMapPoint };

const pointStyle = (color: string) =>
  new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
  });

const roadEventIconUrl = getTrafficLayerIconDataUrl('roadEvents', '#FFFFFF');
const roadEventStyleCache = new globalThis.Map<string, Style[]>();
/** 建立使用圖層 icon 與事件類別顏色的點位樣式。 */
const roadEventPointStyle = (color: string) => {
  const cached = roadEventStyleCache.get(color);
  if (cached) return cached;

  const styles = [
    new Style({
      image: new CircleStyle({
        radius: 16,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
      }),
    }),
    new Style({
      image: new IconStyle({ src: roadEventIconUrl, width: 20, height: 20 }),
    }),
  ];
  roadEventStyleCache.set(color, styles);
  return styles;
};

const cctvLayerDefinition = trafficLayerCatalog.find(
  (layer) => layer.id === 'cctv',
)!;
const cctvIconUrl = getTrafficLayerIconDataUrl('cctv', '#FFFFFF');
/** CCTV 只有單一語意色，樣式不需依 color 建立快取。 */
const cctvPointStyle = [
  new Style({
    image: new CircleStyle({
      radius: 16,
      fill: new Fill({ color: cctvLayerDefinition.color }),
      stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
  }),
  new Style({
    image: new IconStyle({ src: cctvIconUrl, width: 20, height: 20 }),
  }),
];

const vdLayerDefinition = trafficLayerCatalog.find(
  (layer) => layer.id === 'vehicleDetectors',
)!;
const vdIconUrl = getTrafficLayerIconDataUrl('vehicleDetectors', '#FFFFFF');
/** VD 只有單一語意色，樣式不需依 color 建立快取。 */
const vdPointStyle = [
  new Style({
    image: new CircleStyle({
      radius: 16,
      fill: new Fill({ color: vdLayerDefinition.color }),
      stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
  }),
  new Style({
    image: new IconStyle({ src: vdIconUrl, width: 20, height: 20 }),
  }),
];

const bikeLayerDefinition = trafficLayerCatalog.find(
  (layer) => layer.id === 'bikeShare',
)!;
const bikeIconUrl = getTrafficLayerIconDataUrl('bikeShare', '#FFFFFF');
/** YouBike 只有單一語意色，樣式不需依 color 建立快取。 */
const bikePointStyle = [
  new Style({
    image: new CircleStyle({
      radius: 16,
      fill: new Fill({ color: bikeLayerDefinition.color }),
      stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
  }),
  new Style({
    image: new IconStyle({ src: bikeIconUrl, width: 20, height: 20 }),
  }),
];

const metroLayerDefinition = trafficLayerCatalog.find(
  (layer) => layer.id === 'metro',
)!;
const metroIconUrl = getTrafficLayerIconDataUrl('metro', '#FFFFFF');
/** 捷運／輕軌只有單一語意色，樣式不需依 color 建立快取。 */
const metroPointStyle = [
  new Style({
    image: new CircleStyle({
      radius: 16,
      fill: new Fill({ color: metroLayerDefinition.color }),
      stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
  }),
  new Style({
    image: new IconStyle({ src: metroIconUrl, width: 20, height: 20 }),
  }),
];

const parkingLotLayerDefinition = trafficLayerCatalog.find(
  (layer) => layer.id === 'parkingLots',
)!;
const parkingLotIconUrl = getTrafficLayerIconDataUrl('parkingLots', '#FFFFFF');
/** 戶外停車場只有單一語意色，樣式不需依 color 建立快取。 */
const parkingLotPointStyle = [
  new Style({
    image: new CircleStyle({
      radius: 16,
      fill: new Fill({ color: parkingLotLayerDefinition.color }),
      stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
  }),
  new Style({
    image: new IconStyle({ src: parkingLotIconUrl, width: 20, height: 20 }),
  }),
];

const parkingSegmentLayerDefinition = trafficLayerCatalog.find(
  (layer) => layer.id === 'parkingSegments',
)!;
const parkingSegmentIconUrl = getTrafficLayerIconDataUrl('parkingSegments', '#FFFFFF');
/** 路邊停車格只有單一語意色，樣式不需依 color 建立快取。 */
const parkingSegmentPointStyle = [
  new Style({
    image: new CircleStyle({
      radius: 16,
      fill: new Fill({ color: parkingSegmentLayerDefinition.color }),
      stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
  }),
  new Style({
    image: new IconStyle({ src: parkingSegmentIconUrl, width: 20, height: 20 }),
  }),
];

const liveTrafficStyleCache = new globalThis.Map<number, Style>();
/** 路況線色只依壅塞等級變化，快取樣式避免每次重繪重建物件。 */
const getLiveTrafficStyle = (congestionLevel: number) => {
  const cached = liveTrafficStyleCache.get(congestionLevel);
  if (cached) return cached;
  const style = new Style({
    stroke: new Stroke({
      color: getCongestionPresentation(congestionLevel).color,
      width: 5,
    }),
    zIndex: Math.max(congestionLevel, 0),
  });
  liveTrafficStyleCache.set(congestionLevel, style);
  return style;
};

type UseTrafficMapOptions = {
  mapContainer: RefObject<HTMLDivElement | null>;
  popupContainer: HTMLDivElement;
  mapController: MapController;
  roadEventLayer: ReturnType<typeof useRoadEventLayer>;
  cctvLayer: ReturnType<typeof useCctvLayer>;
  liveTrafficLayer: ReturnType<typeof useLiveTrafficLayer>;
  vdLayer: ReturnType<typeof useVdLayer>;
  bikeLayer: ReturnType<typeof useBikeLayer>;
  metroLayer: ReturnType<typeof useMetroLayer>;
  parkingLotLayer: ReturnType<typeof useParkingLotLayer>;
  parkingSegmentLayer: ReturnType<typeof useParkingSegmentLayer>;
  showRoadEvents: boolean;
  showCctv: boolean;
  showLiveTraffic: boolean;
  showVehicleDetectors: boolean;
  showBikeShare: boolean;
  showMetro: boolean;
  showParkingLots: boolean;
  showParkingSegments: boolean;
};

type UseTrafficMapResult = {
  isLoading: boolean;
  selectedFeature: SelectedFeature | null;
  closePopup: () => void;
};

/** 建立並管理 OpenLayers 地圖：底圖、道路事件／CCTV 圖層、hover 與點擊互動、popup 選取狀態。 */
export function useTrafficMap({
  mapContainer,
  popupContainer,
  mapController,
  roadEventLayer,
  cctvLayer,
  liveTrafficLayer,
  vdLayer,
  bikeLayer,
  metroLayer,
  parkingLotLayer,
  parkingSegmentLayer,
  showRoadEvents,
  showCctv,
  showLiveTraffic,
  showVehicleDetectors,
  showBikeShare,
  showMetro,
  showParkingLots,
  showParkingSegments,
}: UseTrafficMapOptions): UseTrafficMapResult {
  const popupOverlayRef = useRef<Overlay | null>(null);
  const highlightSourceRef = useRef(new VectorSource());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(
    null,
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    const roadEvents = createClusteredPointLayer({
      source: roadEventLayer.sourceRef.current,
      hullFillColor: 'rgba(11,124,116,.14)',
      hullStrokeColor: 'rgba(11,124,116,.72)',
      singleStyle: (feature) => {
        const event = feature.get('event') as RoadEventMapPoint;
        return roadEventPointStyle(getRoadEventType(event.eventType).main);
      },
    });
    // CCTV 各自 cluster，避免與道路事件的聚合數字混在一起。
    const cctv = createClusteredPointLayer({
      source: cctvLayer.sourceRef.current,
      hullFillColor: 'rgba(27,120,149,.14)',
      hullStrokeColor: 'rgba(27,120,149,.72)',
      singleStyle: () => cctvPointStyle,
    });
    // VD 各自 cluster，避免與道路事件、CCTV 的聚合數字混在一起。
    const vd = createClusteredPointLayer({
      source: vdLayer.sourceRef.current,
      hullFillColor: 'rgba(166,56,107,.14)',
      hullStrokeColor: 'rgba(166,56,107,.72)',
      singleStyle: () => vdPointStyle,
    });
    // YouBike 各自 cluster，避免與道路事件、CCTV、VD 的聚合數字混在一起。
    const bike = createClusteredPointLayer({
      source: bikeLayer.sourceRef.current,
      hullFillColor: 'rgba(184,134,11,.14)',
      hullStrokeColor: 'rgba(184,134,11,.72)',
      singleStyle: () => bikePointStyle,
    });
    // 捷運／輕軌各自 cluster，避免與其他點位圖層的聚合數字混在一起。
    const metro = createClusteredPointLayer({
      source: metroLayer.sourceRef.current,
      hullFillColor: 'rgba(44,95,138,.14)',
      hullStrokeColor: 'rgba(44,95,138,.72)',
      singleStyle: () => metroPointStyle,
    });
    // 戶外停車場各自 cluster，避免與其他點位圖層的聚合數字混在一起。
    const parkingLot = createClusteredPointLayer({
      source: parkingLotLayer.sourceRef.current,
      hullFillColor: 'rgba(47,104,68,.14)',
      hullStrokeColor: 'rgba(47,104,68,.72)',
      singleStyle: () => parkingLotPointStyle,
    });
    // 路邊停車格各自 cluster，避免與其他點位圖層的聚合數字混在一起。
    const parkingSegment = createClusteredPointLayer({
      source: parkingSegmentLayer.sourceRef.current,
      hullFillColor: 'rgba(63,78,156,.14)',
      hullStrokeColor: 'rgba(63,78,156,.72)',
      singleStyle: () => parkingSegmentPointStyle,
    });
    const liveTraffic = new VectorLayer({
      source: liveTrafficLayer.sourceRef.current,
      style: (feature) => {
        const segment = feature.get('liveTraffic') as LiveTrafficSegment;
        return getLiveTrafficStyle(segment.congestionLevel);
      },
    });
    const highlightLayer = new VectorLayer({
      source: highlightSourceRef.current,
    });
    // Popup 由 OpenLayers 管理位置，React 只負責內容。
    const popupOverlay = new Overlay({
      element: popupContainer,
      positioning: 'bottom-center',
      offset: [0, -16],
      stopEvent: true,
      autoPan: { animation: { duration: 250 }, margin: 24 },
    });
    popupOverlayRef.current = popupOverlay;
    const map = new OlMap({
      target: mapContainer.current,
      overlays: [popupOverlay],
      layers: [
        new TileLayer({
          source: new XYZ({
            attributions: '內政部國土測繪中心',
            tileUrlFunction: getNlscTileUrl,
            crossOrigin: 'anonymous',
          }),
        }),
        liveTraffic,
        roadEvents.hullLayer,
        roadEvents.dataLayer,
        cctv.hullLayer,
        cctv.dataLayer,
        vd.hullLayer,
        vd.dataLayer,
        bike.hullLayer,
        bike.dataLayer,
        metro.hullLayer,
        metro.dataLayer,
        parkingLot.hullLayer,
        parkingLot.dataLayer,
        parkingSegment.hullLayer,
        parkingSegment.dataLayer,
        highlightLayer,
      ],
      view: new View({
        center: fromLonLat([120.6478, 24.1477]),
        zoom: 12,
        minZoom: 7,
      }),
      controls: defaultControls({
        rotate: false,
        zoom: false,
        attribution: true,
      }),
    });
    const renderKey = map.once('rendercomplete', () => setIsLoading(false));

    const flyTo = (center: [number, number], zoom: number) => {
      map
        .getView()
        .animate({ center: fromLonLat(center), zoom, duration: 650 });
    };
    // 將 OpenLayers 操作封裝給頁面工具列與後續 AI 路線功能使用。
    mapController.attach({
      flyTo,
      showGeometry: (geometry) => {
        if (highlightSourceRef.current.getFeatureById(geometry.id)) {
          const feature = highlightSourceRef.current.getFeatureById(
            geometry.id,
          );
          const existingGeometry = feature?.getGeometry();
          if (
            existingGeometry instanceof Point ||
            existingGeometry instanceof Polygon
          ) {
            map.getView().fit(existingGeometry, {
              maxZoom: 18,
              duration: 650,
              padding: [64, 64, 64, 64],
            });
          }
          return;
        }
        const projected =
          geometry.type === 'point'
            ? new Point(fromLonLat(geometry.coordinates))
            : new Polygon([
                geometry.coordinates.map((coordinate) =>
                  fromLonLat(coordinate),
                ),
              ]);
        const feature = new Feature({ geometry: projected });
        feature.setId(geometry.id);
        feature.setStyle(
          geometry.type === 'point'
            ? pointStyle(geometry.color)
            : new Style({
                fill: new Fill({ color: `${geometry.color}33` }),
                stroke: new Stroke({ color: geometry.color, width: 3 }),
              }),
        );
        highlightSourceRef.current.addFeature(feature);
        map.getView().fit(projected, {
          maxZoom: 18,
          duration: 650,
          padding: [64, 64, 64, 64],
        });
      },
    });

    let isDisposed = false;
    const clearClusterHover = () => {
      roadEvents.setHoverFeature(undefined);
      cctv.setHoverFeature(undefined);
      vd.setHoverFeature(undefined);
      bike.setHoverFeature(undefined);
      metro.setHoverFeature(undefined);
      parkingLot.setHoverFeature(undefined);
      parkingSegment.setHoverFeature(undefined);
      map.getTargetElement().style.cursor = '';
    };
    const pointerMoveKey = map.on('pointermove', (pointerEvent) => {
      if (pointerEvent.dragging) return clearClusterHover();

      Promise.all([
        roadEvents.dataLayer.getFeatures(pointerEvent.pixel),
        cctv.dataLayer.getFeatures(pointerEvent.pixel),
        vd.dataLayer.getFeatures(pointerEvent.pixel),
        bike.dataLayer.getFeatures(pointerEvent.pixel),
        metro.dataLayer.getFeatures(pointerEvent.pixel),
        parkingLot.dataLayer.getFeatures(pointerEvent.pixel),
        parkingSegment.dataLayer.getFeatures(pointerEvent.pixel),
        liveTraffic.getFeatures(pointerEvent.pixel),
      ]).then(([eventFeatures, cctvFeatures, vdFeatures, bikeFeatures, metroFeatures, parkingLotFeatures, parkingSegmentFeatures, liveTrafficFeatures]) => {
        if (isDisposed) return;
        const feature = eventFeatures[0] as Feature<Point> | undefined;
        const members = feature?.get('features') as
          | Feature<Point>[]
          | undefined;
        roadEvents.setHoverFeature(
          members && members.length > 1 ? feature : undefined,
        );

        const cctvFeature = cctvFeatures[0] as Feature<Point> | undefined;
        const cctvMembers = cctvFeature?.get('features') as
          | Feature<Point>[]
          | undefined;
        cctv.setHoverFeature(
          cctvMembers && cctvMembers.length > 1 ? cctvFeature : undefined,
        );

        const vdFeature = vdFeatures[0] as Feature<Point> | undefined;
        const vdMembers = vdFeature?.get('features') as
          | Feature<Point>[]
          | undefined;
        vd.setHoverFeature(
          vdMembers && vdMembers.length > 1 ? vdFeature : undefined,
        );

        const bikeFeature = bikeFeatures[0] as Feature<Point> | undefined;
        const bikeMembers = bikeFeature?.get('features') as
          | Feature<Point>[]
          | undefined;
        bike.setHoverFeature(
          bikeMembers && bikeMembers.length > 1 ? bikeFeature : undefined,
        );

        const metroFeature = metroFeatures[0] as Feature<Point> | undefined;
        const metroMembers = metroFeature?.get('features') as
          | Feature<Point>[]
          | undefined;
        metro.setHoverFeature(
          metroMembers && metroMembers.length > 1 ? metroFeature : undefined,
        );

        const parkingLotFeature = parkingLotFeatures[0] as Feature<Point> | undefined;
        const parkingLotMembers = parkingLotFeature?.get('features') as
          | Feature<Point>[]
          | undefined;
        parkingLot.setHoverFeature(
          parkingLotMembers && parkingLotMembers.length > 1 ? parkingLotFeature : undefined,
        );

        const parkingSegmentFeature = parkingSegmentFeatures[0] as Feature<Point> | undefined;
        const parkingSegmentMembers = parkingSegmentFeature?.get('features') as
          | Feature<Point>[]
          | undefined;
        parkingSegment.setHoverFeature(
          parkingSegmentMembers && parkingSegmentMembers.length > 1
            ? parkingSegmentFeature
            : undefined,
        );

        map.getTargetElement().style.cursor = getMapFeatureCursor(
          Boolean(
            feature ||
              cctvFeature ||
              vdFeature ||
              bikeFeature ||
              metroFeature ||
              parkingLotFeature ||
              parkingSegmentFeature ||
              liveTrafficFeatures[0],
          ),
        );
      });
    });
    map.getViewport().addEventListener('pointerleave', clearClusterHover);

    // 點選聚合中的多個成員時，先放大至可分辨範圍，而非直接顯示清單。
    const fitToClusterMembers = (members: Feature<Point>[]) => {
      const extent = boundingExtent(
        members.map((member) => member.getGeometry()!.getCoordinates()),
      );
      map.getView().fit(extent, {
        duration: 650,
        padding: [72, 72, 72, 72],
        maxZoom: 17,
      });
      popupOverlay.setPosition(undefined);
      setSelectedFeature(null);
    };

    // 命中順序需對應圖層的視覺疊放順序（由上而下），道路事件／CCTV 的點位
    // 畫在即時路況線之上，若優先查線圖層，疊在線上的點位會永遠點不到。
    const clickKey = map.on('singleclick', async (clickEvent) => {
      const eventFeatures = await roadEvents.dataLayer.getFeatures(
        clickEvent.pixel,
      );
      if (eventFeatures.length) {
        const members = eventFeatures[0].get('features') as Feature<Point>[];
        if (members.length > 1) return fitToClusterMembers(members);

        const event = members[0].get('event') as RoadEventMapPoint;
        setSelectedFeature({ kind: 'event', data: event });
        popupOverlay.setPosition(fromLonLat(getRoadEventPopupCoordinate(event)));
        return;
      }

      const cctvFeatures = await cctv.dataLayer.getFeatures(clickEvent.pixel);
      if (cctvFeatures.length) {
        const members = cctvFeatures[0].get('features') as Feature<Point>[];
        if (members.length > 1) return fitToClusterMembers(members);

        const cctvPoint = members[0].get('cctv') as CctvMapPoint;
        setSelectedFeature({ kind: 'cctv', data: cctvPoint });
        popupOverlay.setPosition(
          fromLonLat([cctvPoint.longitude, cctvPoint.latitude]),
        );
        return;
      }

      const vdFeatures = await vd.dataLayer.getFeatures(clickEvent.pixel);
      if (vdFeatures.length) {
        const members = vdFeatures[0].get('features') as Feature<Point>[];
        if (members.length > 1) return fitToClusterMembers(members);

        const vdPoint = members[0].get('vd') as VdMapPoint;
        setSelectedFeature({ kind: 'vd', data: vdPoint });
        popupOverlay.setPosition(fromLonLat([vdPoint.longitude, vdPoint.latitude]));
        return;
      }

      const bikeFeatures = await bike.dataLayer.getFeatures(clickEvent.pixel);
      if (bikeFeatures.length) {
        const members = bikeFeatures[0].get('features') as Feature<Point>[];
        if (members.length > 1) return fitToClusterMembers(members);

        const bikePoint = members[0].get('bike') as BikeMapPoint;
        setSelectedFeature({ kind: 'bike', data: bikePoint });
        popupOverlay.setPosition(fromLonLat([bikePoint.longitude, bikePoint.latitude]));
        return;
      }

      const metroFeatures = await metro.dataLayer.getFeatures(clickEvent.pixel);
      if (metroFeatures.length) {
        const members = metroFeatures[0].get('features') as Feature<Point>[];
        if (members.length > 1) return fitToClusterMembers(members);

        const metroPoint = members[0].get('metro') as MetroMapPoint;
        setSelectedFeature({ kind: 'metro', data: metroPoint });
        popupOverlay.setPosition(fromLonLat([metroPoint.longitude, metroPoint.latitude]));
        return;
      }

      const parkingLotFeatures = await parkingLot.dataLayer.getFeatures(clickEvent.pixel);
      if (parkingLotFeatures.length) {
        const members = parkingLotFeatures[0].get('features') as Feature<Point>[];
        if (members.length > 1) return fitToClusterMembers(members);

        const parkingLotPoint = members[0].get('parkingLot') as ParkingLotMapPoint;
        setSelectedFeature({ kind: 'parkingLot', data: parkingLotPoint });
        popupOverlay.setPosition(
          fromLonLat([parkingLotPoint.longitude, parkingLotPoint.latitude]),
        );
        return;
      }

      const parkingSegmentFeatures = await parkingSegment.dataLayer.getFeatures(
        clickEvent.pixel,
      );
      if (parkingSegmentFeatures.length) {
        const members = parkingSegmentFeatures[0].get('features') as Feature<Point>[];
        if (members.length > 1) return fitToClusterMembers(members);

        const parkingSegmentPoint = members[0].get('parkingSegment') as ParkingSegmentMapPoint;
        setSelectedFeature({ kind: 'parkingSegment', data: parkingSegmentPoint });
        popupOverlay.setPosition(
          fromLonLat([parkingSegmentPoint.longitude, parkingSegmentPoint.latitude]),
        );
        return;
      }

      const liveTrafficFeatures = await liveTraffic.getFeatures(clickEvent.pixel);
      if (!liveTrafficFeatures.length) {
        popupOverlay.setPosition(undefined);
        setSelectedFeature(null);
        return;
      }
      const segment = liveTrafficFeatures[0].get(
        'liveTraffic',
      ) as LiveTrafficSegment;
      setSelectedFeature({ kind: 'liveTraffic', data: segment });
      popupOverlay.setPosition(clickEvent.coordinate);
    });

    return () => {
      isDisposed = true;
      map.getViewport().removeEventListener('pointerleave', clearClusterHover);
      mapController.attach(null);
      unByKey([renderKey, pointerMoveKey, clickKey]);
      roadEvents.dispose();
      cctv.dispose();
      vd.dispose();
      bike.dispose();
      metro.dispose();
      parkingLot.dispose();
      parkingSegment.dispose();
      popupOverlayRef.current = null;
      map.setTarget(undefined);
    };
  }, [
    mapContainer,
    mapController,
    popupContainer,
    roadEventLayer.sourceRef,
    cctvLayer.sourceRef,
    vdLayer.sourceRef,
    bikeLayer.sourceRef,
    metroLayer.sourceRef,
    parkingLotLayer.sourceRef,
    parkingSegmentLayer.sourceRef,
    liveTrafficLayer.sourceRef,
  ]);

  useEffect(() => {
    popupOverlayRef.current?.setPosition(undefined);
    setSelectedFeature(null);
  }, [roadEventLayer.points, showRoadEvents]);

  useEffect(() => {
    popupOverlayRef.current?.setPosition(undefined);
    setSelectedFeature(null);
  }, [cctvLayer.points, showCctv]);

  useEffect(() => {
    // VD 也支援單點手動刷新，理由同 YouBike：資料更新時不能整批關閉 popup，
    // 只有「圖層關閉」或「該點真的從清單中消失」才關閉。
    setSelectedFeature((current) => {
      if (current?.kind !== 'vd') return current;
      if (!showVehicleDetectors) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      const updated = vdLayer.points.find((point) => point.id === current.data.id);
      if (!updated) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      return { kind: 'vd', data: updated };
    });
  }, [vdLayer.points, showVehicleDetectors]);

  useEffect(() => {
    // YouBike 支援單點手動刷新，資料更新時不能整批關閉 popup，
    // 只有「圖層關閉」或「該站真的從清單中消失」才關閉；其餘情況換成最新的點位資料，
    // 讓 popup 就地反映最新內容（包含定期輪詢帶來的更新）。
    setSelectedFeature((current) => {
      if (current?.kind !== 'bike') return current;
      if (!showBikeShare) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      const updated = bikeLayer.points.find((point) => point.id === current.data.id);
      if (!updated) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      return { kind: 'bike', data: updated };
    });
  }, [bikeLayer.points, showBikeShare]);

  useEffect(() => {
    // 捷運／輕軌也支援單點手動刷新，理由同 YouBike／VD：資料更新時不能整批
    // 關閉 popup，只有「圖層關閉」或「該站真的從清單中消失」才關閉。
    setSelectedFeature((current) => {
      if (current?.kind !== 'metro') return current;
      if (!showMetro) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      const updated = metroLayer.points.find((point) => point.id === current.data.id);
      if (!updated) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      return { kind: 'metro', data: updated };
    });
  }, [metroLayer.points, showMetro]);

  useEffect(() => {
    // 戶外停車場也支援單點手動刷新，理由同 YouBike／VD／捷運：資料更新時不能
    // 整批關閉 popup，只有「圖層關閉」或「該站真的從清單中消失」才關閉。
    setSelectedFeature((current) => {
      if (current?.kind !== 'parkingLot') return current;
      if (!showParkingLots) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      const updated = parkingLotLayer.points.find((point) => point.id === current.data.id);
      if (!updated) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      return { kind: 'parkingLot', data: updated };
    });
  }, [parkingLotLayer.points, showParkingLots]);

  useEffect(() => {
    // 路邊停車格也支援單點手動刷新，理由同其他點位圖層：資料更新時不能整批
    // 關閉 popup，只有「圖層關閉」或「該路段真的從清單中消失」才關閉。
    setSelectedFeature((current) => {
      if (current?.kind !== 'parkingSegment') return current;
      if (!showParkingSegments) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      const updated = parkingSegmentLayer.points.find((point) => point.id === current.data.id);
      if (!updated) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      return { kind: 'parkingSegment', data: updated };
    });
  }, [parkingSegmentLayer.points, showParkingSegments]);

  useEffect(() => {
    popupOverlayRef.current?.setPosition(undefined);
    setSelectedFeature(null);
  }, [liveTrafficLayer.segments, showLiveTraffic]);

  const closePopup = () => {
    popupOverlayRef.current?.setPosition(undefined);
    setSelectedFeature(null);
  };

  return { isLoading, selectedFeature, closePopup };
}
