import { Link } from '@tanstack/react-router';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { ChatName } from '@/config/appInfo';

export const desktopHeaderHeight = 64;

/** 顯示全站品牌導覽列。 */
export default function NavBar() {
  return (
    <AppBar
      component="header"
      position="fixed"
      color="default"
      elevation={0}
      sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Toolbar
        sx={{
          minHeight: `${desktopHeaderHeight}px !important`,
          py: { xs: 0, sm: 0.5 },
          px: 1.5,
          gap: 1,
        }}
      >
        <Box
          component={Link}
          to="/welcome"
          aria-label={`回到 ${ChatName} 介紹頁`}
          sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <Box
            component="img"
            src="/Logo.png"
            alt={ChatName}
            sx={{ display: 'block', width: 'auto', height: { xs: 50, sm: 65 } }}
          />
        </Box>
        <Box
          id="header-layer-controls"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'end', md: 'start' },
            flex: 1,
            minWidth: 0,
            py: '10px',
            px: { xs: 1.5, sm: 0 },
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        />
      </Toolbar>
    </AppBar>
  );
}
