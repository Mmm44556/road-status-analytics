import type { FormEvent } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import LocationSearchingRoundedIcon from '@mui/icons-material/LocationSearchingRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { radiusTokens, shadowTokens } from '@/config/designTokens';

type MapToolbarProps = {
  statusMessage: string;
  onLocate: () => void;
  onSearch: (query: string) => void;
};

/** 顯示地點搜尋與使用者定位工具。 */
export default function MapToolbar({ onLocate, onSearch }: MapToolbarProps) {
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
        top: { xs: 12, md: 16 },
        left: { xs: 12, md: 16 },
        right: { xs: 12, md: 16 },
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
      }}
    >
      <Paper
        component="form"
        role="search"
        onSubmit={handleSubmit}
        sx={{
          width: { xs: '100%', sm: 420 },
          maxWidth: 520,
          borderRadius: radiusTokens.floating,
          boxShadow: shadowTokens.control,
          overflow: 'hidden',
        }}
      >
        <TextField
          name="place"
          fullWidth
          size="small"
          placeholder="搜尋地址、道路或地標"
          aria-label="搜尋地址、道路或地標"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="搜尋">
                  <IconButton type="submit" aria-label="搜尋地點" size="small">
                    <SearchRoundedIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': { border: 0 },
            '& .MuiInputBase-root': {
              minHeight: 48,
              bgcolor: 'background.paper',
            },
          }}
        />
      </Paper>
      <Tooltip title="定位到我的位置">
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
          <LocationSearchingRoundedIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
