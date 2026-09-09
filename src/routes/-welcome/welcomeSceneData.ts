import { getTaiwanOutline } from './taiwanOutlinePaths';

export type Point = [number, number];

export const FEATURES = [
  '全臺即時路況、道路事件、CCTV、公車、YouBike、捷運與停車資訊，一次看完',
  '選好縣市／鄉鎮，只顯示你在意範圍內的資料',
  'AI 路線助理：提出路線需求，直接幫你操作地圖',
  '路線規劃：加途經點，自動分析沿途可能的事故與施工',
];

/** 視覺區的模擬對話腳本：使用者提出路線需求，AI 回覆後才切換到地圖階段。 */
export const CHAT_SCRIPT = {
  user: '幫我規劃台北到台中的路線，順便避開施工路段',
  assistant: '已經避開 2 處施工路段，全程約 165 公里，路線畫在地圖上了。',
};

// 對應腳本裡的路線，用真實經緯度投影到跟縣市外框同一套座標系。
const ROUTE_STOPS = [
  { id: 'taipei', name: '台北', lonLat: [121.5654, 25.033] as Point },
  { id: 'taichung', name: '台中', lonLat: [120.6736, 24.1477] as Point },
];

// 純裝飾用，跟真實地圖無關，模組層級算一次即可，不用每次 render 重算投影。
export const { countyPaths, viewBoxSize, projectLonLat } = getTaiwanOutline();
export const routePoints = ROUTE_STOPS.map((stop) => ({
  ...stop,
  point: projectLonLat(stop.lonLat),
}));

export const routeStart = routePoints[0].point;
export const routeEnd = routePoints[1].point;

/** 路線的控制點，讓兩個地標之間畫出一道緩和的弧線，而不是死板的直線。 */
function getRouteControlPoint(from: Point, to: Point): Point {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const curveOffset = 0.18;
  return [midX - dy * curveOffset, midY + dx * curveOffset];
}

export const routeControl = getRouteControlPoint(routeStart, routeEnd);
export const routePathD = `M${routeStart[0].toFixed(2)},${routeStart[1].toFixed(2)} Q${routeControl[0].toFixed(2)},${routeControl[1].toFixed(2)} ${routeEnd[0].toFixed(2)},${routeEnd[1].toFixed(2)}`;

/** 二次貝茲曲線上 t（0~1）位置的座標，用來驅動鏡頭跟隨路線移動。 */
export function pointOnQuadraticBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  t: number,
): Point {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
  ];
}
