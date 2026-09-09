import { createRootRoute, Outlet } from '@tanstack/react-router';
import { theme } from '@/config/theme';
import Box from '@mui/material/Box';
import NavBar, { desktopHeaderHeight } from '@/routes/-root/NavBar';
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
        <Box
          sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}
        >
          <NavBar />

          <Box
            component="main"
            sx={{
              pt: `${desktopHeaderHeight}px`,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </SnackbarProvider>
    </ThemeProvider>
  ),
});
