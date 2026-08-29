/** 全站共用的字體尺寸與字重。 */
export const typographyTokens = {
  fontSize: {
    micro: '0.5625rem',
    metadata: '0.9rem',
    caption: '0.9rem',
    body: '0.875rem',
    title: '1rem',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    prominent: 650,
    bold: 700,
    heavy: 750,
    extraBold: 800,
  },
} as const;

/** 浮動元件使用的圓角。 */
export const radiusTokens = {
  base: 10,
  control: '8px',
  surface: '10px',
  floating: '12px',
} as const;

/** 地圖介面共用的陰影層級。 */
export const shadowTokens = {
  brandMark: 'inset 0 0 0 1px rgba(255,255,255,.24)',
  control: '0 10px 30px rgba(15,42,50,.16)',
  floating: '0 14px 36px rgba(16,47,58,.22)',
  panel: '0 16px 42px rgba(15,42,50,.18)',
} as const;

/** 非文字圖示的固定尺寸。 */
export const iconSizeTokens = {
  brand: 23,
  status: 9,
} as const;
