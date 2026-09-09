import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { tooltipSlots } from '@/config/designTokens';
import MapTourOverlay from './MapTourOverlay';

/**
 * 觸發地圖操作導覽（聚光燈一步步介紹搜尋／縣市選取／圖層／路線規劃／
 * AI 助理）的入口，portal 進 NavBar 的 #header-layer-controls（跟
 * LayerMenu、重置按鈕同一個插槽）。可以重複點擊觀看，不是只在第一次
 * 進站時強制彈出——那件事已經交給 welcome 頁的敘事動畫做了。
 */
export default function MapTourButton() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setPortalTarget(document.getElementById('header-layer-controls'));
  }, []);

  if (!portalTarget) return null;

  return (
    <>
      {createPortal(
        <Tooltip title="操作導覽" slotProps={tooltipSlots}>
          <IconButton
            onClick={() => setIsOpen(true)}
            aria-label="開始地圖操作導覽"
            color="inherit"
            sx={{ flexShrink: 0 }}
          >
            <HelpOutlineRoundedIcon />
          </IconButton>
        </Tooltip>,
        portalTarget,
      )}
      <MapTourOverlay open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
