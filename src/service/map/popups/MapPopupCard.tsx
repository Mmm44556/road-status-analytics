import type { ReactNode } from 'react';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { radiusTokens, shadowTokens, typographyTokens } from '@/config/designTokens';

type MapPopupCardProps = {
  ariaLabel: string;
  closeLabel: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 支援手動刷新的圖層（YouBike／VD／捷運）才傳入，統一顯示在關閉鈕左邊。 */
  onReload?: () => void;
  reloadLabel?: string;
  isReloading?: boolean;
};

/** 地圖點位 popup 的共用外殼：卡片、下方箭頭、關閉鈕（與選用的刷新鈕）。 */
export default function MapPopupCard({
  ariaLabel,
  closeLabel,
  title,
  onClose,
  children,
  onReload,
  reloadLabel = '重新整理這一點的即時資料',
  isReloading = false,
}: MapPopupCardProps) {
  return (
    <Paper
      role="dialog"
      aria-label={ariaLabel}
      elevation={0}
      sx={{
        position: 'relative',
        width: { xs: 280, sm: 340 },
        maxWidth: 'calc(100vw - 32px)',
        p: 2,
        border: '1px solid rgba(16,47,58,.12)',
        borderRadius: radiusTokens.floating,
        bgcolor: 'rgba(255,255,255,.98)',
        boxShadow: shadowTokens.floating,
        '&::after': {
          content: '""',
          position: 'absolute',
          left: '50%',
          bottom: -8,
          width: 16,
          height: 16,
          bgcolor: 'background.paper',
          borderRight: '1px solid rgba(16,47,58,.12)',
          borderBottom: '1px solid rgba(16,47,58,.12)',
          transform: 'translateX(-50%) rotate(45deg)',
        },
      }}
    >
      {onReload && (
        <Tooltip title={reloadLabel}>
          <span style={{ position: 'absolute', right: 40, top: 8 }}>
            <IconButton
              size="small"
              aria-label={reloadLabel}
              onClick={onReload}
              disabled={isReloading}
            >
              <RefreshRoundedIcon
                fontSize="small"
                sx={
                  isReloading
                    ? {
                        animation: 'map-popup-spin 1s linear infinite',
                        '@keyframes map-popup-spin': {
                          from: { transform: 'rotate(0deg)' },
                          to: { transform: 'rotate(360deg)' },
                        },
                      }
                    : undefined
                }
              />
            </IconButton>
          </span>
        </Tooltip>
      )}
      <IconButton
        size="small"
        aria-label={closeLabel}
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8 }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
      <Typography
        component="h3"
        variant="subtitle1"
        fontWeight={typographyTokens.fontWeight.extraBold}
        sx={{ pr: onReload ? 7 : 4 }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
