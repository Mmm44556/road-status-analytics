import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    "2xl": true;
  }
}

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0B2E3C", light: "#16495A", dark: "#061F29", contrastText: "#FFFFFF" },
    secondary: { main: "#0E8A7A", light: "#D9F3EE", dark: "#08675D" },
    error: { main: "#C43D4B" },
    warning: { main: "#D97706" },
    success: { main: "#138A64" },
    background: { default: "#F2F5F4", paper: "#FFFFFF" },
    text: { primary: "#142B33", secondary: "#5B6F75" },
    divider: "#DCE5E3",
  },
  typography: {
    fontFamily: 'Inter, "Noto Sans TC", "PingFang TC", sans-serif',
    h1: { fontSize: "clamp(1.6rem, 3vw, 2.35rem)", fontWeight: 750, lineHeight: 1.15, letterSpacing: "-0.035em" },
    h2: { fontSize: "clamp(1.2rem, 2vw, 1.55rem)", fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontSize: "1rem", fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1280, "2xl": 1536 } },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundImage: "radial-gradient(circle at 85% 0%, rgba(14,138,122,.08), transparent 28%)" } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: "1px solid #DCE5E3" } } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: "1px solid #DCE5E3" } } },
    MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 8 } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
  },
});

export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, "2xl": 24 };
