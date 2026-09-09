import { trafficLayerCatalog, type TrafficLayerId } from '@/data/trafficLayerCatalog';
import { basemapCatalog, type BasemapId } from '@/data/basemapCatalog';
import {
  getCountyBoundaries,
  type CountySelection,
} from '@/service/map/features/countyBoundaries';
import {
  getTownshipBoundaries,
  type TownshipSelection,
} from '@/service/map/features/townshipBoundaries';
import { searchPlaces, type PlaceSearchResult } from '@/service/placeSearchApi';
import { calculateRoute, type RouteCoordinate, type RouteResult } from '@/service/routeApi';
import type { AiActionResult, AiMapAction } from '@/service/aiChatApi';
import { formatRouteDistance, formatRouteDuration } from './routePlannerPresentation';
import type { MapQueryMode } from './mapQueryMode';

export type AiMapActionDeps = {
  visibleLayers: Set<TrafficLayerId>;
  queryMode: MapQueryMode;
  route: RouteResult | null;
  canToggleLayer: (layerId: TrafficLayerId) => boolean;
  toggleLayer: (layerId: TrafficLayerId) => void;
  selectSearchResult: (result: PlaceSearchResult) => void;
  handleRouteChange: (route: RouteResult | null) => void;
  setIsRoutePlannerOpen: (open: boolean) => void;
  getUserLocation: () => Promise<RouteCoordinate>;
  selectCounty: (county: CountySelection) => void;
  selectTownship: (township: TownshipSelection) => void;
  setIsTownshipSelectionComplete: (complete: boolean) => void;
  reselectCounty: () => void;
  setBasemapId: (basemapId: BasemapId) => void;
};

/** 執行 AI 助理下的結構化地圖動作，並回傳結果摘要供對話接著說明。 */
export async function executeAiMapAction(
  action: AiMapAction,
  deps: AiMapActionDeps,
): Promise<AiActionResult> {
  switch (action.type) {
    case 'search_place': {
      try {
        // 不能用目前地圖選取的縣市當作搜尋偏好：AI 聊天可以問任何地方，
        // 跟地圖上正在顯示哪個縣市的交通圖層是兩回事，用它當偏好只會在問到
        // 別的縣市時把查詢字串弄擰（例如疊加成「臺中市正修科技大學」）。
        const results = await searchPlaces(action.query, null);
        if (results.length === 0) {
          return {
            type: action.type,
            success: false,
            summary: `找不到「${action.query}」這個地點`,
          };
        }
        deps.selectSearchResult(results[0]);
        return {
          type: action.type,
          success: true,
          summary: `已在地圖上找到並移動到「${results[0].name}」`,
        };
      } catch {
        return {
          type: action.type,
          success: false,
          summary: '地點搜尋服務暫時無法使用',
        };
      }
    }
    case 'plan_route': {
      try {
        // 同樣不用目前選取的縣市當偏好，理由同 search_place。
        const isCurrentLocationOrigin = action.origin === '我的位置';
        const resolveOrigin = async (): Promise<
          { name: string; longitude: number; latitude: number } | null
        > => {
          if (isCurrentLocationOrigin) {
            try {
              const coordinate = await deps.getUserLocation();
              return { name: '我的位置', ...coordinate };
            } catch {
              return null;
            }
          }
          const results = await searchPlaces(action.origin, null);
          return results[0] ?? null;
        };

        const [origin, destinationResults, ...stopoverResultsList] =
          await Promise.all([
            resolveOrigin(),
            searchPlaces(action.destination, null),
            ...action.stopovers.map((query) => searchPlaces(query, null)),
          ]);
        if (!origin) {
          return {
            type: action.type,
            success: false,
            summary: isCurrentLocationOrigin
              ? '無法取得目前位置，請檢查瀏覽器定位權限，或直接告訴我起點地名'
              : `找不到起點「${action.origin}」`,
          };
        }
        if (destinationResults.length === 0) {
          return {
            type: action.type,
            success: false,
            summary: `找不到終點「${action.destination}」`,
          };
        }
        const missingStopoverIndex = stopoverResultsList.findIndex(
          (results) => results.length === 0,
        );
        if (missingStopoverIndex !== -1) {
          return {
            type: action.type,
            success: false,
            summary: `找不到途經點「${action.stopovers[missingStopoverIndex]}」`,
          };
        }
        const waypoints: RouteCoordinate[] = [
          origin,
          ...stopoverResultsList.map((results) => results[0]),
          destinationResults[0],
        ].map((place) => ({
          longitude: place.longitude,
          latitude: place.latitude,
        }));
        const nextRoute = await calculateRoute(waypoints, action.travelMode);
        deps.handleRouteChange(nextRoute);
        deps.setIsRoutePlannerOpen(true);
        return {
          type: action.type,
          success: true,
          summary: `已規劃從「${origin.name}」到「${destinationResults[0].name}」的路線，距離約 ${formatRouteDistance(nextRoute.distanceMeters)}，預估${formatRouteDuration(nextRoute.durationSeconds)}`,
        };
      } catch {
        return { type: action.type, success: false, summary: '路線規劃失敗' };
      }
    }
    case 'toggle_layer': {
      const layer = trafficLayerCatalog.find((item) => item.id === action.layerId);
      if (!layer) {
        return {
          type: action.type,
          success: false,
          summary: `不支援的圖層代號：${action.layerId}`,
        };
      }
      if (!deps.canToggleLayer(action.layerId)) {
        return {
          type: action.type,
          success: false,
          summary: `目前無法切換「${layer.label}」，可能尚未完成縣市或鄉鎮選擇`,
        };
      }
      if (deps.visibleLayers.has(action.layerId) !== action.visible) {
        deps.toggleLayer(action.layerId);
      }
      return {
        type: action.type,
        success: true,
        summary: `已${action.visible ? '開啟' : '關閉'}「${layer.label}」`,
      };
    }
    case 'select_area': {
      if (deps.queryMode !== 'area') {
        return {
          type: action.type,
          success: false,
          summary: '目前是路線規劃模式，請先清除路線再選擇縣市',
        };
      }
      const county = getCountyBoundaries().find(
        (item) => item.name === action.countyName,
      );
      if (!county) {
        return {
          type: action.type,
          success: false,
          summary: `找不到縣市「${action.countyName}」`,
        };
      }
      deps.selectCounty({ id: county.id, name: county.name });
      if (!action.townshipName) {
        // 沒有指定鄉鎮視為要查詢整個縣市，直接完成鄉鎮條件（等同 UI 上按「跳過」）。
        deps.setIsTownshipSelectionComplete(true);
        return {
          type: action.type,
          success: true,
          summary: `已選擇「${county.name}」（整個縣市）`,
        };
      }
      const townships = await getTownshipBoundaries(county.id);
      const township = townships.find((item) => item.name === action.townshipName);
      if (!township) {
        deps.setIsTownshipSelectionComplete(true);
        return {
          type: action.type,
          success: true,
          summary: `已選擇「${county.name}」，但找不到鄉鎮「${action.townshipName}」，改為查詢整個縣市`,
        };
      }
      deps.selectTownship(township);
      return {
        type: action.type,
        success: true,
        summary: `已選擇「${county.name}${township.name}」`,
      };
    }
    case 'clear_route': {
      if (!deps.route) {
        return {
          type: action.type,
          success: true,
          summary: '目前沒有已規劃的路線',
        };
      }
      deps.handleRouteChange(null);
      return { type: action.type, success: true, summary: '已清除路線' };
    }
    case 'locate_me': {
      try {
        await deps.getUserLocation();
        return {
          type: action.type,
          success: true,
          summary: '已定位到使用者目前位置',
        };
      } catch {
        return {
          type: action.type,
          success: false,
          summary: '無法取得目前位置，可能是瀏覽器定位權限被拒絕',
        };
      }
    }
    case 'reset_area': {
      if (deps.queryMode !== 'area') {
        return {
          type: action.type,
          success: false,
          summary: '目前是路線規劃模式，請先清除路線再重新選擇縣市',
        };
      }
      deps.reselectCounty();
      return {
        type: action.type,
        success: true,
        summary: '已回到全臺灣範圍，請重新選擇縣市',
      };
    }
    case 'change_basemap': {
      const basemap = basemapCatalog.find((item) => item.id === action.basemapId);
      if (!basemap) {
        return {
          type: action.type,
          success: false,
          summary: `不支援的底圖代號：${action.basemapId}`,
        };
      }
      deps.setBasemapId(basemap.id);
      return {
        type: action.type,
        success: true,
        summary: `已切換為「${basemap.label}」底圖`,
      };
    }
  }
}
