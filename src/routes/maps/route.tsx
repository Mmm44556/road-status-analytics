import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import MapView from "@arcgis/core/views/MapView";
import TrafficMapPreview from "@/service/TrafficMapPreview";
import { TrafficMapViewContext } from "@/context";
import { uiColors } from "@/config/semanticColors";

export const Route = createFileRoute("/maps")({ component: MapExplorer });

const legend = [
  { label: "重大事故", color: uiColors.event.accident.main, soft: uiColors.event.accident.soft },
  { label: "道路壅塞", color: uiColors.event.congestion.main, soft: uiColors.event.congestion.soft },
  { label: "道路施工", color: uiColors.event.construction.main, soft: uiColors.event.construction.soft },
];

function MapExplorer() {
  const view = useRef<MapView>(null);
  return (
    <Box sx={{ height: { xs: "calc(100dvh - 136px)", md: "calc(100dvh - 72px)" }, p: { xs: 1.5, md: 2.5 }, position: "relative" }}>
      <TrafficMapViewContext.Provider value={{ view }}>
        <Paper sx={{ height: "100%", overflow: "hidden", position: "relative" }}>
          <TrafficMapPreview height="100%" />
          <Paper sx={{ position: "absolute", zIndex: 4, left: { xs: 12, md: 20 }, top: { xs: 72, md: 20 }, p: 2, width: { xs: "calc(100% - 88px)", sm: 320 }, bgcolor: "rgba(255,255,255,.95)", backdropFilter: "blur(12px)" }}>
            <Typography component="h1" variant="h2">地圖探索</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>移動與縮放地圖，探索不同地區的道路狀況。</Typography>
            <Box aria-label="事件圖例" sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {legend.map((item) => <Chip key={item.label} size="small" label={item.label} sx={{ bgcolor: item.soft, color: item.color, fontWeight: 700 }} icon={<Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color }} />} />)}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>事件圖層將依資料服務可用狀態顯示。</Typography>
          </Paper>
        </Paper>
      </TrafficMapViewContext.Provider>
    </Box>
  );
}
