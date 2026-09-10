import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MobileWelcomeScene from './MobileWelcomeScene';
import DesktopWelcomeScene from './DesktopWelcomeScene';
import WelcomeBackground from './WelcomeBackground';

/**
 * 介紹頁的最外層：依螢幕寬度切換手機版／桌面版動畫元件。WelcomeBackground
 * 是墊在最底層的裝飾用路線曲線（zIndex:0），敘事動畫元件自己是 zIndex:1，
 * 所以背景不會蓋到前景。
 */
export default function WelcomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
      }}
    >
      <WelcomeBackground />
      {isMobile ? <MobileWelcomeScene /> : <DesktopWelcomeScene />}
    </Box>
  );
}
