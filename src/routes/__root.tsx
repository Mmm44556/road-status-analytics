import { createRootRoute, Outlet } from '@tanstack/react-router';
import { theme } from '@/config/theme';
import Box from '@mui/material/Box';
import NavBar from '@/routes/-root/NavBar';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
export const Route = createRootRoute({
  component: () => (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={4}
        preventDuplicate
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        classes={{ containerRoot: 'layer-snackbar-container' }}
      >
        <Box sx={{ minHeight: '100dvh' }}>
          <NavBar />
          <Box component="main" sx={{ pt: '64px', minHeight: '100dvh' }}>
            <Outlet />
          </Box>
        </Box>
      </SnackbarProvider>
      {/* <TanStackRouterDevtools /> */}
    </ThemeProvider>
  ),
});
