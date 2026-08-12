import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";

export const navigationItems = [
  {
    label: "即時路況",
    mobileLabel: "路況",
    icon: RouteRoundedIcon,
    href: "/",
  },
  {
    label: "趨勢分析",
    mobileLabel: "分析",
    icon: QueryStatsRoundedIcon,
    href: "/analytics",
  },
  {
    label: "地圖探索",
    mobileLabel: "地圖",
    icon: MapRoundedIcon,
    href: "/maps",
  },
];
