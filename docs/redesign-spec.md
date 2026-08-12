# Spec: 公開版台灣即時路況平台重新設計

## Objective

將現有交通儀表板重新設計為可公開使用、手機優先的台灣日常路況平台，同時保留足夠的 GIS 與資料視覺化深度作為求職作品集。

核心使用者任務：進站後快速查看自己附近或指定縣市目前的事故、施工、壅塞與天氣影響，再視需要進入歷史分析。

## Product and Visual Direction

- 首頁採「地圖優先」架構，桌面版為地圖加事件側欄，手機版為地圖加可拖曳／可展開的內容區。
- 視覺語言專業、清楚、可信任，不模仿傳統政府入口網站，也不使用過度科幻的控制中心風格。
- 色彩以深海軍藍、霧白與交通青綠為品牌基礎；紅、橙、黃只用於事故嚴重度與警示。
- 文字以繁體中文為主；必要的縮寫與資料名稱保留英文。
- 首頁資訊層級：位置與搜尋 → 即時地圖 → 路況摘要 → 事件列表 → 趨勢摘要。
- 分析頁資訊層級：時間／地區篩選 → KPI → 城市排行 → 事故類型與趨勢。

## Responsive Behavior

- 320–767px：單手操作優先；底部導覽；搜尋與定位固定在地圖上方；事件內容可展開。
- 768–1199px：地圖為主、資訊面板置於下方或右側，依可用寬度自動排列。
- 1200px 以上：固定頂部導覽；地圖佔主要視野；右側顯示即時摘要與事件列表。
- 所有互動元件需具備鍵盤焦點、可讀標籤與至少 44px 的手機觸控區。

## Tech Stack

- React 19、TypeScript、Vite 6
- MUI 7 作為元件與主題系統
- ArcGIS Maps SDK for JavaScript 作為 GIS 引擎
- TanStack Router 與 React Query
- ECharts 作為統計圖表
- FastAPI 交通資料服務

## Commands

- Development: `npm run dev -- --host 127.0.0.1`
- API: `.venv/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 --reload`
- Tests: `npm test`
- Build: `npm run build`
- Lint: `npm run lint`

## Project Structure

- `src/config/theme.ts`：全站色彩、字體、圓角與元件樣式。
- `src/routes/__root.tsx`：應用殼層與響應式頁面框架。
- `src/routes/-root/`：品牌、桌面／手機導覽與全站狀態。
- `src/routes/-overview/`：地圖優先首頁與路況摘要。
- `src/routes/analytics/`：歷史統計與資料探索。
- `src/service/`：ArcGIS 與 API 資料邊界。
- `src/**/*.test.ts(x)`：與行為檔案相鄰的 Vitest 測試。

## Code Style

```tsx
export function TrafficStatus({ severity, label }: TrafficStatusProps) {
  return (
    <Chip
      color={severity === "critical" ? "error" : "warning"}
      label={label}
      aria-label={`路況狀態：${label}`}
    />
  );
}
```

- 元件與型別使用具體領域名稱，避免 `DataCard`、`Item` 等模糊命名。
- 資料存取與呈現元件分離；遠端資料由 React Query 管理。
- 優先使用主題 token 與響應式值，避免散落的任意色碼與尺寸。
- 不新增與既有 MUI／React Query 能力重複的 UI 或狀態依賴。

## Testing Strategy

- Vitest 單元測試：資料轉換、篩選與路況嚴重度規則。
- 瀏覽器驗證：320px、768px、1440px 的版面截圖與互動檢查。
- 網路驗證：首頁 API 經 Vite proxy 回傳 200，錯誤時顯示可理解的狀態。
- Accessibility：正確 heading 層級、導覽名稱、鍵盤焦點與 Esri／國土測繪中心署名。

## Boundaries

- Always：保留真實 API、明確載入／錯誤／空資料狀態、保留地圖來源署名、測試後才提交。
- Ask first：新增付費地圖服務、新的前端依賴、改變後端資料契約、加入帳號或定位追蹤。
- Never：提交 API key、遮蔽 Esri 或國土測繪中心署名、大量快取 WMTS 圖磚、宣稱資料可用於導航或緊急決策。

## Success Criteria

- 使用者在首頁第一屏即可看到地圖、所在地／地區搜尋與目前路況摘要。
- 手機版不依賴桌面側欄，320px 寬度下無水平捲動。
- 桌面版 1440px 寬度下，地圖仍是最大且最優先的視覺區域。
- 事故、施工與壅塞不只靠顏色區分，均有文字或圖示標籤。
- 首頁與分析頁使用一致的色彩、間距、字級與卡片層級。
- 地圖可見區保留 `Powered by Esri` 與「底圖：內政部國土測繪中心」。
- 現有 API 契約測試通過；本次修改檔案通過 ESLint；瀏覽器無新增 console error。

## Out of Scope

- 導航與路線規劃。
- 會員、收藏與跨裝置同步。
- 推播通知與正式緊急通報承諾。
- 付費 ArcGIS Online 服務或需要秘密金鑰的第三方服務。

## Open Questions

無。需求訪談已確認產品定位、主要使用者、首頁優先任務與手機優先策略。
