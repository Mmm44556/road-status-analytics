export type BasemapId =
  | 'EMAP'
  | 'EMAP15'
  | 'EMAP5'
  | 'EMAP6'
  | 'EMAP16'
  | 'EMAP01'
  | 'EMAP8'
  | 'PHOTO2'
  | 'PHOTO_MIX'
  | 'EMAP9'
  | 'EMAP99';

export type BasemapDefinition = {
  id: BasemapId;
  label: string;
};

// 對應內政部國土測繪中心電子地圖服務（NLSC WMTS）的圖層代碼，
// 值取自 NLSC 官方地圖檢視器的底圖選單，已逐一實測 200 回應確認可用。
export const basemapCatalog: BasemapDefinition[] = [
  { id: 'EMAP', label: '臺灣通用電子地圖' },
  { id: 'EMAP15', label: '臺灣通用電子地圖(套疊等高線無門牌)' },
  { id: 'EMAP5', label: '臺灣通用電子地圖(套疊等高線+門牌)' },
  { id: 'EMAP6', label: '臺灣通用電子地圖(+門牌,不含等高線)' },
  { id: 'EMAP16', label: '臺灣通用電子地圖(不含等高線及門牌)' },
  { id: 'EMAP01', label: '臺灣通用電子地圖(灰階)' },
  { id: 'EMAP8', label: 'Taiwan e-Map' },
  { id: 'PHOTO2', label: '正射影像(航照圖)' },
  { id: 'PHOTO_MIX', label: '正射影像(航照混合)' },
  { id: 'EMAP9', label: '臺灣通用電子地圖(無鐵公路)' },
  { id: 'EMAP99', label: '臺灣通用電子地圖(向量)' },
];

export const DEFAULT_BASEMAP_ID: BasemapId = 'EMAP';
