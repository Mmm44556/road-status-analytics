import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import AccidentCityChart from "./-components/accidentCity/AccidentCityChart";
import RoadEventList from "./-components/RoadEventList";
import AnalyticsCard from "./-components/AnalyticsCard";
import Description from "./-components/Description";
import AccidentCityRank from "./-components/AccidentCityRank";
import TrafficMapPreview from "../../service/TrafficMapPreview";
import { TrafficMapViewContext } from "@/context";
import MapView from "@arcgis/core/views/MapView";
import { Point, Polygon } from "@arcgis/core/geometry";

export default function Overview() {
  const view = useRef<MapView>(null);

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Grid size={12}>
        <Description />
      </Grid>
      <Grid spacing={2} size={12}>
        <TrafficMapViewContext.Provider value={{ view }}>
          {/* <OverviewSelect /> */}

          <Box
            sx={{
              display: "flex",
              height: "100%",
              bgcolor: "transparent",
              gap: "20px",
            }}
          >
            <Box
              sx={{
                width: "80%",
                height: {
                  "2xl": "1000px",
                  lg: "850px",
                  md: "500px",
                  sm: "300px",
                  xs: "200px",
                },
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <AnalyticsCard />
              <TrafficMapPreview />
            </Box>

            <Box
              sx={{
                minWidth: {
                  "2xl": "20%",
                  lg: "25%",
                },
                display: "flex",
                flexDirection: "column",
                gap: 2,
                flex: 1,
              }}
            >
              <RoadEventList />
              <Box sx={{ minHeight: 0, flex: "1" }}>
                <AccidentCityRank />
              </Box>
            </Box>
          </Box>
        </TrafficMapViewContext.Provider>
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
    </Box>
  );
}
