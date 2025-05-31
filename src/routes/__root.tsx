import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { theme } from "@/config/theme";
import Box from "@mui/material/Box";
import NavBar from "@/routes/-root/NavBar";
import Toolbar from "@mui/material/Toolbar";
import {
  ThemeProvider,
  THEME_ID as MATERIAL_THEME_ID,
} from "@mui/material/styles";
import { CssVarsProvider as JoyCssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/material/CssBaseline";
export const Route = createRootRoute({
  component: () => (
    <ThemeProvider theme={{ [MATERIAL_THEME_ID]: theme }}>
      <JoyCssVarsProvider>
        <CssBaseline />

        <Box sx={{ display: "flex", height: "100dvh" }}>
          <NavBar />
          <Box sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar />
            <Outlet />
          </Box>
        </Box>
      </JoyCssVarsProvider>
      <TanStackRouterDevtools />
    </ThemeProvider>
  ),
});
