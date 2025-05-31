import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import AccidentCityChart from "./-components/accidentCity/AccidentCityChart";
import GeoPreviewMap from "./-components/GeoPreviewMap";
import RoadEventList from "./-components/RoadEventList";
import AnalyticsCard from "./-components/AnalyticsCard";
import OverviewSelect from "./-components/OverviewSelect";
import Description from "./-components/Description";
import AccidentCityRank from "./-components/AccidentCityRank";

export default function Overview() {
  return (
    <Box
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Grid container spacing={2}>
        <Grid>
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
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <OverviewSelect />
          <AnalyticsCard />
          <GeoPreviewMap />
        </Grid>

        <Grid
          size={{
            xs: 12,
            sm: 12,
            md: 12,
            lg: 12,
            xl: 3,
          }}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <RoadEventList />
          <AccidentCityRank />
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
    </Box>
  );
}
