import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import { uiColors } from '@/config/semanticColors';

/**
 * 小型路線曲線載入指示，取代泛用的 CircularProgress。跟 welcome 頁背景
 * （WelcomeBackground.tsx）同一套「路線曲線緩慢流動」視覺語言，讓地圖的
 * 載入畫面跟前面敘事動畫的視覺語彙連在一起，不是兩套互不相干的載入樣式。
 */

const dash = keyframes`
  to { stroke-dashoffset: -60; }
`;

const comet = keyframes`
  to { stroke-dashoffset: -320; }
`;

const ROUTE_D = 'M4,40 Q30,8 60,28 T116,16';

export default function RouteLoadingIndicator() {
  return (
    <Box
      component="svg"
      viewBox="0 0 120 56"
      aria-hidden
      sx={{ width: 96, height: 44, overflow: 'visible' }}
    >
      <Box
        component="path"
        d={ROUTE_D}
        fill="none"
        stroke={uiColors.brand.teal}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="8 8"
        opacity={0.35}
        sx={{
          animation: `${dash} 1.4s linear infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
      <Box
        component="path"
        d={ROUTE_D}
        fill="none"
        stroke={uiColors.brand.mint}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1 160"
        sx={{
          animation: `${comet} 1.8s linear infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
    </Box>
  );
}
