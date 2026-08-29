import { createTheme } from "@mui/material/styles";
import { radiusTokens, typographyTokens } from "./designTokens";
import { uiColors } from "./semanticColors";

declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    "2xl": true;
  }
}

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: uiColors.brand.ink, light: "#214A57", dark: "#08232C", contrastText: "#FFFFFF" },
    secondary: { main: uiColors.brand.teal, light: uiColors.brand.soft, dark: "#075E59" },
    error: { main: uiColors.event.accident.main },
    warning: { main: uiColors.event.congestion.main },
    success: { main: uiColors.event.activity.main },
    background: { default: "#F2F5F4", paper: "#FFFFFF" },
    text: { primary: "#142B33", secondary: "#5B6F75" },
    divider: "#DCE5E3",
  },
  typography: {
    fontFamily: 'Inter, "Noto Sans TC", "PingFang TC", sans-serif',
    h1: { fontSize: "clamp(1.6rem, 3vw, 2.35rem)", fontWeight: typographyTokens.fontWeight.heavy, lineHeight: 1.15, letterSpacing: "-0.035em" },
    h2: { fontSize: "clamp(1.2rem, 2vw, 1.55rem)", fontWeight: typographyTokens.fontWeight.bold, letterSpacing: "-0.02em" },
    h3: { fontSize: typographyTokens.fontSize.title, fontWeight: typographyTokens.fontWeight.bold },
    body2: { fontSize: typographyTokens.fontSize.body, lineHeight: 1.6 },
    caption: { fontSize: typographyTokens.fontSize.caption, lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: typographyTokens.fontWeight.bold },
  },
  shape: { borderRadius: radiusTokens.base },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1280, "2xl": 1536 } },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundImage: "radial-gradient(circle at 85% 0%, rgba(14,138,122,.08), transparent 28%)" } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: "1px solid #DCE5E3" } } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: "1px solid #DCE5E3" } } },
    MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: radiusTokens.control } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
  },
});
