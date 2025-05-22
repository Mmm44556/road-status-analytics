import { styled } from "@mui/material/styles"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Grid from "@mui/material/Grid"
import AccidentCityChart from "./-components/accidentCity/AccidentCityChart"
import GeoPreviewMap from "./-components/GeoPreviewMap"
import LiveRoadEvent from "./-components/LiveRoadEvent"
export const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles("dark", {
    backgroundColor: "#1A2027",
  }),
  [theme.breakpoints.down("xl")]: {
    flexDirection: "column-reverse",
  },
}))

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
        <Grid
          size={{
            xs: 12,
            sm: 12,
            md: 12,
            lg: 12,
            xl: 9,
          }}
        >
          <Item
            sx={{
              display: "flex",
              gap: 1,
              padding: 1,
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: {
                  xl: "25%",
                  lg: "100%",
                },
              }}
            >
              常見事故的交通工具
            </Box>
            <Box
              sx={{
                position: "relative",
                width: {
                  xl: "75%",
                  lg: "100%",
                },
              }}
            >
              <AccidentCityChart />
            </Box>
          </Item>
        </Grid>

        <Grid
          size={{
            xs: 12,
            sm: 12,
            md: 12,
            lg: 12,
            xl: 3,
          }}
        >
          <LiveRoadEvent />
        </Grid>
      </Grid>
    </Box>
  )
}
