// App.jsx
import React, {
  useContext,
  createContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Update, CheckCircle } from "@mui/icons-material";

// components/UI/InfoPanel.jsx
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Box,
  Collapse,
  IconButton,
  Alert,    
  Switch,
  CircularProgress,
  Snackbar,
  Slide,
  AlertTitle,
  Divider,
} from "@mui/material";
import {
  TrafficOutlined,
  LocalParkingOutlined,
  VideocamOutlined,
  ConstructionOutlined,
  CloudOutlined,
  MenuOutlined,
} from "@mui/icons-material";
// components/Map/TrafficMap.jsx
import { loadModules } from "esri-loader";

// components/Map/MapControls.jsx
import {
  Fab,
  Tooltip,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from "@mui/material";
import {
  MyLocation,
  Refresh,
  Settings,
  Layers,
  Fullscreen,
} from "@mui/icons-material";
// 自定義主題
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Microsoft JhengHei", "Roboto", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(10px)",
        },
      },
    },
  },
});

export default function A() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TrafficDataProvider>
        <Box sx={{ height: "100vh", position: "relative", overflow: "hidden" }}>
          <TrafficMap />
          <InfoPanel />
          <StatusBar />
          <MapControls />
          <NotificationSnackbar />
        </Box>
      </TrafficDataProvider>
    </ThemeProvider>
  );
}

// contexts/TrafficDataContext.jsx

const TrafficDataContext = createContext<any>({});

export const useTrafficData = () => {
  const context = useContext(TrafficDataContext);
  if (!context) {
    throw new Error("useTrafficData must be used within TrafficDataProvider");
  }
  return context;
};

export const TrafficDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [trafficEvents, setTrafficEvents] = useState([]);
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedLayers, setSelectedLayers] = useState({
    traffic: true,
    parking: true,
    cameras: true,
    construction: true,
  });
  const [notifications, setNotifications] = useState([]);

  const loadTrafficData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [events, parking] = await Promise.all([
        tdxService.getTrafficEvents("Taichung"),
        tdxService.getParkingData("Taichung"),
      ]);

      setTrafficEvents(events);
      setParkingLots(parking);
      setLastUpdate(new Date());

      // 添加成功通知
      addNotification("資料更新成功", "success");
    } catch (error) {
      console.error("載入交通資料失敗:", error);
      setError(error.message);
      addNotification("資料載入失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleLayer = (layerName) => {
    setSelectedLayers((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  const addNotification = (message, severity = "info") => {
    const notification = {
      id: Date.now(),
      message,
      severity,
      timestamp: new Date(),
    };
    setNotifications((prev) => [...prev, notification]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  useEffect(() => {
    loadTrafficData();
    const interval = setInterval(loadTrafficData, 30000);
    return () => clearInterval(interval);
  }, []);

  const value = {
    trafficEvents,
    parkingLots,
    loading,
    error,
    lastUpdate,
    selectedLayers,
    notifications,
    loadTrafficData,
    toggleLayer,
    addNotification,
    removeNotification,
  };

  return (
    <TrafficDataContext.Provider value={value}>
      {children}
    </TrafficDataContext.Provider>
  );
};

const TrafficMap = () => {
  const mapDiv = useRef<HTMLDivElement>(null);
  const view = useRef<any>(null);
  const { trafficEvents, parkingLots, selectedLayers } = useTrafficData();

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (view.current) {
      updateMapLayers();
    }
  }, [trafficEvents, parkingLots, selectedLayers]);

  const initializeMap = async () => {
    try {
      const [Map, MapView, GraphicsLayer] = await loadModules([
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/GraphicsLayer",
      ]);

      const map = new Map({
        basemap: "streets-navigation-vector",
      });

      view.current = new MapView({
        container: mapDiv.current,
        map: map,
        center: [120.6478, 24.1477], // 台中市中心
        zoom: 13,
        ui: {
          components: ["zoom"], // 移除預設的 compass，我們用 MUI 控制
        },
      });

      // 建立圖層
      view.current.map.addMany([
        new GraphicsLayer({ id: "traffic-events" }),
        new GraphicsLayer({ id: "parking-lots" }),
        new GraphicsLayer({ id: "cameras" }),
        new GraphicsLayer({ id: "construction" }),
      ]);

      await view.current.when();
      console.log("地圖初始化完成");
    } catch (error) {
      console.error("地圖初始化失敗:", error);
    }
  };

  const updateMapLayers = async () => {
    try {
      const [Graphic, Point, SimpleMarkerSymbol] = await loadModules([
        "esri/Graphic",
        "esri/geometry/Point",
        "esri/symbols/SimpleMarkerSymbol",
      ]);

      const trafficLayer = view.current.map.findLayerById("traffic-events");
      const parkingLayer = view.current.map.findLayerById("parking-lots");

      if (trafficLayer) trafficLayer.removeAll();
      if (parkingLayer) parkingLayer.removeAll();

      // 添加交通事件
      if (selectedLayers.traffic && trafficEvents.length > 0) {
        const trafficGraphics = trafficEvents
          .filter((event) => event.location)
          .map((event) => {
            const point = new Point({
              longitude: event.location.lng,
              latitude: event.location.lat,
            });

            const symbol = new SimpleMarkerSymbol({
              style: "circle",
              color: getEventColor(event.type),
              size: "12px",
              outline: { color: "white", width: 2 },
            });

            return new Graphic({
              geometry: point,
              symbol: symbol,
              attributes: event,
              popupTemplate: {
                title: "🚨 {title}",
                content: `
                  <div style="padding: 10px;">
                    <p><strong>事件類型:</strong> {type}</p>
                    <p><strong>描述:</strong> {description}</p>
                    <p><strong>開始時間:</strong> {startTime}</p>
                  </div>
                `,
              },
            });
          });

        trafficLayer.addMany(trafficGraphics);
      }

      // 添加停車場
      if (selectedLayers.parking && parkingLots.length > 0) {
        const parkingGraphics = parkingLots
          .filter((lot) => lot.location && lot.location.lat && lot.location.lng)
          .map((lot) => {
            const point = new Point({
              longitude: lot.location.lng,
              latitude: lot.location.lat,
            });

            const symbol = new SimpleMarkerSymbol({
              style: "square",
              color: [33, 150, 243, 0.8],
              size: "16px",
              outline: { color: "white", width: 2 },
            });

            return new Graphic({
              geometry: point,
              symbol: symbol,
              attributes: lot,
              popupTemplate: {
                title: "🅿️ {name}",
                content: `
                  <div style="padding: 10px;">
                    <p><strong>總車位:</strong> {totalSpaces}</p>
                    <p><strong>剩餘車位:</strong> {availableSpaces}</p>
                  </div>
                `,
              },
            });
          });

        parkingLayer.addMany(parkingGraphics);
      }
    } catch (error) {
      console.error("更新地圖圖層失敗:", error);
    }
  };

  const getEventColor = (eventType) => {
    const colors = {
      1: [244, 67, 54], // 交通事故 - 紅色
      2: [255, 152, 0], // 施工 - 橘色
      3: [255, 193, 7], // 壅塞 - 黃色
      4: [156, 39, 176], // 特殊管制 - 紫色
      5: [96, 125, 139], // 天氣 - 灰色
      6: [139, 69, 19], // 災害 - 咖啡色
      7: [63, 81, 181], // 活動 - 藍色
      8: [76, 175, 80], // 其他異常 - 綠色
    };
    return colors[eventType] || [158, 158, 158];
  };

  return (
    <Box
      ref={mapDiv}
      sx={{
        height: "100%",
        width: "100%",
        "& .esri-ui-corner": {
          zIndex: 1000,
        },
      }}
    />
  );
};

// components/UI/InfoPanel.jsx

const InfoPanel = () => {
  const { selectedLayers, toggleLayer, trafficEvents, parkingLots, loading } =
    useTrafficData();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState("layers");

  const menuItems = [
    {
      key: "traffic",
      icon: <TrafficOutlined />,
      label: "交通資訊",
      count: trafficEvents.length,
      color: "error",
    },
    {
      key: "parking",
      icon: <LocalParkingOutlined />,
      label: "停車場",
      count: parkingLots.length,
      color: "primary",
    },
    {
      key: "cameras",
      icon: <VideocamOutlined />,
      label: "監視器",
      count: 24,
      color: "success",
    },
    {
      key: "construction",
      icon: <ConstructionOutlined />,
      label: "施工路段",
      count: 3,
      color: "warning",
    },
  ];

  return (
    <Paper
      elevation={8}
      sx={{
        position: "absolute",
        top: 20,
        left: 20,
        width: { xs: "90vw", sm: 350 },
        maxWidth: 400,
        zIndex: 1000,
        bgcolor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* 標題列 */}
      <Box
        sx={{
          p: 2,
          background: "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
            台中市即時交通資訊網
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Taichung City Realtime Traffic Information
          </Typography>
        </Box>
        <IconButton
          color="inherit"
          onClick={() => setCollapsed(!collapsed)}
          size="small"
        >
          <MenuOutlined />
        </IconButton>
      </Box>

      <Collapse in={!collapsed}>
        {/* 天氣資訊 */}
        <Box sx={{ p: 2, bgcolor: "primary.50" }}>
          <Alert icon={<CloudOutlined />} severity="info" sx={{ mb: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2">晴時多雲</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                30°C ~ 33°C
              </Typography>
            </Box>
          </Alert>
        </Box>

        <Divider />

        {/* 圖層控制 */}
        <Box sx={{ p: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ mb: 1, fontWeight: 600, color: "primary.main" }}
          >
            圖層控制
          </Typography>

          <List dense>
            {menuItems.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton
                  onClick={() => toggleLayer(item.key)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    "&:hover": {
                      bgcolor: `${item.color}.50`,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={`${item.count} 個項目`}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={item.count}
                      size="small"
                      color={item.color}
                      variant={selectedLayers[item.key] ? "filled" : "outlined"}
                    />
                    <Switch
                      edge="end"
                      checked={selectedLayers[item.key]}
                      onChange={() => toggleLayer(item.key)}
                      size="small"
                      color={item.color}
                    />
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider />

        {/* 系統狀態 */}
        <Box sx={{ p: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ mb: 1, fontWeight: 600, color: "primary.main" }}
          >
            系統狀態
          </Typography>

          <Alert
            severity={loading ? "warning" : "success"}
            variant="outlined"
            sx={{ fontSize: "0.875rem" }}
          >
            {loading ? "資料更新中..." : "系統運作正常"}
          </Alert>
        </Box>
      </Collapse>
    </Paper>
  );
};

// components/UI/StatusBar.jsx

const StatusBar = () => {
  const { loading, lastUpdate } = useTrafficData();

  return (
    <Box
      sx={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 1000,
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      {/* 連線狀態 */}
      <Chip
        icon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
        label={loading ? "更新中" : "即時連線"}
        color={loading ? "warning" : "success"}
        variant="filled"
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          "& .MuiChip-icon": {
            color: loading ? "warning.main" : "success.main",
          },
        }}
      />

      {/* 更新時間 */}
      <Chip
        icon={<Update />}
        label={`${lastUpdate.toLocaleTimeString("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
        })}`}
        variant="outlined"
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
        }}
      />
    </Box>
  );
};

const MapControls = () => {
  const { loadTrafficData } = useTrafficData();

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("用戶位置:", position.coords);
          // 這裡可以調用地圖 API 移動到用戶位置
        },
        (error) => {
          console.error("取得位置失敗:", error);
        }
      );
    }
  };

  const speedDialActions = [
    { icon: <MyLocation />, name: "我的位置", action: handleLocationClick },
    { icon: <Refresh />, name: "重新載入", action: loadTrafficData },
    {
      icon: <Layers />,
      name: "圖層設定",
      action: () => console.log("圖層設定"),
    },
    {
      icon: <Fullscreen />,
      name: "全螢幕",
      action: () => console.log("全螢幕"),
    },
    { icon: <Settings />, name: "設定", action: () => console.log("設定") },
  ];

  return (
    <>
      {/* 主要控制按鈕 */}
      <Box
        sx={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <SpeedDial
          ariaLabel="地圖控制"
          sx={{
            "& .MuiFab-primary": {
              bgcolor: "primary.main",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            },
          }}
          icon={<SpeedDialIcon />}
          direction="up"
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.action}
              sx={{
                "& .MuiFab-primary": {
                  bgcolor: "background.paper",
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: "primary.50",
                  },
                },
              }}
            />
          ))}
        </SpeedDial>
      </Box>

      {/* 單獨的定位按鈕 (可選) */}
      <Box
        sx={{
          position: "absolute",
          bottom: { xs: 100, sm: 120 },
          right: { xs: 20, sm: 95 },
          zIndex: 999,
        }}
      >
        <Tooltip title="回到我的位置">
          <Fab
            color="primary"
            size="medium"
            onClick={handleLocationClick}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.95)",
              color: "primary.main",
              backdropFilter: "blur(10px)",
              "&:hover": {
                bgcolor: "primary.50",
              },
            }}
          >
            <MyLocation />
          </Fab>
        </Tooltip>
      </Box>
    </>
  );
};

// components/UI/NotificationSnackbar.jsx

function SlideTransition(props) {
  return <Slide {...props} direction="left" />;
}

const NotificationSnackbar = () => {
  const { notifications, removeNotification } = useTrafficData();

  return (
    <>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={4000}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          TransitionComponent={SlideTransition}
          sx={{
            mt: index * 7, // 堆疊多個通知
            zIndex: 2000,
          }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.severity}
            variant="filled"
            sx={{
              minWidth: 300,
              backdropFilter: "blur(10px)",
            }}
          >
            <AlertTitle>
              {notification.severity === "success"
                ? "成功"
                : notification.severity === "error"
                  ? "錯誤"
                  : notification.severity === "warning"
                    ? "警告"
                    : "資訊"}
            </AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

// services/tdxService.js (簡化版本)
class TDXService {
  constructor() {
    this.baseURL = "https://tdx.transportdata.tw/api";
  }

  async getTrafficEvents(city = "Taichung") {
    try {
      // 模擬 API 回應
      return [
        {
          id: "1",
          title: "文心路車禍",
          description: "文心路與台灣大道路口發生車禍",
          type: 1,
          location: { lng: 120.6478, lat: 24.1477 },
          startTime: new Date().toISOString(),
        },
        {
          id: "2",
          title: "五權路施工",
          description: "五權路進行道路維修",
          type: 2,
          location: { lng: 120.6521, lat: 24.1398 },
          startTime: new Date().toISOString(),
        },
      ];
    } catch (error) {
      console.error("取得交通事件失敗:", error);
      return [];
    }
  }

  async getParkingData(city = "Taichung") {
    try {
      // 模擬停車場資料
      return [
        {
          id: "P1",
          name: "台中火車站停車場",
          location: { lng: 120.6478, lat: 24.1477 },
          totalSpaces: 100,
          availableSpaces: 45,
        },
        {
          id: "P2",
          name: "中區停車場",
          location: { lng: 120.6542, lat: 24.1469 },
          totalSpaces: 80,
          availableSpaces: 23,
        },
      ];
    } catch (error) {
      console.error("取得停車場資料失敗:", error);
      return [];
    }
  }
}

export const tdxService = new TDXService();
