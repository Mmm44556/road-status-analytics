# Redesign Tasks

Status: implementation complete; see `tasks/plan.md` for verified checkpoints.

## Task 1: 建立設計系統與響應式應用殼層

**Description:** 重新定義品牌色、字體、表面、圓角與全域元件樣式，將現有導覽改為桌面頂部導覽及手機底部導覽。

**Acceptance criteria:**
- [ ] 全站使用一致的海軍藍／霧白／交通青綠 token。
- [ ] 手機顯示底部導覽，桌面顯示頂部導覽。
- [ ] 每個頁面只有一個主要內容捲動區，無雙重 scrollbar。

**Verification:**
- [ ] `npx eslint src/config/theme.ts src/index.css src/routes/__root.tsx src/routes/-root/NavBar.tsx`
- [ ] 手動檢查 320px 與 1440px 導覽。

**Dependencies:** None

**Files likely touched:**
- `src/config/theme.ts`
- `src/index.css`
- `src/routes/__root.tsx`
- `src/routes/-root/NavBar.tsx`
- `src/routes/-root/Navigation.tsx`

**Estimated scope:** Medium

## Task 2: 重構 ArcGIS 地圖呈現與署名

**Description:** 將地圖變成可嵌入不同頁面的響應式視覺核心，保留 ArcGIS 與國土測繪中心署名，加入載入視覺與適合公開產品的控制外觀。

**Acceptance criteria:**
- [ ] 地圖高度可由頁面控制，手機與桌面不溢出。
- [ ] `Powered by Esri` 和底圖來源在地圖可視範圍內。
- [ ] 地圖初始化失敗時顯示可理解的錯誤狀態。

**Verification:**
- [ ] focused ESLint 通過。
- [ ] 瀏覽器確認地圖、zoom 控制與署名可見。

**Dependencies:** Task 1

**Files likely touched:**
- `src/service/TrafficMapPreview.tsx`
- `src/routes/-overview/-components/MapSearchOverlay.tsx`
- `src/routes/-overview/-components/MapAttribution.tsx`

**Estimated scope:** Medium

## Task 3: 建立地圖優先首頁

**Description:** 將 Overview 改造成一般使用者的第一入口，以所在地／縣市搜尋、大地圖、路況摘要與近期事件為主要內容。

**Acceptance criteria:**
- [ ] 首屏可看到頁面標題、搜尋／定位、地圖與路況狀態摘要。
- [ ] 桌面右側面板與手機下方內容呈現相同資料。
- [ ] 現有事故 API 圖表保留於首頁的次要洞察區。

**Verification:**
- [ ] `npm test`
- [ ] focused ESLint 通過。
- [ ] `/` 在 320px、768px、1440px 無水平捲動。

**Dependencies:** Tasks 1–2

**Files likely touched:**
- `src/routes/-overview/Overview.tsx`
- `src/routes/-overview/-components/TrafficSummary.tsx`
- `src/routes/-overview/-components/RoadEventList.tsx`
- `src/routes/-overview/-components/AccidentRank.tsx`
- `src/routes/-overview/-components/AccidentDonutPie.tsx`

**Estimated scope:** Medium

## Task 4: 完成全螢幕地圖探索頁

**Description:** 以共用地圖元件取代 Maps placeholder，提供清楚的頁面標題、圖層說明與事件瀏覽入口。

**Acceptance criteria:**
- [ ] `/maps` 顯示可互動地圖而非施工中畫面。
- [ ] 地圖控制與圖例在手機不遮擋主要內容。
- [ ] 從首頁可清楚前往完整地圖。

**Verification:**
- [ ] focused ESLint 通過。
- [ ] 瀏覽器驗證 `/maps` 桌面與手機版。

**Dependencies:** Tasks 1–3

**Files likely touched:**
- `src/routes/maps/route.tsx`
- `src/routes/-overview/-components/MapLegend.tsx`
- `src/data/navigationItems.ts`

**Estimated scope:** Small

## Task 5: 建立資料分析頁

**Description:** 以既有事故 summary API 建立有實際資料的分析頁，提供資料期間、KPI、城市排行與事故類型分布。

**Acceptance criteria:**
- [ ] `/analytics` 不再顯示施工中畫面。
- [ ] 顯示 API 最新資料期間，避免把歷史快取誤稱為即時資料。
- [ ] 圖表在手機改為單欄且標籤不被截斷。

**Verification:**
- [ ] `npm test`
- [ ] focused ESLint 通過。
- [ ] 瀏覽器驗證分析頁載入、錯誤與圖表狀態。

**Dependencies:** Tasks 1 and 3

**Files likely touched:**
- `src/routes/analytics/route.tsx`
- `src/routes/-overview/-components/AccidentRank.tsx`
- `src/routes/-overview/-components/AccidentDonutPie.tsx`
- `src/routes/-overview/-components/AnalyticsCard.tsx`

**Estimated scope:** Medium

## Task 6: 響應式、無障礙與瀏覽器驗證

**Description:** 在真實瀏覽器檢查所有主要路由，修正可見的版面、console、network 與 accessibility 問題，完成提交前審查。

**Acceptance criteria:**
- [ ] 主要互動具可存取名稱與清楚焦點。
- [ ] 320px、768px、1440px 版面符合規格。
- [ ] API network 回應符合預期且無新增 console error。

**Verification:**
- [ ] `npm test`
- [ ] 本次修改檔案 ESLint 通過。
- [ ] Chrome DevTools 截圖、console、network 與 accessibility tree 檢查完成。

**Dependencies:** Tasks 1–5

**Files likely touched:** 最多 5 個由驗證結果指定的檔案。

**Estimated scope:** Medium
