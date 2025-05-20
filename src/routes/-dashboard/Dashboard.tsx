import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import LineRace from "./-components/lineRace/AccidentCityLineRace";
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
    <Box sx={{ p: 2, height: "100%" }}>
      <Grid container spacing={2}>
        <Grid size={7}>
          <Item sx={{ position: "relative" }}>
            <LineRace />
          </Item>
        </Grid>
        <Grid
          size={5}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Item>
            <GeoPreviewMap />
          </Item>
        </Grid>
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
