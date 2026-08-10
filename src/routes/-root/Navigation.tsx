import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { Link, useRouterState } from "@tanstack/react-router";
import { navigationItems } from "@/data/navigationItems";

export default function Navigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <>
      <Box component="nav" aria-label="主要導覽" sx={{ display: { xs: "none", md: "flex" }, alignSelf: "stretch", gap: 0.5 }}>
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Box key={item.href} component={Link} to={item.href} sx={{ color: active ? "#fff" : "rgba(255,255,255,.68)", textDecoration: "none", display: "flex", alignItems: "center", gap: 0.75, px: 2, borderBottom: "3px solid", borderColor: active ? "secondary.main" : "transparent", fontWeight: 700, fontSize: 14 }}>
              <item.icon sx={{ fontSize: 19 }} />{item.label}
            </Box>
          );
        })}
      </Box>
      <Paper component="nav" aria-label="手機主要導覽" sx={{ display: { xs: "grid", md: "none" }, position: "fixed", zIndex: 1300, bottom: 0, left: 0, right: 0, gridTemplateColumns: `repeat(${navigationItems.length}, 1fr)`, borderRadius: 0, borderWidth: "1px 0 0", pb: "env(safe-area-inset-bottom)" }}>
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Box key={item.href} component={Link} to={item.href} aria-current={active ? "page" : undefined} sx={{ minHeight: 64, color: active ? "secondary.dark" : "text.secondary", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.25, fontSize: 11, fontWeight: active ? 800 : 600 }}>
              <item.icon sx={{ fontSize: 23 }} />{item.mobileLabel ?? item.label}
            </Box>
          );
        })}
      </Paper>
    </>
  );
}
