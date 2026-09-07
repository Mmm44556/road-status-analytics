import { Link } from '@tanstack/react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { FindInPage } from '@mui/icons-material';

/** 網址沒有對應到任何路由時顯示；TanStack Router 會把它渲染在根路由的 Outlet 位置，
    所以導覽列還是看得到，只有頁面內容區塊變成這個。 */
export default function NotFoundPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        minHeight: 'calc(100dvh - 64px)',
        p: 4,
        textAlign: 'center',
      }}
    >
      <FindInPage color="secondary" sx={{ fontSize: 40 }} />
      <Typography variant="h6" fontWeight={700}>
        找不到這個頁面
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
        網址可能打錯了，或這個頁面已經不存在。
      </Typography>
      <Button component={Link} to="/" variant="contained">
        回到地圖首頁
      </Button>
    </Box>
  );
}
