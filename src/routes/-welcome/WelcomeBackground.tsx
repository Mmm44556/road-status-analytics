import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import { uiColors } from '@/config/semanticColors';

/**
 * 首頁背景裝飾層：幾條像路線一樣的貝茲曲線緩慢流動，呼應敘事動畫裡
 * 台北→台中路線同一套視覺語言（見 welcomeSceneData.ts 的 routePathD），
 * 純裝飾、極淡，不跟前景的敘事動畫搶注意力。aria-hidden＋pointerEvents:
 * none 避免被輔助技術唸出來或擋到底下的互動；prefers-reduced-motion
 * 使用者關掉流動效果，只留靜止線條。
 */

const drift = keyframes`
  to { stroke-dashoffset: -160; }
`;

const ROUTES = [
  {
    d: 'M-20,60 Q120,10 200,90 T440,70',
    color: uiColors.brand.teal,
    width: 1.1,
    dash: '6 8',
    opacity: 0.08,
    duration: '13s',
    reverse: false,
  },
  {
    d: 'M-20,190 Q110,140 190,220 T440,190',
    color: uiColors.brand.mint,
    width: 1.1,
    dash: '5 9',
    opacity: 0.22,
    duration: '17s',
    reverse: true,
  },
  {
    d: 'M-20,260 Q140,320 260,250 T440,270',
    color: uiColors.brand.teal,
    width: 0.9,
    dash: '4 10',
    opacity: 0.16,
    duration: '21s',
    reverse: false,
  },
] as const;

export default function WelcomeBackground() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        sx={{ width: '100%', height: '100%' }}
      >
        {ROUTES.map((route, index) => (
          // 用 Box component="path" 而不是直接寫 <path style={...}>：動畫要
          // 靠 sx 產生的 CSS class 掛，才能被下面 prefers-reduced-motion
          // 的 media query 蓋掉——inline style 的優先權太高，media query
          // 蓋不動。
          <Box
            key={index}
            component="path"
            d={route.d}
            fill="none"
            stroke={route.color}
            strokeWidth={route.width}
            strokeDasharray={route.dash}
            strokeLinecap="round"
            opacity={route.opacity}
            sx={{
              animation: `${drift} ${route.duration} linear infinite${
                route.reverse ? ' reverse' : ''
              }`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
