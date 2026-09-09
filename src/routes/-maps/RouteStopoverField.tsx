import { useSortable } from '@dnd-kit/react/sortable';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import type { PlaceSearchResult } from '@/service/placeSearchApi';
import RouteWaypointField from './RouteWaypointField';
import { tooltipSlots } from '@/config/designTokens';

type RouteStopoverFieldProps = {
  id: string;
  index: number;
  value: string;
  results: PlaceSearchResult[];
  isSearching: boolean;
  disabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
  onSelect: (result: PlaceSearchResult) => void;
  onRemove: () => void;
  onMove: (offset: -1 | 1) => void;
};

/** 可拖曳排序，並提供鍵盤上移／下移控制的途經點欄位。 */
export default function RouteStopoverField({
  id,
  index,
  value,
  results,
  isSearching,
  disabled,
  isFirst,
  isLast,
  onChange,
  onSearch,
  onSelect,
  onRemove,
  onMove,
}: RouteStopoverFieldProps) {
  const sortable = useSortable({ id, index, disabled });

  return (
    <Box ref={sortable.ref} sx={{ opacity: sortable.isDragging ? 0.55 : 1 }}>
      <Stack direction="row" spacing={0.5} alignItems="flex-start">
        <Stack direction="row" spacing={0} mt={0.5}>
          <Tooltip title={`拖曳途經點 ${index + 1}`} slotProps={tooltipSlots}>
            <IconButton
              ref={sortable.handleRef}
              disabled={disabled}
              aria-label={`拖曳途經點 ${index + 1}`}
              sx={{
                alignSelf: 'start',
                cursor: disabled ? 'default' : 'grab',
                touchAction: 'none',
                '&:active': { cursor: disabled ? 'default' : 'grabbing' },
              }}
            >
              <DragIndicatorRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Stack>
            <Tooltip title="上移" slotProps={tooltipSlots}>
              <span>
                <IconButton
                  size="small"
                  disabled={disabled || isFirst}
                  aria-label={`上移途經點 ${index + 1}`}
                  onClick={() => onMove(-1)}
                >
                  <ArrowUpwardRoundedIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="下移" slotProps={tooltipSlots}>
              <span>
                <IconButton
                  size="small"
                  disabled={disabled || isLast}
                  aria-label={`下移途經點 ${index + 1}`}
                  onClick={() => onMove(1)}
                >
                  <ArrowDownwardRoundedIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        <Box flex={1} minWidth={0}>
          <RouteWaypointField
            label={`途經點 ${index + 1}`}
            value={value}
            results={results}
            isSearching={isSearching}
            disabled={disabled}
            onChange={onChange}
            onSearch={onSearch}
            onSelect={onSelect}
          />
        </Box>
        <Tooltip title="移除途經點" slotProps={tooltipSlots}>
          <IconButton
            disabled={disabled}
            aria-label={`移除途經點 ${index + 1}`}
            onClick={onRemove}
            sx={{ mt: 0.5 }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
