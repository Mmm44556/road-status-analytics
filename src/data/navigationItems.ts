import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PublicIcon from "@mui/icons-material/Public";

export const navigationItems = [
  {
    label: "即時路況",
    mobileLabel: "路況",
    icon: DashboardIcon,
    href: "/",
  },
  {
    label: "趨勢分析",
    mobileLabel: "分析",
    icon: LeaderboardIcon,
    href: "/analytics",
  },
  {
    label: "地圖探索",
    mobileLabel: "地圖",
    icon: PublicIcon,
    href: "/maps",
  },
];
