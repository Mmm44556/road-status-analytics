import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { TrafficLayerId } from '@/data/trafficLayerCatalog';
import { trafficLayerCatalog } from '@/data/trafficLayerCatalog';
import {
  radiusTokens,
  shadowTokens,
  typographyTokens,
} from '@/config/designTokens';

type LayerPanelProps = {
  visibleLayers: Set<TrafficLayerId>;
  onToggle: (layerId: TrafficLayerId) => void;
};

const availabilityLabel = {
  available: '可使用',
  integrationPending: '待介接',
  sourcePending: '來源待確認',
} as const;

/** 顯示可切換的交通資料圖層工具列。 */
export default function LayerPanel({
  visibleLayers,
  onToggle,
}: LayerPanelProps) {
  return (
    <Paper
      component="nav"
      aria-label="交通圖層工具列"
      sx={{
        position: 'absolute',
        zIndex: 8,
        top: { xs: 'auto', md: 82 },
        right: { xs: 12, md: 'auto' },
        bottom: { xs: 12, md: 'auto' },
        left: { xs: 12, md: 16 },
        display: 'flex',
        flexDirection: { xs: 'row', md: 'column' },
        justifyContent: { xs: 'space-around', md: 'flex-start' },
        gap: 0.5,
        width: { xs: 'auto', md: 64 },
        p: 0.75,
        borderRadius: radiusTokens.floating,
        bgcolor: 'rgba(255,255,255,.94)',
        backdropFilter: 'blur(16px)',
        boxShadow: shadowTokens.panel,
      }}
    >
      {trafficLayerCatalog.map((layer) => {
        const isAvailable = layer.availability === 'available';
        const isActive = visibleLayers.has(layer.id);
        return (
          <Tooltip
            key={layer.id}
            title={`${layer.label}・${availabilityLabel[layer.availability]}`}
            placement="right"
            arrow
          >
            <span>
              <IconButton
                disabled={!isAvailable}
                aria-label={`${isActive ? '隱藏' : '顯示'}${layer.label}，${availabilityLabel[layer.availability]}`}
                aria-pressed={isActive}
                onClick={() => onToggle(layer.id)}
                sx={{
                  position: 'relative',
                  width: 50,
                  height: 50,
                  borderRadius: radiusTokens.surface,
                  color: isActive ? '#FFFFFF' : layer.color,
                  bgcolor: isActive ? layer.color : 'transparent',
                  opacity: isAvailable ? 1 : 0.46,
                  transition:
                    'transform 160ms ease, background-color 160ms ease',
                  '&:hover': {
                    bgcolor: isActive ? layer.color : layer.softColor,
                    transform: 'translateY(-1px)',
                  },
                  '&.Mui-disabled': { color: layer.color },
                }}
              >
                <layer.icon fontSize="small" aria-hidden="true" />
                {isActive && (
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      right: 5,
                      top: 5,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: '#FFFFFF',
                      boxShadow: `0 0 0 2px ${layer.color}`,
                    }}
                  />
                )}
              </IconButton>
            </span>
          </Tooltip>
        );
      })}
      <Typography
        variant="caption"
        aria-hidden="true"
        sx={{
          display: { xs: 'none', md: 'block' },
          pt: 0.5,
          pb: 0.25,
          textAlign: 'center',
          color: 'text.secondary',
          fontSize: typographyTokens.fontSize.micro,
          fontWeight: typographyTokens.fontWeight.heavy,
          letterSpacing: '.08em',
        }}
      >
        圖層
      </Typography>
    </Paper>
  );
}
