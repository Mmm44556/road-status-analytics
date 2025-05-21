import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import AccidentCityChart from "./-components/accidentCity/AccidentCityChart";
import GeoPreviewMap from "./-components/GeoPreviewMap";
export const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles("dark", {
    backgroundColor: "#1A2027",
  }),
}));

export default function Dashboard() {
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
        <Grid size={9}>
          <Item
            sx={{ display: "flex", flexDirection: "row", gap: 1, padding: 1 }}
          >
            <Box sx={{ position: "relative", width: "25%" }}>常見事故的交通工具</Box>
            <Box sx={{ position: "relative", width: "75%" }}>
              <AccidentCityChart />
            </Box>
          </Item>
        </Grid>Claude
        <Grid size={3}>
          <Item>123</Item>
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        {/* <Grid
          size={5}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Item>
            <GeoPreviewMap />
          </Item>
        </Grid> */}
        <Grid size={4}>
          <Item>size=4</Item>
        </Grid>
        <Grid size={8}>
          <Item>size=8</Item>
        </Grid>
      </Grid>
    </Box>
  );
}
