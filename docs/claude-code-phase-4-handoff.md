# Claude Code 交接文件：行政區條件接入交通圖層

## 任務目標

完成 GIS 行政區選擇流程的第四階段：使用者完成縣市／鄉鎮條件前不查詢交通 API；完成後依縣市查詢 TDX 資料，若指定鄉鎮則在前端做精確空間篩選。

請直接在現有架構上增量修改，不要重寫地圖、Popup、cluster 或 Snackbar 系統，也不要清除目前未提交的變更。

## 目前完成狀態

- 臺灣外灰色遮罩與獨立開關已完成。
- 22 縣市 geometry、label、hover、click、View fit 已完成。
- 368 鄉鎮 geometry 已放在 `src/data/township/`。
- 鄉鎮資料依縣市動態 import，不會一次載入全部 JSON。
- 鄉鎮選取、跳過、重選與 View fit 已完成。
- `TrafficMapPage` 已擁有：
  - `selectedCounty`
  - `selectedTownship`
  - `isTownshipSelectionComplete`
- 所有交通圖層目前預設關閉。
- 交通 API 仍由 `TrafficMapPreview` 傳入的 `city` 查詢；頁面目前仍寫死 `city="高雄市"`。

## 重要檔案

| 用途 | 檔案 |
| --- | --- |
| 頁面篩選狀態 | `src/routes/-maps/TrafficMapPage.tsx` |
| 行政區狀態卡 | `src/routes/-maps/CountySelectionControl.tsx` |
| 圖層按鈕 | `src/routes/-maps/LayerPanel.tsx` |
| 地圖資料組合 | `src/service/TrafficMapPreview.tsx` |
| OpenLayers 生命週期與互動 | `src/service/map/useTrafficMap.ts` |
| 縣市資料 | `src/service/map/features/countyBoundaries.ts` |
| 鄉鎮資料 | `src/service/map/features/townshipBoundaries.ts` |
| 各交通圖層 hooks | `src/service/map/layers/` |
| 各 API React Query hooks | `src/service/*Api.ts` |
| 圖層 catalog | `src/data/trafficLayerCatalog.ts` |
| 既有規格 | `docs/county-selection-mask-spec.mdx` |
| 既有計畫 | `tasks/plan.md`、`tasks/todo.md` |

## 已確認的產品行為

### 尚未選縣市

- 不發送任何交通圖層 API request。
- 所有交通圖層按鈕停用。
- 行政區遮罩按鈕仍可操作。
- 不顯示交通圖層 loading／error Snackbar。

### 已選縣市、正在選鄉鎮

- 交通圖層按鈕仍停用，等待使用者選鄉鎮或按「跳過」。
- 不發送交通 API request。

### 已選鄉鎮

- 交通圖層按鈕恢復操作。
- API 使用 `selectedCounty.name` 作為 `city`。
- API 回傳縣市資料後，以 `selectedTownship.geometry` 做前端空間篩選。

### 跳過鄉鎮

- 交通圖層按鈕恢復操作。
- API 使用 `selectedCounty.name`，不做鄉鎮空間篩選。

### 重新選擇

- 立即停用 query，讓 React Query 的 `AbortSignal` 取消進行中的 request。
- 清除所有交通 VectorSource、cluster、Popup 與選取狀態。
- 保留使用者原本開啟的圖層偏好；完成下一個行政區條件後再以新縣市重新查詢。

## 建議資料契約

目前 `TownshipSelection` 只有 `id`、`name`、`countyId`。請加入 GeoJSON geometry，避免各圖層重新動態載入同一份鄉鎮檔案：

```ts
export type TownshipSelection = Pick<
  TownshipBoundary,
  'id' | 'name' | 'countyId' | 'geometry'
>;
```

在 `useTrafficMap` 點選鄉鎮時，將該 `TownshipBoundary.geometry` 一併回傳給 `TrafficMapPage`。

## 實作順序

### 1. 建立統一的查詢門檻

在 `TrafficMapPage.tsx` 建立語意清楚的衍生狀態：

```ts
const isAreaSelectionComplete = Boolean(
  selectedCounty && isTownshipSelectionComplete,
);
const queryCity = isAreaSelectionComplete ? selectedCounty?.name ?? null : null;
```

- 將 `queryCity`、`selectedTownship` 傳入 `TrafficMapPreview`。
- 移除 `city="高雄市"`。
- 不要使用虛構的預設縣市。

### 2. 停用交通圖層按鈕

為 `LayerPanel` 增加 `trafficLayersDisabled: boolean`。

- 未完成行政區條件時，交通圖層 `IconButton` 應 disabled。
- 行政區遮罩按鈕不可一起 disabled。
- Tooltip／aria-label 要說明「請先完成行政區選擇」。
- `toggleLayer` 也要在 handler 層防守，不能只靠 UI disabled。

### 3. 統一所有 layer hook 的 query enabled

將各 layer hook 的 `city` 改為 `string | null`，並建立：

```ts
const queryEnabled = Boolean(city) && visible;
```

受影響 hooks：

- `useRoadEventLayer`
- `useCctvLayer`
- `useLiveTrafficLayer`
- `useVdLayer`
- `useBikeLayer`
- `useMetroLayer`
- `useParkingLotLayer`
- `useParkingSegmentLayer`

所有 API query 必須同時收到正確 city 與 `queryEnabled`。

特別注意：`useRoadEvents(city)` 目前沒有 `enabled` 參數。請仿照其他 API 建立 `createRoadEventQueryOptions(city, enabled)`，並改成 `useRoadEvents(city, enabled)`。

不要以 `isPending` 直接表示 loading。TanStack Query 在 disabled 且沒有資料時仍可能是 pending。建議使用：

```ts
isLoading: queryEnabled && query.isFetching
```

確保未選行政區時不會顯示 loading Snackbar。

### 4. 建立鄉鎮空間篩選純函式

新增例如：

`src/service/map/features/administrativeSpatialFilter.ts`

建議 API：

```ts
type CoordinatePoint = { longitude: number; latitude: number };

export function isPointInsideTownship(
  point: CoordinatePoint,
  township: TownshipSelection,
): boolean;

export function doesLineIntersectTownship(
  coordinates: [number, number][],
  township: TownshipSelection,
): boolean;
```

需求：

- 支援 Polygon 與 MultiPolygon。
- 點資料必須做 point-in-polygon。
- 即時路況 LineString 必須做實際 geometry intersection，不能只比較 bounding box。
- 可採用小型 Turf 模組：`@turf/boolean-point-in-polygon`、`@turf/boolean-intersects`、`@turf/helpers`；不要安裝整包 `@turf/turf`。
- 保持純函式並先寫 Vitest。

### 5. 在資料轉成 OpenLayers feature 前篩選

點圖層：

- 道路事件
- CCTV
- VD
- YouBike
- 捷運／輕軌
- 戶外停車場
- 路邊停車格

以 longitude／latitude 判斷是否落在鄉鎮 geometry 內。

線圖層：

- 即時路況

以 `segment.coordinates` 判斷是否與鄉鎮 geometry 相交。

篩選應發生在：

- 寫入 VectorSource 前。
- 回傳 `points`／`segments` 給 Popup、數量或刷新邏輯前。

建議每個 layer hook 接收同一個 `selectedTownship: TownshipSelection | null`，並使用 `useMemo` 計算過濾結果。不要在每個 feature render 時重做 GeoJSON 解析。

### 6. 切換行政區時清除舊狀態

- `city` 變成 `null` 時，各 VectorSource 必須立即清空。
- query key 必須包含 city；現有 API 多數已符合。
- query function 必須傳遞 TanStack Query 提供的 `signal`；現有 API 多數已符合，逐一確認。
- `useTrafficMap` 或 `TrafficMapPreview` 增加行政區 selection key effect，切換時關閉 Popup：

```ts
const areaSelectionKey = `${selectedCounty?.id ?? ''}:${selectedTownship?.id ?? ''}`;
```

- 不可讓上一縣市資料在新縣市載入期間殘留。
- CCTV image URL 與單點 reload hooks 必須使用新 city。

### 7. 更新 Snackbar 狀態

- query disabled 時不得產生 loading 或 error status。
- 切換縣市取消 request 不應顯示 error Snackbar。
- 每個圖層仍維持獨立 stacked Snackbar 與統一色彩系統。

### 8. 修正既有 catalog 測試

目前 `src/data/trafficLayerCatalog.ts` 的所有圖層都是 `defaultVisible: false`，這是目前 UI 行為。

`src/__tests__/data/trafficLayerCatalog.test.ts` 仍期待道路事件預設開啟，導致完整測試 1 項失敗。請更新測試為所有圖層預設關閉，不要把 production catalog 改回 `true`。

## 測試要求

至少新增或更新以下測試：

1. 未選縣市時，每個 query option 的 `enabled` 都是 `false`。
2. 選縣市但仍在選鄉鎮時，不查 API。
3. 跳過鄉鎮後，query 使用正確縣市名稱。
4. 切換縣市後 query key 更新。
5. Polygon 與 MultiPolygon 的 point-in-polygon。
6. 鄉鎮外點位被排除、邊界內點位被保留。
7. 穿越鄉鎮邊界的路況線被保留，僅 bbox 重疊但 geometry 不相交的線被排除。
8. query disabled 時 layer loading／error 都是 false。
9. `LayerPanel` disabled 狀態不影響行政區遮罩按鈕。
10. 行政區切換時 Popup 與 VectorSource 清除。

完成後執行：

```bash
npm test -- --run
npm run lint
npm run build
```

## 人工驗收

由使用者測試視覺，Claude Code 專注代碼層驗證。請交付時提醒使用者檢查：

1. 進站後 Network 沒有交通 API request。
2. 選縣市後、尚未選鄉鎮或跳過前仍沒有 request。
3. 完成條件後，只有已開啟圖層發出該縣市 request。
4. 選鄉鎮後只顯示該鄉鎮範圍內資料。
5. 跳過後顯示整個縣市資料。
6. 重新選擇時舊點位、線段與 Popup 立即消失。
7. 快速切換縣市不會短暫顯示上一縣市資料。

## 程式規範

- 方法補簡短 JSDoc，註解說明原因，不重述程式碼。
- 不使用表情符號。
- 三元運算子超過兩層時改用 `if`、對照表或小函式。
- 保留 controller／service／feature utility 的分層架構。
- 使用 `apply_patch` 修改檔案，保留工作目錄既有變更。
- 不為完成任務而重構無關模組。

## 完成定義

- 選取行政區前零交通 API request。
- 完成條件後只查詢選定縣市與已開啟圖層。
- 指定鄉鎮時，點與線都經過精確空間篩選。
- 切換行政區不殘留舊資料或 Popup。
- 完整 test、lint、build 通過。
- 文件中的人工驗收項目已交由使用者測試。
