import { useEffect, useLayoutEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { radiusTokens, shadowTokens } from '@/config/designTokens';
import { uiColors } from '@/config/semanticColors';
import { mapTourSteps } from './mapTourSteps';

type MapTourOverlayProps = {
  open: boolean;
  onClose: () => void;
};

const CARD_WIDTH = 300;
const CARD_MARGIN = 16;
const SPOTLIGHT_PADDING = 8;

/**
 * 地圖操作導覽：聚光燈疊層＋步驟卡片。用 box-shadow 的 spotlight 技巧
 * （見 spotlightStyle）而不是遮罩＋挖洞，不用處理 clip-path 相容性。
 * 疊層本身 pointerEvents:'none'，使用者仍可直接操作底下的地圖／按鈕，
 * 不是強制看完才能動的 modal，只有卡片本身能點。
 */
export default function MapTourOverlay({ open, onClose }: MapTourOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  const step = mapTourSteps[stepIndex];

  // 目標元素當下不存在（響應式版面把它收起來了）就自動跳到下一步；
  // 全部都找不到就直接關閉，不要卡在一個沒東西可指的導覽疊層上。
  useEffect(() => {
    if (!open || !step) return;
    if (document.getElementById(step.targetId)) return;
    if (stepIndex >= mapTourSteps.length - 1) {
      onClose();
      return;
    }
    setStepIndex((current) => current + 1);
  }, [open, step, stepIndex, onClose]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const updateRect = () => {
      const target = document.getElementById(step.targetId);
      setTargetRect(target ? target.getBoundingClientRect() : null);
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !step || !targetRect) return null;

  const spotlightRect = {
    top: targetRect.top - SPOTLIGHT_PADDING,
    left: targetRect.left - SPOTLIGHT_PADDING,
    width: targetRect.width + SPOTLIGHT_PADDING * 2,
    height: targetRect.height + SPOTLIGHT_PADDING * 2,
  };

  // 卡片預設放目標下方；下方空間不夠就改放上方。水平方向夾在螢幕內，
  // 避免在畫面邊緣的按鈕（例如最左的 AI FAB）把卡片推出視窗外。
  const spaceBelow = window.innerHeight - spotlightRect.top - spotlightRect.height;
  const placeAbove = spaceBelow < 180 && spotlightRect.top > 180;
  const cardTop = placeAbove
    ? spotlightRect.top - CARD_MARGIN
    : spotlightRect.top + spotlightRect.height + CARD_MARGIN;
  const idealLeft = spotlightRect.left + spotlightRect.width / 2 - CARD_WIDTH / 2;
  const cardLeft = Math.min(
    Math.max(idealLeft, CARD_MARGIN),
    window.innerWidth - CARD_WIDTH - CARD_MARGIN,
  );

  const isLastStep = stepIndex === mapTourSteps.length - 1;

  return (
    <Box
      role="dialog"
      aria-label={`地圖導覽：${step.title}`}
      sx={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'none' }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: spotlightRect.top,
          left: spotlightRect.left,
          width: spotlightRect.width,
          height: spotlightRect.height,
          borderRadius: radiusTokens.floating,
          boxShadow: `0 0 0 9999px ${uiColors.brand.ink}8c`,
          transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      />
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          top: placeAbove ? undefined : cardTop,
          bottom: placeAbove ? window.innerHeight - cardTop : undefined,
          left: cardLeft,
          width: CARD_WIDTH,
          p: 2,
          borderRadius: radiusTokens.floating,
          boxShadow: shadowTokens.panel,
          pointerEvents: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: 'secondary.dark' }}
            >
              {stepIndex + 1} / {mapTourSteps.length}
            </Typography>
            <Typography variant="subtitle1" fontWeight={800}>
              {step.title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="關閉導覽"
            sx={{ mt: -0.5, mr: -0.5 }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mt: 0.75 }}
        >
          {step.description}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 2,
          }}
        >
          <Button
            size="small"
            onClick={() => setStepIndex((current) => current - 1)}
            disabled={stepIndex === 0}
          >
            上一步
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              if (isLastStep) onClose();
              else setStepIndex((current) => current + 1);
            }}
          >
            {isLastStep ? '完成' : '下一步'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
