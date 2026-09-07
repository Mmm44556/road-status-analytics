import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import EditLocationAltRoundedIcon from '@mui/icons-material/EditLocationAltRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import type { CountySelection } from '@/service/map/features/countyBoundaries';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';
import { radiusTokens, shadowTokens } from '@/config/designTokens';
import { getCountySelectionPresentation } from './countySelectionPresentation';
import { theme } from '@/config/theme';

type CountySelectionControlProps = {
  selectedCounty: CountySelection | null;
  selectedTownship: TownshipSelection | null;
  isSelectingTownship: boolean;
  onSkipTownship: () => void;
  onReselectTownship: () => void;
  onReselect: () => void;
};

/** 選取期間顯示步驟引導，完成後收合為行政區篩選按鈕。 */
export default function CountySelectionControl({
  selectedCounty,
  selectedTownship,
  isSelectingTownship,
  onSkipTownship,
  onReselectTownship,
  onReselect,
}: CountySelectionControlProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const presentation = getCountySelectionPresentation(
    selectedCounty?.name ?? null,
    selectedTownship?.name ?? null,
    isSelectingTownship,
  );

  const runAndClose = (action: () => void) => {
    setMenuAnchor(null);
    action();
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: 7,
        top: { xs: 76, md: 24 },
        right: { sm: 16 },
        [theme.breakpoints.down('sm')]: {
          right: 'none',
          left: 12,
        },
      }}
    >
      {presentation.mode === 'selecting' && (
        <Paper
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 1.5,
            py: 1,
            borderRadius: radiusTokens.floating,
            boxShadow: shadowTokens.control,
            bgcolor: 'rgba(255,255,255,.94)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <PlaceRoundedIcon color="primary" aria-hidden="true" />
          <Box aria-live="polite">
            <Typography variant="caption" color="primary" fontWeight={700}>
              {presentation.step}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {presentation.message}
            </Typography>
          </Box>
          {isSelectingTownship && (
            <Button size="small" variant="outlined" onClick={onSkipTownship}>
              略過鄉鎮
            </Button>
          )}
        </Paper>
      )}

      {presentation.mode === 'complete' && (
        <>
          <Button
            variant="contained"
            color="inherit"
            startIcon={<PlaceRoundedIcon color="primary" />}
            endIcon={<ExpandMoreRoundedIcon />}
            aria-haspopup="menu"
            aria-expanded={Boolean(menuAnchor)}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            sx={{
              bgcolor: 'rgba(255,255,255,.94)',
              borderRadius: radiusTokens.floating,
              boxShadow: shadowTokens.control,
              backdropFilter: 'blur(16px)',
              fontWeight: 700,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            {presentation.label}
          </Button>
          <Popper
            open={Boolean(menuAnchor)}
            anchorEl={menuAnchor}
            placement="bottom-end"
            modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
            sx={{ zIndex: 8 }}
          >
            <ClickAwayListener onClickAway={() => setMenuAnchor(null)}>
              <Paper
                sx={{ minWidth: 200, borderRadius: radiusTokens.floating }}
              >
                <MenuList
                  dense
                  aria-label="行政區篩選操作"
                  onKeyDown={(event) => {
                    if (event.key !== 'Escape') return;
                    setMenuAnchor(null);
                    menuAnchor?.focus();
                  }}
                >
                  <MenuItem onClick={() => runAndClose(onReselectTownship)}>
                    <EditLocationAltRoundedIcon sx={{ mr: 1 }} />
                    {selectedTownship ? '重選鄉鎮' : '選擇鄉鎮'}
                  </MenuItem>
                  <MenuItem onClick={() => runAndClose(onReselect)}>
                    <RestartAltRoundedIcon sx={{ mr: 1 }} />
                    重選縣市
                  </MenuItem>
                </MenuList>
              </Paper>
            </ClickAwayListener>
          </Popper>
        </>
      )}
    </Box>
  );
}
