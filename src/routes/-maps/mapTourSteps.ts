export type MapTourStep = {
  id: string;
  /** 要打聚光燈的目標元素 id，元素當下不存在（例如手機版收合掉了）就自動跳過這一步。 */
  targetId: string;
  title: string;
  description: string;
};

/** 地圖導覽的步驟腳本：只挑幾個第一次使用不容易發現的重點，不是每顆按鈕都教一遍。 */
export const mapTourSteps: MapTourStep[] = [
  {
    id: 'search',
    targetId: 'map-tour-search',
    title: '搜尋地點',
    description: '輸入地址、道路或地標，快速跳到想去的地方。',
  },
  {
    id: 'county',
    targetId: 'map-tour-county',
    title: '選擇縣市',
    description: '先選好縣市（可再選鄉鎮），路況資料才會開始查詢與顯示。',
  },
  {
    id: 'layers',
    targetId: 'header-layer-controls',
    title: '切換圖層與設定',
    description:
      '開關道路事件、CCTV、公車、YouBike 等資料圖層，或在「設定」裡一鍵重置所有狀態。',
  },
  {
    id: 'routePlanner',
    targetId: 'map-tour-route-planner',
    title: '規劃路線',
    description: '輸入起點與終點，自動幫你分析沿途可能的事故與施工。',
  },
  {
    id: 'aiChat',
    targetId: 'map-tour-ai-chat',
    title: 'AI 路線助理',
    description: '用講的也可以——直接跟 AI 說你的需求，它會幫你操作地圖。',
  },
];
