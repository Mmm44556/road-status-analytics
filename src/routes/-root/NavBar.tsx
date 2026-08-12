import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import TrafficRoundedIcon from "@mui/icons-material/TrafficRounded";
import CircleIcon from "@mui/icons-material/Circle";
import Navigation from "./Navigation";
import { uiColors } from "@/config/semanticColors";

export const desktopHeaderHeight = 72;

export default function NavBar() {
  return (
    <AppBar
      component="header"
      position="fixed"
      color="primary"
      elevation={0}
      sx={{ borderBottom: "1px solid", borderColor: "rgba(255,255,255,.12)" }}
    >
      <Toolbar sx={{ minHeight: `${desktopHeaderHeight}px !important`, gap: 2, px: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: { md: 265 } }}>
          <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2, color: "primary.main", bgcolor: uiColors.brand.mint, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.24)" }}>
            <TrafficRoundedIcon aria-hidden="true" sx={{ fontSize: 25 }} />
          </Box>
          <Box>
            <Typography component="div" fontWeight={800} lineHeight={1.1}>路況通</Typography>
            <Typography component="div" variant="caption" sx={{ color: "rgba(255,255,255,.68)", letterSpacing: ".08em" }}>TAIWAN TRAFFIC PULSE</Typography>
          </Box>
        </Box>
        <Navigation />
        <Box sx={{ ml: "auto", display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1, color: "rgba(255,255,255,.78)" }}>
          <CircleIcon sx={{ fontSize: 9, color: uiColors.brand.mint }} />
          <Typography variant="body2" fontWeight={650}>服務運作中</Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
