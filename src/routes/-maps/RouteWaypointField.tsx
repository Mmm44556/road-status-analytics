import type { KeyboardEvent } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { PlaceSearchResult } from '@/service/placeSearchApi';

type RouteWaypointFieldProps = {
  label: string;
  value: string;
  results: PlaceSearchResult[];
  isSearching: boolean;
  disabled?: boolean;
  allowCurrentLocation?: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
  onSelect: (result: PlaceSearchResult) => void;
  onUseCurrentLocation?: () => void;
};

/** 顯示單一路線端點的搜尋輸入與候選地點。 */
export default function RouteWaypointField({
  label,
  value,
  results,
  isSearching,
  disabled = false,
  allowCurrentLocation = false,
  onChange,
  onSearch,
  onSelect,
  onUseCurrentLocation,
}: RouteWaypointFieldProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || disabled) return;
    event.preventDefault();
    onSearch();
  };

  return (
    <div>
      <TextField
        fullWidth
        size="small"
        label={label}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                {allowCurrentLocation && (
                  <Tooltip title="使用目前位置">
                    <IconButton
                      size="small"
                      disabled={disabled}
                      aria-label="使用目前位置作為起點"
                      onClick={onUseCurrentLocation}
                    >
                      <MyLocationRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {isSearching ? (
                  <CircularProgress size={18} aria-label={`正在搜尋${label}`} />
                ) : (
                  <IconButton
                    size="small"
                    disabled={disabled}
                    aria-label={`搜尋${label}`}
                    onClick={onSearch}
                  >
                    <SearchRoundedIcon fontSize="small" />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          },
        }}
      />
      {results.length > 0 && (
        <List dense disablePadding aria-label={`${label}搜尋結果`}>
          {results.map((result) => (
            <ListItemButton
              title={result.address}
              key={result.id}
              onClick={() => onSelect(result)}
            >
              <ListItemText
                primary={result.name}
                secondary={result.address}
                slotProps={{ secondary: { noWrap: true } }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </div>
  );
}
