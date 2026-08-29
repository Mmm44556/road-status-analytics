import { createRootRoute, Outlet } from '@tanstack/react-router';
import { theme } from '@/config/theme';
import Box from '@mui/material/Box';
import NavBar from '@/routes/-root/NavBar';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
export const Route = createRootRoute({
  component: () => (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box sx={{ minHeight: '100dvh' }}>
        <NavBar />
        <Box component="main" sx={{ pt: '64px', minHeight: '100dvh' }}>
          <Outlet />
        </Box>
      </Box>
      {/* <TanStackRouterDevtools /> */}
    </ThemeProvider>
  ),
});
