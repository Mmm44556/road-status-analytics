import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { ChatName } from '@/config/appInfo';

/** 路由切換時（例如載入地圖頁的程式碼區塊）顯示的過渡畫面，避免空白閃一下。 */
export default function RoutePendingFallback() {
  return (
    <Box
      sx={{
        height: '100%',
        minHeight: '60dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 8,
      }}
    >
      <CircularProgress
        size={32}
        thickness={4}
        sx={{ color: 'secondary.dark' }}
      />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        {ChatName} 載入中…
      </Typography>
    </Box>
  );
}
