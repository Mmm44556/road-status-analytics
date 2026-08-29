# 路況通

以 OpenLayers 呈現 TDX 即時道路事件的單頁交通 GIS。前端只呼叫本專案 FastAPI，TDX 憑證、OAuth token 與快取皆由後端管理。

## 技術棧

- React 19、TypeScript、Vite
- OpenLayers 10
- MUI 7
- TanStack Router、TanStack Query
- FastAPI、Pydantic、requests
- TDX 道路事件 v1

## 專案結構

```text
src/
├── routes/-maps/        GIS 頁面與浮動控制元件
├── service/map/         OpenLayers controller、Feature 與底圖
├── service/trafficApi.ts
├── data/                圖層定義
└── config/              主題與語意色彩

server/
├── api/routes/          FastAPI HTTP routers／controllers
├── services/            應用邏輯與快取
├── clients/             TDX OAuth 與 HTTP
├── schemas/             Pydantic API 契約
├── core/                環境設定
└── tests/               後端單元測試
```

後端分層細節見 [docs/backend-architecture.mdx](docs/backend-architecture.mdx)。

## 環境設定

```bash
cp .env.example .env
```

在 `.env` 填入 TDX 金鑰，等號後不要加空白：

```env
TDX_CLIENT_ID=your-client-id
TDX_CLIENT_SECRET=your-client-secret
```

不要將 `.env` 或憑證提交至 Git。

## 安裝

### 前端

```bash
npm install
```

### 後端

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r server/requirements.txt
```

## 啟動

終端一：

```bash
source .venv/bin/activate
python -m uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

終端二：

```bash
npm run dev -- --host 127.0.0.1
```

前端開發伺服器會將 `/api` 代理至 `http://127.0.0.1:8000`。

## 驗證

```bash
npm test
npm run lint
npm run build
source .venv/bin/activate
python -m pytest server/tests
```

FastAPI 文件：`http://127.0.0.1:8000/docs`

健康檢查：`http://127.0.0.1:8000/health`

## 目前範圍

- 單一 GIS 首頁
- NLSC 底圖
- TDX 道路事件與 Cluster
- 地點搜尋、CCTV、VD 與 360 路口將依後續階段介接
- AI 路線助理不在目前階段

## 資料來源

- [TDX 道路事件 v1](https://tdx.transportdata.tw/api-service/swagger/basic/60abfa19-ffe3-4eef-a4b1-0539435dfca9)
- [TDX 基礎服務](https://tdx.transportdata.tw/data-service/basic)
