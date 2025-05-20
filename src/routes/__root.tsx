import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "@/config/theme";
import Box from "@mui/material/Box";
import NavBar from "@/routes/-root/NavBar";
import Toolbar from "@mui/material/Toolbar";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex", height: "calc(100vh - 64px)" }}>
        <NavBar />
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Outlet />
        </Box>
      </Box>
      <TanStackRouterDevtools />
    </ThemeProvider>
  ),
});
