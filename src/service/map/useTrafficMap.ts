import { useEffect, useRef, useState, type RefObject } from 'react';
import Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import LineString from 'ol/geom/LineString';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { defaults as defaultControls } from 'ol/control/defaults';
import ScaleLine from 'ol/control/ScaleLine';
import type { Coordinate } from 'ol/coordinate';
import { boundingExtent } from 'ol/extent';
import { unByKey } from 'ol/Observable';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import IconStyle from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import GeoJSON from 'ol/format/GeoJSON';
import { getRoadEventType } from '@/config/roadEventTypes';
import { trafficLayerCatalog } from '@/data/trafficLayerCatalog';
import { createClusteredPointLayer } from '@/service/map/shared/createClusteredPointLayer';
import { shouldExpandCluster } from '@/service/map/shared/clusterExpansion';
import { getTrafficLayerIconDataUrl } from '@/service/map/shared/layerIcon';
import type {
  LongitudeLatitude,
  MapController,
} from '@/service/map/shared/mapController';
import {
  getClusterHoverFeature,
  getClusterMembers,
  getClusterTitle,
  getMapFeatureCursor,
} from '@/service/map/shared/mapInteractions';
import {
  getRoadEventPopupCoordinate,
  type RoadEventMapPoint,
} from '@/service/map/features/mapFeatures';
import { createNlscTileUrlFn } from '@/service/map/shared/nlscTiles';
import type { BasemapId } from '@/data/basemapCatalog';
import type { CctvMapPoint } from '@/service/map/features/cctvFeatures';
import type { VdMapPoint } from '@/service/map/features/vdFeatures';
import type { BikeMapPoint } from '@/service/map/features/bikeFeatures';
import type { MetroMapPoint } from '@/service/map/features/metroFeatures';
import type { BusMapPoint } from '@/service/map/features/busFeatures';
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
import type { useBusLayer } from '@/service/map/layers/useBusLayer';
import type { useParkingLotLayer } from '@/service/map/layers/useParkingLotLayer';
import type { useParkingSegmentLayer } from '@/service/map/layers/useParkingSegmentLayer';
import { createTaiwanOuterMaskCoordinates } from '@/service/map/features/taiwanMask';
import {
  getCountyBoundaries,
  type CountyBoundary,
} from '@/service/map/features/countyBoundaries';
import {
  getCountyBoundaryPalette,
  getCountyBoundaryState,
  isBoundaryLabelVisible,
  type CountyBoundaryState,
} from '@/service/map/features/countyBoundaryState';
import {
  getTownshipBoundaries,
  type TownshipBoundary,
  type TownshipSelection,
} from '@/service/map/features/townshipBoundaries';
import {
  searchLocationStyle,
  userLocationStyle,
} from '@/service/map/shared/locationMarkerStyles';
import { getBoundaryLayerVisibility } from '@/service/map/features/boundaryLayerVisibility';
import {
  createRouteFeatures,
  getRouteFeatureStyle,
} from '@/service/map/features/routeFeatures';
import type { RouteResult } from '@/service/routeApi';

export type SelectedFeature =
  | { kind: 'event'; data: RoadEventMapPoint }
  | { kind: 'cctv'; data: CctvMapPoint }
  | { kind: 'liveTraffic'; data: LiveTrafficSegment }
  | { kind: 'vd'; data: VdMapPoint }
  | { kind: 'bike'; data: BikeMapPoint }
  | { kind: 'metro'; data: MetroMapPoint }
  | { kind: 'bus'; data: BusMapPoint }
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
const roadEventLayerDefinition = trafficLayerCatalog.find(
  (layer) => layer.id === 'roadEvents',
)!;
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

const busLayerDefinition = trafficLayerCatalog.find(
  (layer) => layer.id === 'bus',
)!;
const busIconUrl = getTrafficLayerIconDataUrl('bus', '#FFFFFF');
/** 公車站牌使用公共運輸語意色與專屬 icon。 */
const busPointStyle = [
  new Style({
    image: new CircleStyle({
      radius: 16,
      fill: new Fill({ color: busLayerDefinition.color }),
      stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
    }),
  }),
  new Style({
    image: new IconStyle({ src: busIconUrl, width: 20, height: 20 }),
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
const parkingSegmentIconUrl = getTrafficLayerIconDataUrl(
  'parkingSegments',
  '#FFFFFF',
);
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
  busLayer: ReturnType<typeof useBusLayer>;
  parkingLotLayer: ReturnType<typeof useParkingLotLayer>;
  parkingSegmentLayer: ReturnType<typeof useParkingSegmentLayer>;
  showRoadEvents: boolean;
  showCctv: boolean;
  showLiveTraffic: boolean;
  showVehicleDetectors: boolean;
  showBikeShare: boolean;
  showMetro: boolean;
  showBus: boolean;
  showParkingLots: boolean;
  showParkingSegments: boolean;
  showBoundaryMask: boolean;
  showAdministrativeBoundaries: boolean;
  basemapId: BasemapId;
  isSelectingCounty: boolean;
  selectedCountyId: string | null;
  onSelectCounty: (county: Pick<CountyBoundary, 'id' | 'name'>) => void;
  isSelectingTownship: boolean;
  selectedTownshipId: string | null;
  onSelectTownship: (township: TownshipSelection) => void;
  route: RouteResult | null;
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
  busLayer,
  parkingLotLayer,
  parkingSegmentLayer,
  showRoadEvents,
  showCctv,
  showLiveTraffic,
  showVehicleDetectors,
  showBikeShare,
  showMetro,
  showBus,
  showParkingLots,
  showParkingSegments,
  showBoundaryMask,
  showAdministrativeBoundaries,
  basemapId,
  isSelectingCounty,
  selectedCountyId,
  onSelectCounty,
  isSelectingTownship,
  selectedTownshipId,
  onSelectTownship,
  route,
}: UseTrafficMapOptions): UseTrafficMapResult {
  const mapRef = useRef<OlMap | null>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);
  const baseTileLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const boundaryMaskLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const countyLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const townshipSourceRef = useRef(new VectorSource());
  const townshipLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const routeSourceRef = useRef(
    new VectorSource({
      attributions:
        '路線規劃：<a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a>',
    }),
  );
  const countySelectionRef = useRef({
    isSelectingCounty,
    selectedCountyId,
    onSelectCounty,
  });
  countySelectionRef.current = {
    isSelectingCounty,
    selectedCountyId,
    onSelectCounty,
  };
  const townshipSelectionRef = useRef({
    isSelectingTownship,
    selectedTownshipId,
    onSelectTownship,
  });
  townshipSelectionRef.current = {
    isSelectingTownship,
    selectedTownshipId,
    onSelectTownship,
  };
  const highlightSourceRef = useRef(new VectorSource());
  const visibilityRef = useRef({
    roadEvents: showRoadEvents,
    cctv: showCctv,
    liveTraffic: showLiveTraffic,
    vehicleDetectors: showVehicleDetectors,
    bikeShare: showBikeShare,
    metro: showMetro,
    bus: showBus,
    parkingLots: showParkingLots,
    parkingSegments: showParkingSegments,
  });
  visibilityRef.current = {
    roadEvents: showRoadEvents,
    cctv: showCctv,
    liveTraffic: showLiveTraffic,
    vehicleDetectors: showVehicleDetectors,
    bikeShare: showBikeShare,
    metro: showMetro,
    bus: showBus,
    parkingLots: showParkingLots,
    parkingSegments: showParkingSegments,
  };
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature | null>(null);

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
    // 公車站牌數量多，獨立聚合以維持地圖可讀性。
    const bus = createClusteredPointLayer({
      source: busLayer.sourceRef.current,
      hullFillColor: 'rgba(120,87,164,.14)',
      hullStrokeColor: 'rgba(120,87,164,.72)',
      singleStyle: () => busPointStyle,
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
    const boundaryMaskFeature = new Feature({
      geometry: new Polygon(
        createTaiwanOuterMaskCoordinates().map((ring) =>
          ring.map((coordinate) => fromLonLat(coordinate)),
        ),
      ),
    });
    const boundaryMaskLayer = new VectorLayer({
      source: new VectorSource({ features: [boundaryMaskFeature] }),
      visible: true,
      style: new Style({
        fill: new Fill({ color: 'rgba(33, 43, 48, 0.46)' }),
      }),
    });
    boundaryMaskLayerRef.current = boundaryMaskLayer;
    const countySource = new VectorSource();
    const geoJson = new GeoJSON();
    getCountyBoundaries().forEach((county) => {
      const geometry = geoJson.readGeometry(county.geometry, {
        featureProjection: 'EPSG:3857',
      });
      const boundary = new Feature({ geometry, county });
      boundary.setId(`county-${county.id}`);
      boundary.set('featureKind', 'county-boundary');
      countySource.addFeature(boundary);

      const polygon =
        geometry instanceof MultiPolygon
          ? geometry
              .getPolygons()
              .reduce((largest, item) =>
                item.getArea() > largest.getArea() ? item : largest,
              )
          : geometry;
      if (!(polygon instanceof Polygon)) return;
      const label = new Feature({
        geometry: polygon.getInteriorPoint(),
        county,
      });
      label.setId(`county-label-${county.id}`);
      label.set('featureKind', 'county-label');
      countySource.addFeature(label);
    });
    let hoveredCountyId: string | null = null;
    const countyLayer = new VectorLayer({
      source: countySource,
      visible: true,
      style: (feature) => {
        const county = feature.get('county') as CountyBoundary;
        const state = getCountyBoundaryState(
          county.id,
          countySelectionRef.current.selectedCountyId,
          hoveredCountyId,
        );
        const palette = getCountyBoundaryPalette(county.id);
        if (feature.get('featureKind') === 'county-label') {
          if (!isBoundaryLabelVisible(state)) return undefined;
          return new Style({
            text: new Text({
              text: county.name,
              font: '700 15px "Noto Sans TC", "PingFang TC", sans-serif',
              fill: new Fill({ color: '#FFFFFF' }),
              stroke: new Stroke({ color: 'rgba(0,0,0,.9)', width: 4 }),
            }),
          });
        }
        const fillColors = {
          default: palette.fill,
          hovered: palette.hover,
          selected: 'rgba(255,255,255,.04)',
          masked: 'rgba(33, 43, 48, 0.68)',
        } as const;
        const strokeColors = {
          default: palette.stroke,
          hovered: '#F4D06F',
          selected: palette.stroke,
          masked: 'rgba(214,224,224,.52)',
        } as const;
        return new Style({
          fill: new Fill({ color: fillColors[state] }),
          stroke: new Stroke({
            color: strokeColors[state],
            width: state === 'hovered' || state === 'selected' ? 2.5 : 1.2,
          }),
        });
      },
    });
    countyLayerRef.current = countyLayer;
    let hoveredTownshipId: string | null = null;
    const townshipLayer = new VectorLayer({
      source: townshipSourceRef.current,
      visible: false,
      style: (feature) => {
        const township = feature.get('township') as TownshipBoundary;
        const selectedId = townshipSelectionRef.current.selectedTownshipId;
        let state: CountyBoundaryState = 'default';
        if (selectedId) {
          state = township.id === selectedId ? 'selected' : 'masked';
        } else if (township.id === hoveredTownshipId) {
          state = 'hovered';
        }
        if (feature.get('featureKind') === 'township-label') {
          if (!isBoundaryLabelVisible(state)) return undefined;
          return new Style({
            text: new Text({
              text: township.name,
              font: '600 14px "Noto Sans TC", "PingFang TC", sans-serif',
              fill: new Fill({ color: '#FFFFFF' }),
              stroke: new Stroke({ color: 'rgba(0,0,0,.9)', width: 4 }),
            }),
          });
        }
        const palette = getCountyBoundaryPalette(township.id);
        const fillColors = {
          default: palette.fill,
          hovered: palette.hover,
          selected: 'rgba(255,255,255,.04)',
          masked: 'rgba(33,43,48,.68)',
        } as const;
        return new Style({
          fill: new Fill({ color: fillColors[state] }),
          stroke: new Stroke({
            color: state === 'hovered' ? '#F4D06F' : palette.stroke,
            width: state === 'hovered' || state === 'selected' ? 2.5 : 1.2,
          }),
        });
      },
    });
    townshipLayerRef.current = townshipLayer;
    const highlightLayer = new VectorLayer({
      source: highlightSourceRef.current,
    });
    const routeLayer = new VectorLayer({
      source: routeSourceRef.current,
      style: getRouteFeatureStyle,
    });
    const userLocationSource = new VectorSource();
    const userLocationLayer = new VectorLayer({
      source: userLocationSource,
      style: userLocationStyle,
    });
    const searchLocationSource = new VectorSource({
      attributions:
        '地點搜尋：<a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a>',
    });
    const searchLocationLayer = new VectorLayer({
      source: searchLocationSource,
      style: searchLocationStyle,
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
    // 這裡故意不讀 basemapId prop：初始底圖用預設值建立即可，實際選定的
    // 底圖由下面單獨的 effect 在掛載後立刻換上，避免把 basemapId 放進這個
    // effect 的依賴陣列、導致每次切換底圖都整個地圖重建（View 中心/縮放全丟失）。
    const baseTileLayer = new TileLayer({
      source: new XYZ({
        attributions: '內政部國土測繪中心',
        tileUrlFunction: createNlscTileUrlFn(),
        crossOrigin: 'anonymous',
      }),
    });
    baseTileLayerRef.current = baseTileLayer;
    const map = new OlMap({
      target: mapContainer.current,
      overlays: [popupOverlay],
      layers: [
        baseTileLayer,
        boundaryMaskLayer,
        countyLayer,
        townshipLayer,
        liveTraffic,
        routeLayer,
        roadEvents.hullLayer,
        roadEvents.dataLayer,
        roadEvents.expansionLegLayer,
        roadEvents.expansionDataLayer,
        cctv.hullLayer,
        cctv.dataLayer,
        cctv.expansionLegLayer,
        cctv.expansionDataLayer,
        vd.hullLayer,
        vd.dataLayer,
        vd.expansionLegLayer,
        vd.expansionDataLayer,
        bike.hullLayer,
        bike.dataLayer,
        bike.expansionLegLayer,
        bike.expansionDataLayer,
        metro.hullLayer,
        metro.dataLayer,
        metro.expansionLegLayer,
        metro.expansionDataLayer,
        bus.hullLayer,
        bus.dataLayer,
        bus.expansionLegLayer,
        bus.expansionDataLayer,
        parkingLot.hullLayer,
        parkingLot.dataLayer,
        parkingLot.expansionLegLayer,
        parkingLot.expansionDataLayer,
        parkingSegment.hullLayer,
        parkingSegment.dataLayer,
        parkingSegment.expansionLegLayer,
        parkingSegment.expansionDataLayer,
        highlightLayer,
        userLocationLayer,
        searchLocationLayer,
      ],
      view: new View({
        // 這只是縣市圖層extent算出來之前的備援值，等一下就會被下面的 fit() 蓋掉；
        // 選一個粗略涵蓋全臺灣的中心／縮放，不要挑單一縣市的座標，避免 fit 意外失敗時
        // 還是有個看起來「整個台灣」的畫面，而不是特寫某個縣市。
        center: fromLonLat([120.9, 23.7]),
        zoom: 7,
        minZoom: 7,
      }),
      controls: defaultControls({
        rotate: false,
        zoom: false,
        attribution: true,
        attributionOptions: {
          collapsed: false,
          collapsible: false,
        },
      }).extend([
        new ScaleLine({
          units: 'metric',
          minWidth: 100,
        }),
      ]),
    });
    mapRef.current = map;

    // 一開啟地圖就直接框住整個台灣（含離島），不要停在任何單一縣市的特寫；
    // 用跟 fitTaiwan() 一樣的 extent／maxZoom，這裡故意不做動畫，
    // 才不會一載入就先看到某個縣市、再跳到全臺灣的畫面閃爍。
    const initialExtent = countySource.getExtent();
    if (initialExtent && initialExtent.every(Number.isFinite)) {
      map.getView().fit(initialExtent, {
        size: map.getSize(),
        padding: [72, 72, 72, 72],
        maxZoom: 8,
      });
    }

    const renderKey = map.once('rendercomplete', () => setIsLoading(false));

    type ClusterInteraction = {
      dataLayer: typeof roadEvents.dataLayer;
      expansionDataLayer: typeof roadEvents.expansionDataLayer;
      isEnabled: () => boolean;
      setHoverFeature: (feature: Feature<Point> | undefined) => void;
      expand: typeof roadEvents.expand;
      clearExpansion: typeof roadEvents.clearExpansion;
      getExpandedMember: typeof roadEvents.getExpandedMember;
      layerName: string;
      getTitle: (member: Feature<Point>) => string;
      select: (member: Feature<Point>) => {
        feature: SelectedFeature;
        coordinate: Coordinate;
      };
    };
    // 順序就是點擊優先權；新增點位圖層時只需擴充這份設定。
    const clusterInteractions: ClusterInteraction[] = [
      {
        dataLayer: roadEvents.dataLayer,
        expansionDataLayer: roadEvents.expansionDataLayer,
        isEnabled: () => visibilityRef.current.roadEvents,
        setHoverFeature: roadEvents.setHoverFeature,
        expand: roadEvents.expand,
        clearExpansion: roadEvents.clearExpansion,
        getExpandedMember: roadEvents.getExpandedMember,
        layerName: roadEventLayerDefinition.label,
        getTitle: (member) => {
          const event = member.get('event') as RoadEventMapPoint;
          return event.eventTitle || event.location || event.eventId;
        },
        select: (member) => {
          const event = member.get('event') as RoadEventMapPoint;
          return {
            feature: { kind: 'event', data: event },
            coordinate: fromLonLat(getRoadEventPopupCoordinate(event)),
          };
        },
      },
      {
        dataLayer: cctv.dataLayer,
        expansionDataLayer: cctv.expansionDataLayer,
        isEnabled: () => visibilityRef.current.cctv,
        setHoverFeature: cctv.setHoverFeature,
        expand: cctv.expand,
        clearExpansion: cctv.clearExpansion,
        getExpandedMember: cctv.getExpandedMember,
        layerName: cctvLayerDefinition.label,
        getTitle: (member) => {
          const data = member.get('cctv') as CctvMapPoint;
          const camera = data.cameras[0];
          return camera?.description || camera?.roadName || data.id;
        },
        select: (member) => {
          const data = member.get('cctv') as CctvMapPoint;
          return {
            feature: { kind: 'cctv', data },
            coordinate: fromLonLat([data.longitude, data.latitude]),
          };
        },
      },
      {
        dataLayer: vd.dataLayer,
        expansionDataLayer: vd.expansionDataLayer,
        isEnabled: () => visibilityRef.current.vehicleDetectors,
        setHoverFeature: vd.setHoverFeature,
        expand: vd.expand,
        clearExpansion: vd.clearExpansion,
        getExpandedMember: vd.getExpandedMember,
        layerName: vdLayerDefinition.label,
        getTitle: (member) => {
          const data = member.get('vd') as VdMapPoint;
          return data.roadName || data.id;
        },
        select: (member) => {
          const data = member.get('vd') as VdMapPoint;
          return {
            feature: { kind: 'vd', data },
            coordinate: fromLonLat([data.longitude, data.latitude]),
          };
        },
      },
      {
        dataLayer: bike.dataLayer,
        expansionDataLayer: bike.expansionDataLayer,
        isEnabled: () => visibilityRef.current.bikeShare,
        setHoverFeature: bike.setHoverFeature,
        expand: bike.expand,
        clearExpansion: bike.clearExpansion,
        getExpandedMember: bike.getExpandedMember,
        layerName: bikeLayerDefinition.label,
        getTitle: (member) => (member.get('bike') as BikeMapPoint).name,
        select: (member) => {
          const data = member.get('bike') as BikeMapPoint;
          return {
            feature: { kind: 'bike', data },
            coordinate: fromLonLat([data.longitude, data.latitude]),
          };
        },
      },
      {
        dataLayer: metro.dataLayer,
        expansionDataLayer: metro.expansionDataLayer,
        isEnabled: () => visibilityRef.current.metro,
        setHoverFeature: metro.setHoverFeature,
        expand: metro.expand,
        clearExpansion: metro.clearExpansion,
        getExpandedMember: metro.getExpandedMember,
        layerName: metroLayerDefinition.label,
        getTitle: (member) => (member.get('metro') as MetroMapPoint).name,
        select: (member) => {
          const data = member.get('metro') as MetroMapPoint;
          return {
            feature: { kind: 'metro', data },
            coordinate: fromLonLat([data.longitude, data.latitude]),
          };
        },
      },
      {
        dataLayer: bus.dataLayer,
        expansionDataLayer: bus.expansionDataLayer,
        isEnabled: () => visibilityRef.current.bus,
        setHoverFeature: bus.setHoverFeature,
        expand: bus.expand,
        clearExpansion: bus.clearExpansion,
        getExpandedMember: bus.getExpandedMember,
        layerName: busLayerDefinition.label,
        getTitle: (member) => (member.get('bus') as BusMapPoint).name,
        select: (member) => {
          const data = member.get('bus') as BusMapPoint;
          return {
            feature: { kind: 'bus', data },
            coordinate: fromLonLat([data.longitude, data.latitude]),
          };
        },
      },
      {
        dataLayer: parkingLot.dataLayer,
        expansionDataLayer: parkingLot.expansionDataLayer,
        isEnabled: () => visibilityRef.current.parkingLots,
        setHoverFeature: parkingLot.setHoverFeature,
        expand: parkingLot.expand,
        clearExpansion: parkingLot.clearExpansion,
        getExpandedMember: parkingLot.getExpandedMember,
        layerName: parkingLotLayerDefinition.label,
        getTitle: (member) =>
          (member.get('parkingLot') as ParkingLotMapPoint).name,
        select: (member) => {
          const data = member.get('parkingLot') as ParkingLotMapPoint;
          return {
            feature: { kind: 'parkingLot', data },
            coordinate: fromLonLat([data.longitude, data.latitude]),
          };
        },
      },
      {
        dataLayer: parkingSegment.dataLayer,
        expansionDataLayer: parkingSegment.expansionDataLayer,
        isEnabled: () => visibilityRef.current.parkingSegments,
        setHoverFeature: parkingSegment.setHoverFeature,
        expand: parkingSegment.expand,
        clearExpansion: parkingSegment.clearExpansion,
        getExpandedMember: parkingSegment.getExpandedMember,
        layerName: parkingSegmentLayerDefinition.label,
        getTitle: (member) =>
          (member.get('parkingSegment') as ParkingSegmentMapPoint).name,
        select: (member) => {
          const data = member.get('parkingSegment') as ParkingSegmentMapPoint;
          return {
            feature: { kind: 'parkingSegment', data },
            coordinate: fromLonLat([data.longitude, data.latitude]),
          };
        },
      },
    ];

    const flyTo = (center: [number, number], zoom: number) => {
      map
        .getView()
        .animate({ center: fromLonLat(center), zoom, duration: 650 });
    };
    // 將 OpenLayers 操作封裝給頁面工具列與後續 AI 路線功能使用。
    mapController.attach({
      flyTo,
      fitTaiwan: () => {
        const extent = countySource.getExtent();
        if (!extent) return;
        map.getView().fit(extent, {
          duration: 650,
          padding: [72, 72, 72, 72],
          maxZoom: 8,
        });
      },
      fitCounty: (countyId) => {
        const geometry = countySource
          .getFeatureById(`county-${countyId}`)
          ?.getGeometry();
        if (!geometry) return;
        map.getView().fit(geometry.getExtent(), {
          duration: 650,
          padding: [72, 72, 72, 72],
          maxZoom: 12,
        });
      },
      setUserLocation: (coordinate) => {
        userLocationSource.clear();
        if (!coordinate) return;
        const marker = new Feature({
          geometry: new Point(fromLonLat(coordinate)),
        });
        marker.setId('user-location');
        marker.set('featureKind', 'user-location');
        userLocationSource.addFeature(marker);
      },
      setSearchLocation: (coordinate) => {
        searchLocationSource.clear();
        if (!coordinate) return;
        const marker = new Feature({
          geometry: new Point(fromLonLat(coordinate)),
        });
        marker.setId('place-search-location');
        marker.set('featureKind', 'place-search-location');
        searchLocationSource.addFeature(marker);
      },
      hideGeometry: (id) => {
        highlightSourceRef.current
          .getFeatures()
          .filter((feature) => feature.get('highlightGroupId') === id)
          .forEach((feature) => highlightSourceRef.current.removeFeature(feature));
      },
      showGeometry: (geometry) => {
        if (highlightSourceRef.current.getFeatureById(geometry.id)) {
          const feature = highlightSourceRef.current.getFeatureById(
            geometry.id,
          );
          const existingGeometry = feature?.getGeometry();
          if (
            existingGeometry instanceof Point ||
            existingGeometry instanceof Polygon ||
            existingGeometry instanceof LineString
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
            : geometry.type === 'polygon'
              ? new Polygon([
                  geometry.coordinates.map((coordinate) => fromLonLat(coordinate)),
                ])
              : new LineString(
                  geometry.coordinates.map((coordinate) => fromLonLat(coordinate)),
                );
        const feature = new Feature({ geometry: projected });
        feature.setId(geometry.id);
        feature.set('highlightGroupId', geometry.id);
        feature.setStyle(
          geometry.type === 'point'
            ? pointStyle(geometry.color)
            : geometry.type === 'polygon'
              ? new Style({
                  fill: new Fill({ color: `${geometry.color}33` }),
                  stroke: new Stroke({ color: geometry.color, width: 3 }),
                })
              : [
                  new Style({
                    stroke: new Stroke({ color: geometry.color, width: 5 }),
                  }),
                  ...(geometry.label
                    ? [
                        new Style({
                          text: new Text({
                            text: geometry.label,
                            placement: 'line',
                            repeat: 120,
                            fill: new Fill({ color: '#FFFFFF' }),
                            stroke: new Stroke({ color: geometry.color, width: 3 }),
                            font: '700 12px "Noto Sans TC", sans-serif',
                          }),
                        }),
                      ]
                    : []),
                ],
        );
        highlightSourceRef.current.addFeature(feature);

        // 線的起訖點各加一個小標記（起／終），方便辨識路線走向。
        if (geometry.type === 'linestring' && geometry.coordinates.length >= 2) {
          const endpoints: [string, LongitudeLatitude][] = [
            ['起', geometry.coordinates[0]],
            ['終', geometry.coordinates[geometry.coordinates.length - 1]],
          ];
          endpoints.forEach(([label, coordinate]) => {
            const endpointFeature = new Feature({
              geometry: new Point(fromLonLat(coordinate)),
            });
            endpointFeature.set('highlightGroupId', geometry.id);
            endpointFeature.setStyle(
              new Style({
                image: new CircleStyle({
                  radius: 14,
                  fill: new Fill({ color: geometry.color }),
                  stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
                }),
                text: new Text({
                  text: label,
                  fill: new Fill({ color: '#FFFFFF' }),
                  font: '700 14px "Noto Sans TC", sans-serif',
                }),
                zIndex: 30,
              }),
            );
            highlightSourceRef.current.addFeature(endpointFeature);
          });
        }

        map.getView().fit(projected, {
          maxZoom: 18,
          duration: 650,
          padding: [64, 64, 64, 64],
        });
      },
    });

    let isDisposed = false;
    let pointerMoveFrame: number | undefined;
    let pointerMoveSequence = 0;
    const clearClusterExpansions = () => {
      clusterInteractions.forEach(({ clearExpansion }) => clearExpansion());
    };
    const clearClusterHover = () => {
      clusterInteractions.forEach(({ setHoverFeature }) =>
        setHoverFeature(undefined),
      );
      map.getTargetElement().style.cursor = '';
      map.getTargetElement().removeAttribute('title');
      if (hoveredCountyId !== null) {
        hoveredCountyId = null;
        countyLayer.changed();
      }
      if (hoveredTownshipId !== null) {
        hoveredTownshipId = null;
        townshipLayer.changed();
      }
    };
    const pointerMoveKey = map.on('pointermove', (pointerEvent) => {
      if (pointerEvent.dragging) return clearClusterHover();
      const userLocationFeature = map.forEachFeatureAtPixel(
        pointerEvent.pixel,
        (candidate) => candidate,
        { layerFilter: (layer) => layer === userLocationLayer },
      );
      if (userLocationFeature) {
        clearClusterHover();
        map.getTargetElement().style.cursor = 'pointer';
        map.getTargetElement().title = '我的位置';
        return;
      }
      const searchLocationFeature = map.forEachFeatureAtPixel(
        pointerEvent.pixel,
        (candidate) => candidate,
        { layerFilter: (layer) => layer === searchLocationLayer },
      );
      if (searchLocationFeature) {
        clearClusterHover();
        map.getTargetElement().style.cursor = 'pointer';
        map.getTargetElement().title = '搜尋位置';
        return;
        map.getTargetElement().style.cursor = 'pointer';
        return;
      }
      if (countySelectionRef.current.isSelectingCounty) {
        const countyFeature = map.forEachFeatureAtPixel(
          pointerEvent.pixel,
          (candidate) => candidate,
          { layerFilter: (layer) => layer === countyLayer },
        );
        const nextCountyId = countyFeature
          ? (countyFeature.get('county') as CountyBoundary).id
          : null;
        if (hoveredCountyId !== nextCountyId) {
          hoveredCountyId = nextCountyId;
          countyLayer.changed();
        }
        map.getTargetElement().style.cursor = countyFeature ? 'pointer' : '';
        map.getTargetElement().title = countyFeature
          ? (countyFeature.get('county') as CountyBoundary).name
          : '';
        return;
      }
      if (townshipSelectionRef.current.isSelectingTownship) {
        const townshipFeature = map.forEachFeatureAtPixel(
          pointerEvent.pixel,
          (candidate) => candidate,
          { layerFilter: (layer) => layer === townshipLayer },
        );
        const nextTownshipId = townshipFeature
          ? (townshipFeature.get('township') as TownshipBoundary).id
          : null;
        if (hoveredTownshipId !== nextTownshipId) {
          hoveredTownshipId = nextTownshipId;
          townshipLayer.changed();
        }
        map.getTargetElement().style.cursor = townshipFeature ? 'pointer' : '';
        map.getTargetElement().title = townshipFeature
          ? (townshipFeature.get('township') as TownshipBoundary).name
          : '';
        return;
      }
      for (const interaction of clusterInteractions) {
        if (!interaction.isEnabled()) continue;
        const displayFeature = map.forEachFeatureAtPixel(
          pointerEvent.pixel,
          (candidate) => candidate,
          { layerFilter: (layer) => layer === interaction.expansionDataLayer },
        );
        const member = interaction.getExpandedMember(
          displayFeature as Feature | undefined,
        );
        if (!member) continue;
        clearClusterHover();
        map.getTargetElement().style.cursor = 'pointer';
        map.getTargetElement().title = interaction.getTitle(member);
        return;
      }
      if (pointerMoveFrame !== undefined)
        cancelAnimationFrame(pointerMoveFrame);
      const pixel = pointerEvent.pixel;
      pointerMoveFrame = requestAnimationFrame(() => {
        pointerMoveFrame = undefined;
        const sequence = ++pointerMoveSequence;
        const activeClusterInteractions = clusterInteractions.filter(
          (interaction) => interaction.isEnabled(),
        );
        Promise.all([
          ...activeClusterInteractions.map(({ dataLayer }) =>
            dataLayer.getFeatures(pixel),
          ),
          visibilityRef.current.liveTraffic
            ? liveTraffic.getFeatures(pixel)
            : Promise.resolve([]),
        ]).then((featureGroups) => {
          if (isDisposed || sequence !== pointerMoveSequence) return;
          const clusterGroups = featureGroups.slice(0, -1);
          let hoverTitle = '';
          activeClusterInteractions.forEach((interaction, index) => {
            const clusterFeature = clusterGroups[index][0] as
              | Feature
              | undefined;
            const members = getClusterMembers(clusterFeature);
            interaction.setHoverFeature(
              getClusterHoverFeature(clusterFeature),
            );
            if (!hoverTitle && members.length > 0) {
              hoverTitle = getClusterTitle(
                members,
                interaction.layerName,
                interaction.getTitle,
              );
            }
          });
          map.getTargetElement().style.cursor = getMapFeatureCursor(
            featureGroups.some((features) => features.length > 0),
          );
          map.getTargetElement().title = hoverTitle;
        });
      });
    });
    map.getViewport().addEventListener('pointerleave', clearClusterHover);

    // 可再拆分的聚合先放大；同座標或已達上限時改用環狀展開。
    const revealClusterMembers = (
      interaction: ClusterInteraction,
      cluster: Feature,
      members: Feature<Point>[],
    ) => {
      const extent = boundingExtent(
        members.map((member) => member.getGeometry()!.getCoordinates()),
      );
      const view = map.getView();
      const resolution = view.getResolution();
      const zoom = view.getZoom();
      const center = (
        cluster.getGeometry() as Point | undefined
      )?.getCoordinates() as [number, number] | undefined;
      if (resolution === undefined || zoom === undefined || !center) return;

      clearClusterExpansions();
      if (
        shouldExpandCluster({ extent, resolution, zoom, maxZoom: 17 })
      ) {
        interaction.expand(members, center, resolution);
        popupOverlay.setPosition(undefined);
        setSelectedFeature(null);
        return;
      }

      map.getView().fit(extent, {
        duration: 650,
        padding: [72, 72, 72, 72],
        maxZoom: 17,
      });
      popupOverlay.setPosition(undefined);
      setSelectedFeature(null);
    };

    const moveStartKey = map.on('movestart', clearClusterExpansions);

    // 命中順序需對應圖層的視覺疊放順序（由上而下），道路事件／CCTV 的點位
    // 畫在即時路況線之上，若優先查線圖層，疊在線上的點位會永遠點不到。
    const clickKey = map.on('singleclick', async (clickEvent) => {
      const userLocationFeature = map.forEachFeatureAtPixel(
        clickEvent.pixel,
        (candidate) => candidate,
        { layerFilter: (layer) => layer === userLocationLayer },
      );
      if (userLocationFeature) {
        userLocationSource.clear();
        return;
      }
      const searchLocationFeature = map.forEachFeatureAtPixel(
        clickEvent.pixel,
        (candidate) => candidate,
        { layerFilter: (layer) => layer === searchLocationLayer },
      );
      if (searchLocationFeature) {
        searchLocationSource.clear();
        return;
      }
      if (countySelectionRef.current.isSelectingCounty) {
        const countyFeature = map.forEachFeatureAtPixel(
          clickEvent.pixel,
          (candidate) => candidate,
          { layerFilter: (layer) => layer === countyLayer },
        );
        if (!countyFeature) return;
        const county = countyFeature.get('county') as CountyBoundary;
        const geometry = countySource
          .getFeatureById(`county-${county.id}`)
          ?.getGeometry();
        if (geometry) {
          map.getView().fit(geometry.getExtent(), {
            duration: 650,
            padding: [72, 72, 72, 72],
            maxZoom: 12,
          });
        }
        countySelectionRef.current.onSelectCounty({
          id: county.id,
          name: county.name,
        });
        return;
      }
      if (townshipSelectionRef.current.isSelectingTownship) {
        const townshipFeature = map.forEachFeatureAtPixel(
          clickEvent.pixel,
          (candidate) => candidate,
          { layerFilter: (layer) => layer === townshipLayer },
        );
        if (!townshipFeature) return;
        const township = townshipFeature.get('township') as TownshipBoundary;
        const geometry = townshipSourceRef.current
          .getFeatureById(`township-${township.id}`)
          ?.getGeometry();
        if (geometry) {
          map.getView().fit(geometry.getExtent(), {
            duration: 650,
            padding: [72, 72, 72, 72],
            maxZoom: 14,
          });
        }
        townshipSelectionRef.current.onSelectTownship({
          id: township.id,
          name: township.name,
          countyId: township.countyId,
          geometry: township.geometry,
        });
        return;
      }
      for (const interaction of clusterInteractions) {
        if (!interaction.isEnabled()) continue;
        const features = await interaction.expansionDataLayer.getFeatures(
          clickEvent.pixel,
        );
        const member = interaction.getExpandedMember(
          features[0] as Feature | undefined,
        );
        if (!member) continue;

        const selection = interaction.select(member);
        clearClusterExpansions();
        setSelectedFeature(selection.feature);
        popupOverlay.setPosition(selection.coordinate);
        return;
      }
      for (const interaction of clusterInteractions) {
        if (!interaction.isEnabled()) continue;
        const features = await interaction.dataLayer.getFeatures(
          clickEvent.pixel,
        );
        if (!features.length) continue;
        const members = getClusterMembers(features[0] as Feature);
        if (members.length > 1) {
          revealClusterMembers(
            interaction,
            features[0] as Feature,
            members,
          );
          return;
        }
        if (!members.length) continue;

        const selection = interaction.select(members[0]);
        setSelectedFeature(selection.feature);
        popupOverlay.setPosition(selection.coordinate);
        return;
      }

      const liveTrafficFeatures = visibilityRef.current.liveTraffic
        ? await liveTraffic.getFeatures(clickEvent.pixel)
        : [];
      if (!liveTrafficFeatures.length) {
        clearClusterExpansions();
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
      if (pointerMoveFrame !== undefined)
        cancelAnimationFrame(pointerMoveFrame);
      map.getViewport().removeEventListener('pointerleave', clearClusterHover);
      mapController.attach(null);
      unByKey([renderKey, pointerMoveKey, moveStartKey, clickKey]);
      roadEvents.dispose();
      cctv.dispose();
      vd.dispose();
      bike.dispose();
      metro.dispose();
      bus.dispose();
      parkingLot.dispose();
      parkingSegment.dispose();
      popupOverlayRef.current = null;
      baseTileLayerRef.current = null;
      boundaryMaskLayerRef.current = null;
      countyLayerRef.current = null;
      townshipLayerRef.current = null;
      mapRef.current = null;
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
    busLayer.sourceRef,
    parkingLotLayer.sourceRef,
    parkingSegmentLayer.sourceRef,
    liveTrafficLayer.sourceRef,
  ]);

  useEffect(() => {
    const source = routeSourceRef.current;
    source.clear();
    if (!route) return;
    source.addFeatures(createRouteFeatures(route.geometry));
    const extent = source.getExtent();
    if (!extent) return;
    mapRef.current?.getView().fit(extent, {
      duration: 650,
      padding: [96, 64, 96, 420],
      maxZoom: 16,
    });
  }, [route]);

  useEffect(() => {
    const visibility = getBoundaryLayerVisibility(
      showBoundaryMask,
      showAdministrativeBoundaries,
      isSelectingTownship,
      selectedTownshipId,
    );
    boundaryMaskLayerRef.current?.setVisible(visibility.outerMask);
    countyLayerRef.current?.setVisible(visibility.county);
    townshipLayerRef.current?.setVisible(visibility.township);
    countyLayerRef.current?.changed();
    townshipLayerRef.current?.changed();
  }, [
    showBoundaryMask,
    showAdministrativeBoundaries,
    isSelectingTownship,
    selectedTownshipId,
  ]);

  useEffect(() => {
    // 換底圖不用重建整個地圖，直接換掉圖磚來源即可，View 的中心與縮放都保留。
    baseTileLayerRef.current?.setSource(
      new XYZ({
        attributions: '內政部國土測繪中心',
        tileUrlFunction: createNlscTileUrlFn(basemapId),
        crossOrigin: 'anonymous',
      }),
    );
  }, [basemapId]);

  useEffect(() => {
    countyLayerRef.current?.changed();
  }, [isSelectingCounty, selectedCountyId]);

  useEffect(() => {
    const source = townshipSourceRef.current;
    let isCancelled = false;
    source.clear();
    const loadTownships = async () => {
      if (!selectedCountyId) return;
      const geoJson = new GeoJSON();
      const townships = await getTownshipBoundaries(selectedCountyId);
      if (isCancelled) return;
      townships.forEach((township) => {
        const geometry = geoJson.readGeometry(township.geometry, {
          featureProjection: 'EPSG:3857',
        });
        const boundary = new Feature({ geometry, township });
        boundary.setId(`township-${township.id}`);
        boundary.set('featureKind', 'township-boundary');
        source.addFeature(boundary);

        const polygon =
          geometry instanceof MultiPolygon
            ? geometry
                .getPolygons()
                .reduce((largest, item) =>
                  item.getArea() > largest.getArea() ? item : largest,
                )
            : geometry;
        if (!(polygon instanceof Polygon)) return;
        const label = new Feature({
          geometry: polygon.getInteriorPoint(),
          township,
        });
        label.setId(`township-label-${township.id}`);
        label.set('featureKind', 'township-label');
        source.addFeature(label);
      });
    };
    void loadTownships();
    return () => {
      isCancelled = true;
    };
  }, [selectedCountyId]);

  // 切換縣市或鄉鎮時立即關閉 popup：各圖層各自的關閉邏輯多半靠「點位 id 是否還在
  // 新資料裡」判斷，理論上換行政區後舊 id 應該就找不到了，但保留這一道明確的
  // 安全網，避免不同縣市剛好有相同 id 的極端情況讓 popup 誤留在畫面上。
  useEffect(() => {
    popupOverlayRef.current?.setPosition(undefined);
    setSelectedFeature(null);
  }, [selectedCountyId, selectedTownshipId]);

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
      const updated = vdLayer.points.find(
        (point) => point.id === current.data.id,
      );
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
      const updated = bikeLayer.points.find(
        (point) => point.id === current.data.id,
      );
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
      const updated = metroLayer.points.find(
        (point) => point.id === current.data.id,
      );
      if (!updated) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      return { kind: 'metro', data: updated };
    });
  }, [metroLayer.points, showMetro]);

  useEffect(() => {
    setSelectedFeature((current) => {
      if (current?.kind !== 'bus') return current;
      if (!showBus) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      const updated = busLayer.points.find((point) => point.id === current.data.id);
      if (!updated) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      return { kind: 'bus', data: updated };
    });
  }, [busLayer.points, showBus]);

  useEffect(() => {
    // 戶外停車場也支援單點手動刷新，理由同 YouBike／VD／捷運：資料更新時不能
    // 整批關閉 popup，只有「圖層關閉」或「該站真的從清單中消失」才關閉。
    setSelectedFeature((current) => {
      if (current?.kind !== 'parkingLot') return current;
      if (!showParkingLots) {
        popupOverlayRef.current?.setPosition(undefined);
        return null;
      }
      const updated = parkingLotLayer.points.find(
        (point) => point.id === current.data.id,
      );
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
      const updated = parkingSegmentLayer.points.find(
        (point) => point.id === current.data.id,
      );
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
