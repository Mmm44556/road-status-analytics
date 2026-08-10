import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import Map from "@arcgis/core/Map";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureReductionCluster from "@arcgis/core/layers/support/FeatureReductionCluster";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import { useTrafficMapContext } from "@/hooks/useGetContext";
import { useRoadEvents } from "@/service/trafficApi";
import { roadEventsToMapPoints } from "@/service/arcGIS/mapFeatures";
import { uiColors } from "@/config/semanticColors";

type TrafficMapPreviewProps = {
  height?: number | string | Record<string, number | string>;
  city?: string;
};

export default function TrafficMapPreview({
  height = { xs: 440, md: 620 },
  city = "臺中市",
}: TrafficMapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const { view } = useTrafficMapContext();
  const { data: roadEvents } = useRoadEvents(city);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapPoints = useMemo(
    () => roadEventsToMapPoints(
      roadEvents?.data.preview.Events ?? [],
      roadEvents?.data.live.LiveEvents ?? [],
    ),
    [roadEvents],
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    const nlscLayer = new WebTileLayer({
      urlTemplate:
        "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}",
      copyright: "內政部國土測繪中心",
    });

    const map = new Map({ layers: [nlscLayer] });
    mapRef.current = map;
    const mapView = new MapView({
      container: mapContainer.current,
      map,
      center: [120.6478, 24.1477],
      zoom: 12,
      constraints: { minZoom: 7 },
      ui: { components: ["zoom", "attribution"] },
    });

    view.current = mapView;
    mapView
      .when()
      .then(() => setIsLoading(false))
      .catch(() => {
        setIsLoading(false);
        setError("地圖暫時無法載入，請稍後重新整理。");
      });

    return () => {
      mapView.destroy();
      mapRef.current = null;
      view.current = null;
    };
  }, [view]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapPoints.length === 0) return;

    const graphics = mapPoints.map((event) => new Graphic({
      geometry: new Point({ longitude: event.longitude, latitude: event.latitude }),
      attributes: {
        OBJECTID: event.objectId,
        EventID: event.eventId,
        EventTitle: event.eventTitle,
        Description: event.description,
        EventType: event.eventType,
        Location: event.location,
        PublishTime: event.publishTime,
        SourceKind: event.sourceKind === "live" ? "即時" : "預告",
      },
    }));

    const symbol = (color: string) => new SimpleMarkerSymbol({
      color,
      size: 10,
      outline: { color: "#FFFFFF", width: 1.5 },
    });
    const renderer = new UniqueValueRenderer({
      field: "EventType",
      defaultSymbol: symbol(uiColors.event.control.main),
      uniqueValueInfos: [
        [1, uiColors.event.accident.main],
        [2, uiColors.event.construction.main],
        [3, uiColors.event.congestion.main],
        [4, uiColors.event.control.main],
        [5, uiColors.event.weather.main],
        [6, uiColors.event.disaster.main],
        [7, uiColors.event.activity.main],
        [8, uiColors.event.hazard.main],
      ].map(([value, color]) => ({ value, symbol: symbol(String(color)) })),
    });
    const cluster = new FeatureReductionCluster({
      clusterRadius: "64px",
      clusterMinSize: 28,
      clusterMaxSize: 54,
      maxScale: 70000,
      popupTemplate: new PopupTemplate({
        title: "此區域共有 {cluster_count} 件道路事件",
        content: "放大地圖可查看個別事件與詳細位置。",
      }),
      labelingInfo: [{
        labelExpressionInfo: { expression: "Text($feature.cluster_count, '#,###')" },
        labelPlacement: "center-center",
        symbol: {
          type: "text",
          color: "#FFFFFF",
          haloColor: "#102F3A",
          haloSize: 1,
          font: { family: "Inter", size: 11, weight: "bold" },
        },
      }],
    });
    const eventLayer = new FeatureLayer({
      title: `${city}道路事件`,
      source: graphics,
      objectIdField: "OBJECTID",
      geometryType: "point",
      spatialReference: { wkid: 4326 },
      fields: [
        { name: "OBJECTID", alias: "OBJECTID", type: "oid" },
        { name: "EventID", alias: "事件編號", type: "string" },
        { name: "EventTitle", alias: "事件", type: "string" },
        { name: "Description", alias: "說明", type: "string" },
        { name: "EventType", alias: "事件類型", type: "integer" },
        { name: "Location", alias: "位置", type: "string" },
        { name: "PublishTime", alias: "發布時間", type: "string" },
        { name: "SourceKind", alias: "資料類型", type: "string" },
      ],
      outFields: ["*"],
      renderer,
      featureReduction: cluster,
      popupTemplate: new PopupTemplate({
        title: "{EventTitle}",
        content: [{
          type: "fields",
          fieldInfos: [
            { fieldName: "Location", label: "位置" },
            { fieldName: "SourceKind", label: "資料類型" },
            { fieldName: "PublishTime", label: "發布時間" },
            { fieldName: "Description", label: "說明" },
          ],
        }],
      }),
    });
    map.add(eventLayer);
    void eventLayer
      .load()
      .then(async () => {
        const currentView = view.current;
        if (!currentView || !map.layers.includes(eventLayer)) return;
        await currentView.whenLayerView(eventLayer);
        if (eventLayer.fullExtent) {
          await currentView.goTo(eventLayer.fullExtent.expand(1.15), { animate: false });
        }
      })
      .catch(() => setError("道路事件圖層暫時無法載入。"));

    return () => {
      map.remove(eventLayer);
      eventLayer.destroy();
    };
  }, [city, mapPoints]);

  const locateUser = () => {
    if (!navigator.geolocation) {
      setError("你的瀏覽器不支援定位功能。");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        view.current?.goTo({ center: [coords.longitude, coords.latitude], zoom: 15 });
      },
      () => setError("無法取得目前位置，請確認定位權限。"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <Box
      sx={{
        position: "relative",
        height,
        width: "100%",
        overflow: "hidden",
        bgcolor: "#DCE8E5",
        "& .esri-view": { outline: "none" },
        "& .esri-attribution": { fontSize: 11 },
      }}
    >
      <Box ref={mapContainer} sx={{ position: "absolute", inset: 0 }} aria-label="臺灣即時路況地圖" />
      {isLoading && (
        <Box role="status" aria-label="正在載入地圖" sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", bgcolor: "rgba(242,245,244,.76)", zIndex: 2 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}
      {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ position: "absolute", top: 16, left: 16, right: 72, zIndex: 3 }}>{error}</Alert>}
      <IconButton onClick={locateUser} aria-label="定位到我的位置" sx={{ position: "absolute", right: 16, top: 16, zIndex: 3, bgcolor: "background.paper", color: "primary.main", boxShadow: "0 8px 22px rgba(11,46,60,.18)", "&:hover": { bgcolor: "background.paper" } }}>
        <MyLocationRoundedIcon />
      </IconButton>
      <Chip label="底圖：內政部國土測繪中心" size="small" sx={{ position: "absolute", left: 12, bottom: 28, zIndex: 3, bgcolor: "rgba(255,255,255,.9)", fontSize: 11 }} />
      {mapPoints.length > 0 && <Chip role="status" label={`${mapPoints.length} 件事件・自動聚合`} size="small" sx={{ position: "absolute", right: 12, bottom: 28, zIndex: 3, bgcolor: "rgba(16,47,58,.9)", color: "#FFFFFF", fontSize: 11 }} />}
    </Box>
  );
}
