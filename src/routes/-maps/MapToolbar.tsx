import type { FormEvent } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  radiusTokens,
  shadowTokens,
  tooltipSlots,
  typographyTokens,
} from '@/config/designTokens';
import type { PlaceSearchResult } from '@/service/placeSearchApi';

type MapToolbarProps = {
  statusMessage: string;
  onLocate: () => void;
  onSearch: (query: string) => void;
  searchResults: PlaceSearchResult[];
  isSearching: boolean;
  onSelectResult: (result: PlaceSearchResult) => void;
  isRoutePlannerOpen: boolean;
  onToggleRoutePlanner: () => void;
};

/** 顯示地點搜尋與使用者定位工具。 */
export default function MapToolbar({
  onLocate,
  onSearch,
  searchResults,
  isSearching,
  onSelectResult,
  isRoutePlannerOpen,
  onToggleRoutePlanner,
}: MapToolbarProps) {
  /** 僅在使用者送出時搜尋，避免對免費服務形成自動完成流量。 */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSearch(String(data.get('place') ?? '').trim());
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: 6,
        top: { xs: 12, sm: 24 },
        left: { xs: 12, md: 16 },
        right: { xs: 12, md: 16 },
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: { xs: '100%', sm: 420 },
          maxWidth: 520,
          position: 'relative',
        }}
      >
        <Paper
          component="form"
          role="search"
          onSubmit={handleSubmit}
          sx={{
            borderRadius: radiusTokens.floating,
            boxShadow: shadowTokens.control,
            overflow: 'hidden',
          }}
        >
          <TextField
            name="place"
            disabled={isSearching}
            fullWidth
            size="small"
            placeholder="搜尋地址、道路或地標"
            aria-label="搜尋地址、道路或地標"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {isSearching ? (
                      <CircularProgress size={20} aria-label="正在搜尋地點" />
                    ) : (
                      <Tooltip title="搜尋" slotProps={tooltipSlots}>
                        <IconButton
                          type="submit"
                          aria-label="搜尋地點"
                          size="small"
                        >
                          <SearchRoundedIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              padding: 0,
              '& .MuiOutlinedInput-notchedOutline': { border: 0 },
              '& .MuiInputBase-root': {
                minHeight: 48,
                bgcolor: 'background.paper',
              },
              '& .MuiInputBase-input': {
                textIndent: '.5rem',
              },
            }}
          />
        </Paper>
        {searchResults.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              position: 'absolute',
              top: 56,
              width: '100%',
              maxHeight: 320,
              overflowY: 'auto',
              borderRadius: radiusTokens.floating,
              boxShadow: shadowTokens.control,
            }}
          >
            <List aria-label="地點搜尋結果" disablePadding>
              {searchResults.map((result) => (
                <ListItemButton
                  key={result.id}
                  onClick={() => onSelectResult(result)}
                  divider
                >
                  <ListItemText
                    primary={result.name}
                    secondary={result.address}
                    slotProps={{
                      secondary: { noWrap: true },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
            <Typography
              component="p"
              sx={{
                px: 2,
                py: 1,
                color: 'text.secondary',
                fontSize: typographyTokens.fontSize.metadata,
                textAlign: 'right',
              }}
            >
              Powered by{' '}
              <Link
                href="https://www.geoapify.com/"
                target="_blank"
                rel="noreferrer"
                color="inherit"
              >
                Geoapify
              </Link>
            </Typography>
          </Paper>
        )}
      </Box>
      <Tooltip title="定位到我的位置" slotProps={tooltipSlots}>
        <IconButton
          onClick={onLocate}
          aria-label="定位到我的位置"
          sx={{
            bgcolor: 'background.paper',
            color: 'secondary.dark',
            boxShadow: shadowTokens.control,
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          <MyLocationIcon />
        </IconButton>
      </Tooltip>
      <Tooltip
        title={isRoutePlannerOpen ? '關閉路線規劃' : '開啟路線規劃'}
        slotProps={tooltipSlots}
      >
        <IconButton
          onClick={onToggleRoutePlanner}
          aria-label={isRoutePlannerOpen ? '關閉路線規劃' : '開啟路線規劃'}
          aria-pressed={isRoutePlannerOpen}
          sx={{
            bgcolor: isRoutePlannerOpen ? 'secondary.main' : 'background.paper',
            color: isRoutePlannerOpen
              ? 'secondary.contrastText'
              : 'secondary.dark',
            boxShadow: shadowTokens.control,
            '&:hover': {
              bgcolor: isRoutePlannerOpen
                ? 'secondary.dark'
                : 'background.paper',
            },
          }}
        >
          <AltRouteRoundedIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
