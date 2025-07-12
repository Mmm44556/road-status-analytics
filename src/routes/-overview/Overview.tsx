import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import AccidentCityChart from "./-components/accidentRank/AccidentRankChart";
import RoadEventList from "./-components/RoadEventList";
import AnalyticsCard from "./-components/AnalyticsCard";
import Description from "./-components/Description";
import AccidentRank from "./-components/AccidentRank";
import TrafficMapPreview from "../../service/TrafficMapPreview";
import { TrafficMapViewContext } from "@/context";
import MapView from "@arcgis/core/views/MapView";
import { Point, Polygon } from "@arcgis/core/geometry";
import AccidentDonutPie from "./-components/AccidentDonutPie";

export default function Overview() {
  const view = useRef<MapView>(null);

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Description />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 12,
          md: 12,
          lg: 12,
          xl: 9,
        }}
      >
        <TrafficMapViewContext.Provider value={{ view }}>
          {/* <OverviewSelect /> */}

          {/* 分析卡 */}
          <AnalyticsCard />
          {/* 地圖 */}
          <TrafficMapPreview />
        </TrafficMapViewContext.Provider>
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 12,
          md: 12,
          lg: 3,
          xl: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* 事故排行 */}
          <AccidentRank />
          {/* 事故類型 */}
          <AccidentDonutPie />
        </Box>
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 12,
          md: 12,
          lg: 12,
          xl: 12,
        }}
      >
        <AccidentCityChart />
      </Grid>
    </Grid>
  );
}
