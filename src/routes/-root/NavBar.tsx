import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import TrafficRoundedIcon from '@mui/icons-material/TrafficRounded';
import {
  iconSizeTokens,
  radiusTokens,
  shadowTokens,
  typographyTokens,
} from '@/config/designTokens';
import { uiColors } from '@/config/semanticColors';

export const desktopHeaderHeight = 64;

/** 顯示全站品牌導覽列。 */
export default function NavBar() {
  return (
    <AppBar
      component="header"
      position="fixed"
      color="primary"
      elevation={0}
      sx={{ borderBottom: '1px solid', borderColor: 'rgba(255,255,255,.12)' }}
    >
      <Toolbar
        sx={{
          minHeight: `${desktopHeaderHeight}px !important`,
          gap: 2,
          px: { xs: 1.5, md: 2.5 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              display: 'grid',
              placeItems: 'center',
              borderRadius: radiusTokens.surface,
              color: 'primary.main',
              bgcolor: uiColors.brand.mint,
              boxShadow: shadowTokens.brandMark,
            }}
          >
            <TrafficRoundedIcon
              aria-hidden="true"
              sx={{ fontSize: iconSizeTokens.brand }}
            />
          </Box>
          <Box>
            <Typography
              component="div"
              fontWeight={typographyTokens.fontWeight.extraBold}
              lineHeight={1.1}
            >
              路況通
            </Typography>
            <Typography
              component="div"
              variant="caption"
              sx={{
                display: { xs: 'none', sm: 'block' },
                color: 'rgba(255,255,255,.68)',
                letterSpacing: '.08em',
              }}
            >
              TAIWAN TRAFFIC MAP
            </Typography>
          </Box>
        </Box>
        <Typography
          variant="body2"
          sx={{
            display: { xs: 'none', md: 'block' },
            pl: 2,
            ml: 1,
            borderLeft: '1px solid rgba(255,255,255,.16)',
            color: 'rgba(255,255,255,.72)',
          }}
        >
          即時交通 GIS
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
