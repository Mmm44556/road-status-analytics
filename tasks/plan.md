# Implementation Plan: 公開版台灣即時路況平台重新設計

## Overview

依據 `docs/redesign-spec.md`，將目前以卡片儀表板為主的介面，重構為手機優先、地圖優先的公開路況產品。實作保留既有 API 與 ArcGIS 能力，先建立一致的應用殼層與設計系統，再逐步交付首頁、地圖頁與分析頁，最後以真實瀏覽器完成響應式與無障礙驗證。

## Architecture Decisions

- 使用 MUI theme 作為唯一視覺 token 來源，避免元件散落任意色碼。
- 桌面與手機共用相同路由與資料，不建立第二套 mobile component tree；透過 CSS Grid、Drawer 與 responsive props 改變呈現方式。
- `TrafficMapPreview` 保持 ArcGIS 初始化責任，地圖外框、搜尋與路況面板由頁面層組合。
- API server state 維持 React Query；不把遠端資料複製進全域 Context。
- 首頁與地圖頁共用地圖視覺元件，但首頁強調摘要、地圖頁強調探索工具。
- 保留既有未提交的格式調整；涉及同檔修改時只做精準區塊變更。

## Dependency Graph

```text
Design tokens
  └─ Responsive app shell
      ├─ Map presentation and attribution
      │   ├─ Map-first overview
      │   └─ Full map route
      └─ Analytics presentation
          └─ Browser/accessibility verification
```

## Task List

### Phase 1: Foundation

- [ ] Task 1: 建立新版設計系統與響應式應用殼層
- [ ] Task 2: 重構 ArcGIS 地圖呈現與法定署名

### Checkpoint: Foundation

- [ ] 新導覽可在手機與桌面切換
- [ ] 地圖正常載入且署名可見
- [ ] 本次修改檔案通過 ESLint

### Phase 2: Core Pages

- [ ] Task 3: 建立地圖優先首頁
- [ ] Task 4: 完成全螢幕地圖探索頁
- [ ] Task 5: 建立可用的資料分析頁

### Checkpoint: Core Pages

- [ ] `/`、`/maps`、`/analytics` 均不再顯示施工中畫面
- [ ] API 失敗、載入中與無資料狀態均可理解
- [ ] 手機 320px 無水平捲動

### Phase 3: Polish and Verification

- [ ] Task 6: 完成響應式、無障礙與真實瀏覽器驗證

### Checkpoint: Complete

- [ ] Vitest 全數通過
- [ ] 本次修改檔案 ESLint 通過
- [ ] 320px、768px、1440px 實際瀏覽器畫面符合規格
- [ ] API 請求回傳預期狀態，console 無新增 error
- [ ] 變更通過多軸程式碼審查並以原子提交保存

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| ArcGIS bundle 與既有 Rollup 問題影響完整 build | High | 每個增量先跑 Vitest／focused ESLint，另以 dev server 和瀏覽器驗證；既有 build blocker 單獨記錄 |
| ArcGIS attribution 被自訂 UI 移除 | High | 明確保留 attribution UI，另在地圖 overlay 顯示底圖來源 |
| 現有路況事件仍部分使用 mock | Medium | UI 清楚顯示資料更新時間與資料來源，不宣稱尚未串接的資料為即時官方資料 |
| 手機地圖與內容競爭有限高度 | Medium | 地圖保留最小可視高度，內容改為下方摘要與可捲動事件區，不直接縮放桌面側欄 |
| 未提交來源修改與改版重疊 | Medium | 修改前檢查 diff；保留格式與空白變更，不還原、不覆蓋 |

## Open Questions

無。產品意圖與規格均已由使用者確認。
