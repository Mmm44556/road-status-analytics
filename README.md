# 智慧交通管理系統（純前端架構）

## 架構總覽

```
├── React 應用
│   ├── 核心組件
│   │   ├── 共用組件（Header, SideNav, Footer等）
│   │   ├── ArcGIS 地圖容器
│   │   ├── 數據控制面板
│   │   ├── 分析工具面板
│   │   └── 儀表板組件
│   ├── 資料管理
│   │   ├── API服務層（直接對接開放資料API）
│   │   ├── 本地數據緩存（LocalStorage/IndexedDB）
│   │   ├── 狀態管理（Redux/Context API）
│   │   └── 數據轉換器（將API資料轉為可視化格式）
│   └── 視覺化引擎
│       ├── ArcGIS 地圖與圖層管理
│       ├── 空間分析客戶端工具
│       └── 統計圖表生成器
└── 直接使用的外部服務
    ├── 交通部 TDX API（無需代理）
    ├── 高速公路局開放資料 API
    ├── 政府資料開放平台 API
    ├── ArcGIS Online 服務
    └── 其他開放 API（氣象、人口統計等）
```

---

## 主要資料來源

資料來源說明:
[https://tdx.transportdata.tw/data-standard/description]

- 公路局: [https://thbapp.thb.gov.tw/opendata/](https://thbapp.thb.gov.tw/opendata/)
- 說明: [https://motclink.gitbook.io/link/xi-tong-xiang-guan-wen-jian/api2](https://motclink.gitbook.io/link/xi-tong-xiang-guan-wen-jian/api2)
- API:

  - 路段編碼: [Swagger](https://tdx.transportdata.tw/api-service/swagger/basic/e2718568-e098-4714-ac7d-7fa7d551e613#/Link/Link_GetLinkID)
  - 路段座標: [資料服務](https://tdx.transportdata.tw/data-service/basic)
  - 即時路況: [Swagger](https://tdx.transportdata.tw/api-service/swagger/basic/7f07d940-91a4-495d-9465-1c9df89d709c#/), [data.gov.tw](https://data.gov.tw/dataset/161170)

- 警廣即時路況: [https://data.gov.tw/dataset/15221]

  - 省道交控路側設備資料: [data.gov.tw](https://data.gov.tw/dataset/29817)

- 資料標準規範: [https://tdx.transportdata.tw/data-standard/description]

- 交通部高速公路局交通資料庫: [https://tisvcloud.freeway.gov.tw/]

- 歷年重大交通事故地點資料: [https://data.gov.tw/dataset/6132]

- 即時性預告性資料書名: [https://drive.google.com/file/d/15rtxtf6-QC_K1plxEGuVq5SSDECCtje8/view]
---

## 頁面內容規劃

### 1. Maps 頁面（已確定）

- ArcGIS 地圖顯示
- 交通流量視覺化
- 互動式地圖控制

---

### 2. Dashboard 頁面（重新定位）

Dashboard 應專注於即時概覽和關鍵指標，具有以下特點：

#### 核心內容

- **關鍵指標卡片 (KPI Cards)**

  - 全市平均車速
  - 當前擁堵道路總長度
  - 交通事故即時計數
  - 公共交通運行狀態

- **即時狀態儀表盤**

  - 主要幹道擁堵指數儀表盤（ECharts Gauge 圖表）
  - 交通系統運作健康度評分

- **概覽圖表**

  - 24小時流量趨勢小型折線圖
  - 交通模式分布環形圖
  - 今日與昨日/上週同期對比柱狀圖

- **警報和通知區域**

  - 異常交通事件提醒
  - 臨時道路封閉資訊
  - 天氣對交通的影響預警

- **小型區域地圖預覽**
  - 顯示當前最擁堵的前5個熱點區域
  - 點擊可跳轉到 Maps 頁面對應位置

#### 設計風格

- 一屏可見，無需捲動
- 重視視覺衝擊力，使用明確的色彩編碼
- 即時更新（每1-5分鐘刷新一次）
- 著重於「現在正在發生什麼」

---

### 3. Analytics 頁面（深度分析）

Analytics 應專注於深度分析、模式挖掘和趨勢識別：

#### 核心內容

- **時間模式分析**

  - 按天/週/月/季節的交通流量變化高級折線圖
  - 高峰時段分析熱力日歷圖
  - 節假日與工作日交通模式對比

- **空間分布分析**

  - 各區域交通流量/速度分布雷達圖
  - 道路擁堵頻率排名水平柱狀圖
  - 交通事故熱點散點圖

- **關聯性分析**

  - 車流量與車速關係散點圖
  - 天氣條件與交通狀況相關性分析
  - 公共事件（展覽、演唱會等）對交通的影響

- **預測模型結果**

  - 未來24小時擁堵預測
  - 長期交通趨勢預測
  - 「如果-那麼」情境模擬結果

- **效能評估報表**
  - 交通管理措施效果評估
  - 擁堵收費區域影響分析
  - 公共交通改善指標追蹤

#### 設計風格

- 允許深度探索，可以捲動和互動
- 提供強大的篩選和切片能力
- 著重詳細說明和數據洞察
- 重視「為什麼會這樣」和「接下來會如何」

---

## 頁面間的整合與導航

- **Dashboard → Maps**：當用戶看到某個異常指標或熱點，可點擊直接跳轉到地圖對應位置查看詳情
- **Maps → Analytics**：在地圖上選擇特定道路或區域後，可點擊「分析」按鈕，跳轉到 Analytics 頁面查看該區域的深度分析
- **Analytics → Dashboard**：分析頁面可設置「添加到儀表板」功能，讓用戶將重要指標添加到自己的 Dashboard 中監控

---

## 具體 ECharts 圖表分配

### Dashboard 頁面適合的圖表

- 儀表盤 (Gauge)：顯示即時擁堵指數
- 迷你折線圖 (Mini Line Chart)：24小時趨勢概覽
- 環形圖 (Doughnut Chart)：交通工具分布
- 簡易柱狀圖 (Simple Bar)：關鍵指標對比
- 迷你熱力圖 (Mini Heatmap)：時段擁堵分布

### Analytics 頁面適合的圖表

- 多系列折線圖 (Multi-series Line)：長期趨勢分析
- 散點圖 (Scatter)：相關性分析
- 箱線圖 (Boxplot)：統計分布
- 雷達圖 (Radar)：多維度評估
- 漏斗圖 (Funnel)：階段分析
- 桑基圖 (Sankey)：流量去向分析
- 日歷熱力圖 (Calendar)：年度模式
- 樹狀圖 (Treemap)：層次結構數據
- 旭日圖 (Sunburst)：多層分類數據

---

# road-status-analytics
