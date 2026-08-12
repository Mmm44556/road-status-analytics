import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import Feature from "ol/Feature";
import OlMap from "ol/Map";
import View from "ol/View";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Cluster from "ol/source/Cluster";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import { defaults as defaultControls } from "ol/control/defaults";
import { boundingExtent } from "ol/extent";
import { unByKey } from "ol/Observable";
import { fromLonLat } from "ol/proj";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import "ol/ol.css";
import { uiColors } from "@/config/semanticColors";
import { useTrafficMapContext } from "@/hooks/useGetContext";
import { roadEventsToMapPoints, type RoadEventMapPoint } from "@/service/map/mapFeatures";
import { useRoadEvents } from "@/service/trafficApi";
import { getNlscTileUrl } from "@/service/map/nlscTiles";

type TrafficMapPreviewProps = {
  height?: number | string | Record<string, number | string>;
  city?: string;
};

const eventColors: Record<number, string> = {
  1: uiColors.event.accident.main,
  2: uiColors.event.construction.main,
  3: uiColors.event.congestion.main,
  4: uiColors.event.control.main,
  5: uiColors.event.weather.main,
  6: uiColors.event.disaster.main,
  7: uiColors.event.activity.main,
  8: uiColors.event.hazard.main,
};

const pointStyle = (color: string) => new Style({
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color }),
    stroke: new Stroke({ color: "#FFFFFF", width: 2 }),
  }),
});

export default function TrafficMapPreview({
  height = { xs: 440, md: 620 },
  city = "臺中市",
}: TrafficMapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef(new VectorSource());
  const highlightSourceRef = useRef(new VectorSource());
  const { mapController } = useTrafficMapContext();
  const { data: roadEvents, isError: isRoadEventError } = useRoadEvents(city);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedApiError, setDismissedApiError] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<RoadEventMapPoint | null>(null);
  const mapPoints = useMemo(
    () => roadEventsToMapPoints(
      roadEvents?.data.preview.Events ?? [],
      roadEvents?.data.live.LiveEvents ?? [],
    ),
    [roadEvents],
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    const clusterSource = new Cluster({
      distance: 64,
      minDistance: 20,
      source: eventSourceRef.current,
    });
    const styleCache = new globalThis.Map<number, Style>();
    const eventLayer = new VectorLayer({
      source: clusterSource,
      style: (feature) => {
        const members = feature.get("features") as Feature<Point>[];
        const size = members.length;
        if (size === 1) {
          const event = members[0].get("event") as RoadEventMapPoint;
          return pointStyle(eventColors[event.eventType] ?? uiColors.event.control.main);
        }
        let style = styleCache.get(size);
        if (!style) {
          style = new Style({
            image: new CircleStyle({
              radius: Math.min(28, 16 + Math.log2(size) * 3),
              fill: new Fill({ color: "rgba(182,93,19,.92)" }),
              stroke: new Stroke({ color: "#FFFFFF", width: 2 }),
            }),
            text: new Text({
              text: String(size),
              fill: new Fill({ color: "#FFFFFF" }),
              stroke: new Stroke({ color: "rgba(16,47,58,.6)", width: 2 }),
              font: "700 12px Inter, sans-serif",
            }),
          });
          styleCache.set(size, style);
        }
        return style;
      },
    });
    const highlightLayer = new VectorLayer({ source: highlightSourceRef.current });
    const map = new OlMap({
      target: mapContainer.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            attributions: "內政部國土測繪中心",
            tileUrlFunction: getNlscTileUrl,
            crossOrigin: "anonymous",
          }),
        }),
        eventLayer,
        highlightLayer,
      ],
      view: new View({ center: fromLonLat([120.6478, 24.1477]), zoom: 12, minZoom: 7 }),
      controls: defaultControls({ rotate: false, zoom: true, attribution: true }),
    });
    const renderKey = map.once("rendercomplete", () => setIsLoading(false));

    const flyTo = (center: [number, number], zoom: number) => {
      map.getView().animate({ center: fromLonLat(center), zoom, duration: 650 });
    };
    mapController.attach({
      flyTo,
      showGeometry: (geometry) => {
        if (highlightSourceRef.current.getFeatureById(geometry.id)) {
          const feature = highlightSourceRef.current.getFeatureById(geometry.id);
          const existingGeometry = feature?.getGeometry();
          if (existingGeometry instanceof Point || existingGeometry instanceof Polygon) {
            map.getView().fit(existingGeometry, { maxZoom: 18, duration: 650, padding: [64, 64, 64, 64] });
          }
          return;
        }
        const projected = geometry.type === "point"
          ? new Point(fromLonLat(geometry.coordinates))
          : new Polygon([geometry.coordinates.map((coordinate) => fromLonLat(coordinate))]);
        const feature = new Feature({ geometry: projected });
        feature.setId(geometry.id);
        feature.setStyle(geometry.type === "point"
          ? pointStyle(geometry.color)
          : new Style({ fill: new Fill({ color: `${geometry.color}33` }), stroke: new Stroke({ color: geometry.color, width: 3 }) }));
        highlightSourceRef.current.addFeature(feature);
        map.getView().fit(projected, { maxZoom: 18, duration: 650, padding: [64, 64, 64, 64] });
      },
    });

    map.on("singleclick", (clickEvent) => {
      eventLayer.getFeatures(clickEvent.pixel).then((features) => {
        if (!features.length) return;
        const members = features[0].get("features") as Feature<Point>[];
        if (members.length > 1) {
          const extent = boundingExtent(members.map((member) => member.getGeometry()!.getCoordinates()));
          map.getView().fit(extent, { duration: 650, padding: [72, 72, 72, 72], maxZoom: 17 });
          setSelectedEvent(null);
          return;
        }
        setSelectedEvent(members[0].get("event") as RoadEventMapPoint);
      });
    });

    return () => {
      mapController.attach(null);
      unByKey(renderKey);
      clusterSource.setSource(null);
      map.setTarget(undefined);
    };
  }, [mapController]);

  useEffect(() => {
    const features = mapPoints.map((event) => {
      const feature = new Feature({ geometry: new Point(fromLonLat([event.longitude, event.latitude])), event });
      feature.setId(event.eventId);
      return feature;
    });
    eventSourceRef.current.clear();
    eventSourceRef.current.addFeatures(features);
    setSelectedEvent(null);
  }, [mapPoints]);

  useEffect(() => setDismissedApiError(false), [city]);

  const locateUser = () => {
    if (!navigator.geolocation) return setError("你的瀏覽器不支援定位功能。");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => mapController.flyTo([coords.longitude, coords.latitude], 15),
      () => setError("無法取得目前位置，請確認定位權限。"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <Box sx={{ position: "relative", height, width: "100%", overflow: "hidden", bgcolor: "#DCE8E5" }}>
      <Box ref={mapContainer} sx={{ position: "absolute", inset: 0, "& .ol-zoom": { top: 1, left: 1 }, "& .ol-attribution": { fontSize: 11 } }} aria-label="臺灣即時路況地圖" />
      {isLoading && <Box role="status" aria-label="正在載入地圖" sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", bgcolor: "rgba(242,245,244,.76)", zIndex: 2 }}><CircularProgress color="secondary" /></Box>}
      {(error || (isRoadEventError && !dismissedApiError)) && <Alert severity="warning" onClose={() => { setError(null); setDismissedApiError(true); }} sx={{ position: "absolute", top: 16, left: 16, right: 72, zIndex: 3 }}>{error ?? "道路事件暫時無法載入。"}</Alert>}
      <IconButton onClick={locateUser} aria-label="定位到我的位置" sx={{ position: "absolute", right: 16, top: 16, zIndex: 3, bgcolor: "background.paper", color: "primary.main", boxShadow: "0 8px 22px rgba(11,46,60,.18)", "&:hover": { bgcolor: "background.paper" } }}><MyLocationRoundedIcon /></IconButton>
      {selectedEvent && <Paper role="dialog" aria-label="道路事件詳細資訊" sx={{ position: "absolute", left: 16, bottom: 48, zIndex: 4, width: { xs: "calc(100% - 32px)", sm: 340 }, p: 2, bgcolor: "rgba(255,255,255,.96)" }}>
        <IconButton size="small" aria-label="關閉事件資訊" onClick={() => setSelectedEvent(null)} sx={{ position: "absolute", right: 8, top: 8 }}><CloseRoundedIcon fontSize="small" /></IconButton>
        <Typography component="h3" variant="subtitle1" fontWeight={800} sx={{ pr: 4 }}>{selectedEvent.eventTitle}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedEvent.location}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>{selectedEvent.description}</Typography>
      </Paper>}
      <Chip role="status" label={`${mapPoints.length} 件事件・自動聚合`} size="small" sx={{ position: "absolute", right: 12, bottom: 28, zIndex: 3, bgcolor: "rgba(16,47,58,.9)", color: "#FFFFFF", fontSize: 11 }} />
    </Box>
  );
}
