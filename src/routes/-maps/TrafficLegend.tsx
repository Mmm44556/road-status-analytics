import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { congestionLegend } from '@/config/liveTraffic';
import {
  radiusTokens,
  shadowTokens,
  typographyTokens,
} from '@/config/designTokens';

/** 即時路況線色圖例。 */
export default function TrafficLegend() {
  return (
    <Paper
      aria-label="即時路況圖例"
      sx={{
        maxWidth: '28rem',
        position: 'absolute',
        zIndex: 7,
        right: 16,
        bottom: { xs: 84, md: 20 },
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.25,
        px: 1.5,
        py: 1,
        borderRadius: radiusTokens.floating,
        bgcolor: 'rgba(255,255,255,.94)',
        boxShadow: shadowTokens.control,
      }}
    >
      <Typography
        sx={{ fontSize: typographyTokens.fontSize.metadata, fontWeight: 700 }}
      >
        路況
      </Typography>
      {congestionLegend.map((item) => (
        <Box
          key={item.level}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <Box
            component="span"
            sx={{ width: 18, height: 4, borderRadius: 1, bgcolor: item.color }}
          />
          <Typography
            color="text.secondary"
            sx={{ fontSize: typographyTokens.fontSize.metadata }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
      {/* 市區道路沒有官方壅塞資料，須在圖層層級（不只 popup）就提示是推估值。 */}
      <Typography
        color="text.secondary"
        sx={{ flexBasis: '100%', fontSize: typographyTokens.fontSize.metadata }}
      >
        市區道路為車輛偵測器車速粗估，僅供參考
      </Typography>
    </Paper>
  );
}
