import * as React from "react";
import {
  styled,
  useTheme,
  type Theme,
  type CSSObject,
} from "@mui/material/styles";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar, {
  type AppBarProps as MuiAppBarProps,
} from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ConstructionWorker from "./icons/ConstructionWorker";
import GroupsIcon from "@mui/icons-material/Groups";
import WarningIcon from "@mui/icons-material/Warning";
import DirectionsIcon from "@mui/icons-material/Directions";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import CarCrashIcon from "@mui/icons-material/CarCrash";
import ConstructionIcon from "@mui/icons-material/Construction";
import AirIcon from "@mui/icons-material/Air";
import FloodIcon from "@mui/icons-material/Flood";
import { blue } from "@mui/material/colors";

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  variants: [
    {
      props: ({ open }) => open,
      style: {
        ...openedMixin(theme),
        "& .MuiDrawer-paper": openedMixin(theme),
      },
    },
    {
      props: ({ open }) => !open,
      style: {
        ...closedMixin(theme),
        "& .MuiDrawer-paper": closedMixin(theme),
      },
    },
  ],
}));
const iconSize = 32;

const IconItems = [
  {
    icon: <ConstructionWorker sx={{ width: iconSize, height: iconSize }} />,
    label: "施工中",
  },
  {
    icon: <GroupsIcon sx={{ width: iconSize, height: iconSize }} />,
    label: "活動",
  },
  {
    icon: <WarningIcon sx={{ width: iconSize, height: iconSize }} />,
    label: "警告",
  },
  {
    icon: <DirectionsIcon sx={{ width: iconSize, height: iconSize }} />,
    label: "壅塞",
  },
  {
    icon: <AltRouteIcon sx={{ width: iconSize, height: iconSize }} />,
    label: "特殊管制",
  },
  {
    icon: <CarCrashIcon sx={{ width: iconSize, height: iconSize }} />,
    label: "交通事故",
  },
  {
    icon: <ConstructionIcon sx={{ width: iconSize, height: iconSize }} />,
    label: "施工",
  },
  {
    icon: <AirIcon sx={{ width: iconSize, height: iconSize }} />,
    label: "天氣",
  },
  {
    icon: <FloodIcon sx={{ width: iconSize, height: iconSize }} />,
    label: "災害",
  },
];

export default function MyDrawer() {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(!open);
  };

  return (
    <Box>
      <Drawer
        variant="permanent"
        open={open}
        slotProps={{
          paper: {
            sx: {
              position: "absolute",
              top: 50,

              height: "auto",
              borderRadius: 10,
            },
          },
        }}
      >
        <List>
          <ListItem
            sx={{
              backgroundColor: "#fff",

              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
          >
            <ListItemButton
              onClick={handleDrawerOpen}
              sx={{
                minHeight: 48,
              }}
            >
              <ListItemIcon
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 0,
                  transform: "translateX(50%)",
                  zIndex: 1000,
                }}
              >
                {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </ListItemIcon>
            </ListItemButton>
          </ListItem>

          {IconItems.map((text, index) => (
            <ListItem key={index} disablePadding sx={{ display: "block" }}>
              <ListItemButton
                sx={[
                  {
                    minHeight: 48,
                    px: 2.5,
                  },
                  open
                    ? {
                        justifyContent: "initial",
                      }
                    : {
                        justifyContent: "center",
                      },
                ]}
              >
                <ListItemIcon
                  sx={[
                    {
                      minWidth: 0,
                      justifyContent: "center",
                    },
                    open
                      ? {
                          mr: 3,
                        }
                      : {
                          mr: "auto",
                        },
                  ]}
                >
                  {text.icon}
                </ListItemIcon>
                <ListItemText
                  primary={text.label}
                  sx={[
                    open
                      ? {
                          opacity: 1,
                        }
                      : {
                          opacity: 0,
                        },
                  ]}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
}
