import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Typography from "@mui/material/Typography";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CircleIcon from "@mui/icons-material/Circle";
import MapView from "@arcgis/core/views/MapView";
import TrafficMapPreview from "@/service/TrafficMapPreview";
import { TrafficMapViewContext } from "@/context";
import RoadEventList from "./-components/RoadEventList";
import TrafficSummary from "./-components/TrafficSummary";
import AccidentRank from "./-components/AccidentRank";
import AccidentDonutPie from "./-components/AccidentDonutPie";
import { findTrafficLocation, trafficLocations, type TrafficLocation } from "@/data/trafficLocations";

export default function Overview() {
  const view = useRef<MapView>(null);
  const moveToLocation = (location: TrafficLocation | null) => {
    if (location) view.current?.goTo({ center: location.center, zoom: 12 });
  };
  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 3.5 } }}>
      <Box component="header" sx={{ display: { md: "flex" }, alignItems: "end", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Chip icon={<CircleIcon sx={{ fontSize: "9px !important", color: "#138A64 !important" }} />} label="公開路況服務" size="small" sx={{ mb: 1.25, bgcolor: "#E1F3ED", color: "#08675D", fontWeight: 750 }} />
          <Typography component="h1" variant="h1">現在，路上發生什麼？</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>搜尋地區或定位目前位置，快速掌握事故與道路事件。</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: { xs: 1.25, md: 0 } }}>資料僅供路況參考，不作為導航或緊急決策依據</Typography>
      </Box>

      <TrafficMapViewContext.Provider value={{ view }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1fr) 340px" }, gap: 2 }}>
          <Paper sx={{ position: "relative", overflow: "hidden", minWidth: 0 }}>
            <Box sx={{ position: "absolute", zIndex: 4, top: 16, left: 16, width: { xs: "calc(100% - 88px)", sm: 390 } }}>
              <Autocomplete
                options={trafficLocations}
                getOptionLabel={(option) => option.name}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue.trim()) return options;
                  const match = findTrafficLocation(inputValue);
                  return match ? [match] : [];
                }}
                onChange={(_, location) => moveToLocation(location)}
                renderInput={(params) => <TextField {...params} placeholder="搜尋縣市" aria-label="搜尋路況縣市" size="small" slotProps={{ input: { ...params.InputProps, startAdornment: <><InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment>{params.InputProps.startAdornment}</> } }} />}
                sx={{ bgcolor: "rgba(255,255,255,.96)", borderRadius: 2, boxShadow: "0 10px 28px rgba(11,46,60,.18)", "& fieldset": { border: 0 } }}
              />
            </Box>
            <TrafficMapPreview height={{ xs: 480, md: 650 }} />
          </Paper>

          <Box component="aside" aria-label="路況資訊" sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <TrafficSummary />
            <Paper sx={{ p: 2.25, flex: 1, overflow: "hidden" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Box><Typography component="h2" variant="h3">道路事件</Typography><Typography variant="caption" color="text.secondary">預覽資料・點選事件可查看地圖位置</Typography></Box>
                <Button component={Link} to="/maps" size="small" endIcon={<ArrowForwardRoundedIcon />}>完整地圖</Button>
              </Box>
              <Box sx={{ mx: -2.25, mb: -2.25, "& > div": { height: "350px !important", borderRadius: 0 } }}><RoadEventList /></Box>
            </Paper>
          </Box>
        </Box>
      </TrafficMapViewContext.Provider>

      <Box component="section" aria-labelledby="insight-title" sx={{ mt: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "end", mb: 1.5 }}><Box><Typography id="insight-title" component="h2" variant="h2">事故資料洞察</Typography><Typography color="text.secondary" variant="body2">依 API 最新可用資料期間彙整</Typography></Box><Button component={Link} to="/analytics" endIcon={<ArrowForwardRoundedIcon />}>查看完整分析</Button></Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
          <AccidentRank />
          <AccidentDonutPie />
        </Box>
      </Box>
    </Box>
  );
}
