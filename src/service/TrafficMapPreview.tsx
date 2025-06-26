import { useContext, createContext, useState, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Basemap from "@arcgis/core/Basemap";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useTrafficMapContext } from "@/hooks/useGetContext";
import { parseWKTPolygon } from "./arcGIS/parser";
import Polygon from "@arcgis/core/geometry/Polygon";

import MyDrawer from "@/components/MyDrawer";
// 解析 WKT
const points = parseWKTPolygon(
  "POLYGON((121.29448166146477 24.919028160170058,121.29447693632446 24.919024108525516,121.29447118359082 24.919028420114472,121.29447512662043 24.919034145364016,121.29448166146477 24.919028160170058))"
); // [[lng, lat], ...]

// ArcGIS Polygon 需要 [ [lng, lat], ... ]
const polygon = new Polygon({
  rings: [points as number[][]],
  spatialReference: { wkid: 4326 },
});

const polygonGraphic = new Graphic({
  geometry: polygon,
  symbol: {
    type: "simple-fill",
    color: [255, 0, 0, 0.3],
    outline: { color: [255, 0, 0], width: 2 },
  },
});

export default function TrafficMapPreview() {
  return (
    <TrafficDataProvider>
      <Box
        sx={{
          height: "100%",
          position: "relative",
        }}
      >
        <TrafficMap />
        <CustomButton />
      </Box>
    </TrafficDataProvider>
  );
}

// contexts/TrafficDataContext.jsx
function getPolygonCentroid(points: number[][]) {
  let lngSum = 0,
    latSum = 0;
  points.forEach(([lng, lat]) => {
    lngSum += lng;
    latSum += lat;
  });
  return [lngSum / points.length, latSum / points.length];
}
const TrafficDataContext = createContext<any>({});

export const useTrafficData = () => {
  const context = useContext(TrafficDataContext);
  if (!context) {
    throw new Error("useTrafficData must be used within TrafficDataProvider");
  }
  return context;
};

const iconSize = 36;

const CustomButton = () => {
  const { view } = useTrafficMapContext();

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("用戶位置:", position.coords);
          view.current?.goTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 15,
          });
          // 這裡可以調用地圖 API 移動到用戶位置
        },
        (error) => {
          console.error("取得位置失敗:", error);
        }
      );
    }
  };
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <MyDrawer />
    </Box>
  );
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
    } catch (error) {
      console.error("載入交通資料失敗:", error);
      setError(error.message);
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
  const { view } = useTrafficMapContext();
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
      // 國土測繪中心 WMTS 服務
      const basemapLayers = {
        // 通用版電子地圖
        emap: "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}",

        // 地形圖
        terrain:
          "https://wmts.nlsc.gov.tw/wmts/DTM/default/GoogleMapsCompatible/{z}/{y}/{x}",
      };

      const taiwanBaseMapLayer = new WebTileLayer({
        urlTemplate: basemapLayers.emap,
        copyright: "© 內政部國土測繪中心",
      });

      const taiwanBaseMap = new Basemap({
        baseLayers: [taiwanBaseMapLayer],
        title: "台灣電子地圖",
        id: "taiwan-emap",
      });

      // 加入支援聚合的 FeatureLayer
      const featureLayer = new FeatureLayer({
        url: "你的圖層服務網址", // 例如: https://services.arcgis.com/xxx/arcgis/rest/services/your_layer/FeatureServer/0
        featureReduction: {
          type: "cluster",
          clusterRadius: "100px", // 聚合半徑
          popupTemplate: {
            title: "群集內有 {cluster_count} 筆資料",
            content: "點擊展開查看詳細資料",
          },
        },
      });

      const map = new Map({
        basemap: taiwanBaseMap,
      });

      map.add(featureLayer);

      view.current = new MapView({
        container: mapDiv.current,
        map,
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
      // 測試：加一個 WKT 多邊形到 traffic-events
      function parseWKTPolygon(wkt: string): [number, number][] | null {
        const match = wkt.match(/POLYGON\s*\(\((.+)\)\)/i);
        if (!match) return null;
        return match[1].split(",").map((pt) => {
          const [lng, lat] = pt.trim().split(/\s+/).map(Number);
          return [lng, lat];
        });
      }

      const testWKT =
        "POLYGON((121.29448166146477 24.919028160170058,121.29447693632446 24.919024108525516,121.29447118359082 24.919028420114472,121.29447512662043 24.919034145364016,121.29448166146477 24.919028160170058))";
      const points = parseWKTPolygon(testWKT);
      if (points) {
        const polygon = new Polygon({
          rings: [points],
          spatialReference: { wkid: 4326 },
        });
        const polygonGraphic = new Graphic({
          geometry: polygon,
          symbol: {
            type: "simple-fill",
            color: [255, 0, 0, 0.3],
            outline: { color: [255, 0, 0], width: 2 },
          },
          attributes: { test: true },
        });
        const trafficLayer = view.current.map.findLayerById("traffic-events");
        if (trafficLayer && "add" in trafficLayer) {
          // @ts-ignore
          trafficLayer.add(polygonGraphic);
          const location = getPolygonCentroid(points);
          view.current.goTo({
            center: location,
            zoom: 15,
          });
        }
      }

      console.log("地圖初始化完成");
    } catch (error) {
      console.error("地圖初始化失敗:", error);
    }
  };

  const updateMapLayers = async () => {
    try {
      const trafficLayer = view.current?.map?.findLayerById("traffic-events");
      const parkingLayer = view.current?.map?.findLayerById("parking-lots");
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

        trafficLayer?.addMany(trafficGraphics);
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
