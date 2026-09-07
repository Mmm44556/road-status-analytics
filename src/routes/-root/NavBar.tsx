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
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Box
            component="img"
            src="/Logo.png"
            alt={ChatName}
            sx={{ display: 'block', width: 'auto', height: { xs: 50, sm: 65 } }}
          />
        </Box>
        {/* flex:1 + minWidth:0 讓這個容器在空間不夠時可以縮小並捲動，
            而不是把整條 Toolbar 撐寬；未來圖層選單按鈕變多也不會破版，用滑動取代擠壓。
            設 overflowX 會讓瀏覽器把 overflowY 也算成 auto（CSS 規範如此，設 visible 沒用），
            按鈕上的數字角標是絕對定位、會凸出按鈕本身的框，不會被算進容器高度，
            所以上下留白 padding 讓角標留在容器範圍內，才不會被這個捲動邊界切掉。 */}
        <Box
          id="header-layer-controls"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'end', sm: 'start' },
            flex: 1,
            minWidth: 0,
            py: '10px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        />
      </Toolbar>
    </AppBar>
  );
}
