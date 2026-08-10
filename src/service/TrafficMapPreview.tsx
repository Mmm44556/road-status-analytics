import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import Map from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import MapView from "@arcgis/core/views/MapView";
import { useTrafficMapContext } from "@/hooks/useGetContext";

type TrafficMapPreviewProps = {
  height?: number | string | Record<string, number | string>;
};

export default function TrafficMapPreview({
  height = { xs: 440, md: 620 },
}: TrafficMapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { view } = useTrafficMapContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const basemap = new Basemap({
      baseLayers: [
        new WebTileLayer({
          urlTemplate:
            "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}",
          copyright: "內政部國土測繪中心",
        }),
      ],
      title: "臺灣通用電子地圖",
    });

    const mapView = new MapView({
      container: mapContainer.current,
      map: new Map({ basemap }),
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
      view.current = null;
    };
  }, [view]);

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
    </Box>
  );
}
