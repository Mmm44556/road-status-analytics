import { createTheme } from '@mui/material/styles';
import { radiusTokens, typographyTokens } from './designTokens';
import { uiColors } from './semanticColors';

declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    '2xl': true;
  }
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: uiColors.brand.ink,
      light: '#245286',
      dark: '#031D3F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: uiColors.brand.mint,
      light: uiColors.brand.soft,
      dark: uiColors.brand.teal,
      contrastText: uiColors.brand.ink,
    },
    error: { main: uiColors.event.accident.main },
    warning: { main: uiColors.event.congestion.main },
    success: { main: uiColors.event.activity.main },
    text: {
      primary: uiColors.text.primary,
      secondary: uiColors.text.secondary,
    },
    divider: uiColors.border.default,
  },
  typography: {
    fontFamily: 'Inter, "Noto Sans TC", "PingFang TC", sans-serif',
    h1: {
      fontSize: 'clamp(1.6rem, 3vw, 2.35rem)',
      fontWeight: typographyTokens.fontWeight.heavy,
      lineHeight: 1.15,
      letterSpacing: '-0.035em',
    },
    h2: {
      fontSize: 'clamp(1.2rem, 2vw, 1.55rem)',
      fontWeight: typographyTokens.fontWeight.bold,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontSize: typographyTokens.fontSize.title,
      fontWeight: typographyTokens.fontWeight.bold,
    },
    body2: { fontSize: typographyTokens.fontSize.body, lineHeight: 1.6 },
    caption: { fontSize: typographyTokens.fontSize.caption, lineHeight: 1.5 },
    button: {
      textTransform: 'none',
      fontWeight: typographyTokens.fontWeight.bold,
    },
  },
  shape: { borderRadius: radiusTokens.base },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1280, '2xl': 1536 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // CssBaseline 預設會用 JS 動態插入一條 body { background-color: ... }，
        // 這個 <style> 是在 React 執行時才插進 <head>，時間點排在 index.css
        // 這份靜態樣式表之後，同選擇器、同優先權時「後面插入的贏」，導致
        // index.css 裡設的 body 背景色永遠不會生效。這裡把它設成 undefined，
        // MUI／emotion 在產生最終樣式時會直接省略這個屬性、不產生對應的
        // CSS 宣告，background-color 就完全交回 index.css 決定。
        body: { backgroundColor: undefined },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${uiColors.border.default}` },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${uiColors.border.default}` },
      },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: uiColors.text.secondary } },
    },
    MuiRadio: { styleOverrides: { root: { color: uiColors.text.secondary } } },
    MuiButton: {
      styleOverrides: {
        root: { minHeight: 44, borderRadius: radiusTokens.control },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
    },
  },
});
