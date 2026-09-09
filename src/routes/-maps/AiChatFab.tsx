import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { ChatName } from '@/config/appInfo';
import { shadowTokens, tooltipSlots } from '@/config/designTokens';

type AiChatFabProps = { isOpen: boolean; onToggle: () => void };

/** 左下角常駐的 AI 路線助理入口，用 GSAP 做待機浮動與點擊回饋動畫。 */
export default function AiChatFab({ isOpen, onToggle }: AiChatFabProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const floatTweenRef = useRef<gsap.core.Tween | null>(null);
  const wasOpenRef = useRef(isOpen);

  /** 面板關閉時（不論是按 X、按 Esc 還是再點一次這顆按鈕）把焦點還給這裡，
      鍵盤使用者才不會在面板消失後焦點卻掉到不知道哪裡。 */
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) buttonRef.current?.focus();
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    gsap.set(button, { scale: 0, opacity: 0 });
    gsap.to(button, {
      scale: 1,
      opacity: 1,
      duration: 0.5,
      ease: 'back.out(1.7)',
    });
    floatTweenRef.current = gsap.to(button, {
      y: -8,
      duration: 1.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return () => {
      floatTweenRef.current?.kill();
      gsap.killTweensOf(button);
    };
  }, []);

  const handleClick = () => {
    const button = buttonRef.current;
    if (button) {
      gsap.fromTo(
        button,
        { scale: 0.8 },
        { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' },
      );
    }
    onToggle();
  };

  return (
    <Tooltip
      title={isOpen ? `關閉 ${ChatName} 路線助理` : `開啟 ${ChatName} 路線助理`}
      slotProps={tooltipSlots}
    >
      <IconButton
        id="map-tour-ai-chat"
        ref={buttonRef}
        onClick={handleClick}
        aria-label={
          isOpen ? `關閉 ${ChatName} 路線助理` : `開啟 ${ChatName} 路線助理`
        }
        aria-pressed={isOpen}
        sx={{
          position: 'absolute',
          zIndex: 7,
          left: { xs: 12, md: 16 },
          bottom: { xs: 12, sm: 24 },
          width: 56,
          height: 56,
          bgcolor: 'background.paper',
          // logo 是固定配色的圖片、不能像 SVG 圖示一樣靠 color 反轉，
          // 開啟狀態改用外框強調，避免硬套底色蓋掉 logo 本身的顏色。
          border: isOpen ? '2px solid' : 'none',
          borderColor: 'secondary.main',
          boxShadow: shadowTokens.control,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <Box
          component="img"
          src="/Logo-icon-bg.png"
          alt=""
          sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </IconButton>
    </Tooltip>
  );
}
