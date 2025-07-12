import { useContext, createContext, useState, useEffect, useRef } from "react";
import { Box } from "@mui/material";

import Map from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import { useTrafficMapContext } from "@/hooks/useGetContext";
import MyDrawer from "@/components/MyDrawer";
import MapView from "@arcgis/core/views/MapView";
// import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

export default function TrafficMapPreview() {
  return (
    <Box
      sx={{
        position: "relative",
      }}
    >
      <TrafficMap />
      <CustomButton />
    </Box>
  );
}

const TrafficDataContext = createContext<any>({});

export const useTrafficData = () => {
  const context = useContext(TrafficDataContext);
  if (!context) {
    throw new Error("useTrafficData must be used within TrafficDataProvider");
  }
  return context;
};

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
        top: 20,
        right: 5,
        zIndex: 1000,
      }}
    >
      <MyDrawer />
    </Box>
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
    // if (view.current) {
    //   updateMapLayers();
    // }
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
        // id: "taiwan-emap",
      });
      // 加入支援聚合的 FeatureLayer
      // const featureLayer = new FeatureLayer({
      //   url: "你的圖層服務網址", // 例如: https://services.arcgis.com/xxx/arcgis/rest/services/your_layer/FeatureServer/0
      //   featureReduction: {
      //     type: "cluster",
      //     clusterRadius: "100px", // 聚合半徑
      //     popupTemplate: {
      //       title: "群集內有 {cluster_count} 筆資料",
      //       content: "點擊展開查看詳細資料",
      //     },
      //   },
      // });

      // const map = new Map({
      //   // basemap: taiwanBaseMap,
      // });
      // const graphicsLayer = new GraphicsLayer();
      const map = new Map({
        basemap: taiwanBaseMap,
        // layers: [graphicsLayer],
      });
      // map.add(featureLayer);

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
      // view.current.map.addMany([
      //   new GraphicsLayer({ id: "traffic-events" }),
      //   new GraphicsLayer({ id: "parking-lots" }),
      //   new GraphicsLayer({ id: "cameras" }),
      //   new GraphicsLayer({ id: "construction" }),
      // ]);

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
      // if (selectedLayers.traffic && trafficEvents.length > 0) {
      //   const trafficGraphics = trafficEvents
      //     .filter((event) => event.location)
      //     .map((event) => {
      //       const point = new Point({
      //         longitude: event.location.lng,
      //         latitude: event.location.lat,
      //       });

      //       const symbol = new SimpleMarkerSymbol({
      //         style: "circle",
      //         color: getEventColor(event.type),
      //         size: "12px",
      //         outline: { color: "white", width: 2 },
      //       });

      //       return new Graphic({
      //         geometry: point,
      //         symbol: symbol,
      //         attributes: event,
      //         popupTemplate: {
      //           title: "🚨 {title}",
      //           content: `
      //             <div style="padding: 10px;">
      //               <p><strong>事件類型:</strong> {type}</p>
      //               <p><strong>描述:</strong> {description}</p>
      //               <p><strong>開始時間:</strong> {startTime}</p>
      //             </div>
      //           `,
      //         },
      //       });
      //     });

      //   trafficLayer?.addMany(trafficGraphics);
      // }

      // 添加停車場
      // if (selectedLayers.parking && parkingLots.length > 0) {
      //   const parkingGraphics = parkingLots
      //     .filter((lot) => lot.location && lot.location.lat && lot.location.lng)
      //     .map((lot) => {
      //       const point = new Point({
      //         longitude: lot.location.lng,
      //         latitude: lot.location.lat,
      //       });

      //       const symbol = new SimpleMarkerSymbol({
      //         style: "square",
      //         color: [33, 150, 243, 0.8],
      //         size: "16px",
      //         outline: { color: "white", width: 2 },
      //       });

      //       return new Graphic({
      //         geometry: point,
      //         symbol: symbol,
      //         attributes: lot,
      //         popupTemplate: {
      //           title: "🅿️ {name}",
      //           content: `
      //             <div style="padding: 10px;">
      //               <p><strong>總車位:</strong> {totalSpaces}</p>
      //               <p><strong>剩餘車位:</strong> {availableSpaces}</p>
      //             </div>
      //           `,
      //         },
      //       });
      //     });

      //   parkingLayer.addMany(parkingGraphics);
      // }
    } catch (error) {
      console.error("更新地圖圖層失敗:", error);
    }
  };

  return (
    <Box
      ref={mapDiv}
      sx={{
        height: "550px",
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
