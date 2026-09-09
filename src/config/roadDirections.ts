export enum RoadDirection {
  North = 'N',
  Northeast = 'NE',
  East = 'E',
  Southeast = 'SE',
  South = 'S',
  Southwest = 'SW',
  West = 'W',
  Northwest = 'NW',
}

const roadDirectionLabels: Record<RoadDirection, string> = {
  [RoadDirection.North]: '北向',
  [RoadDirection.Northeast]: '東北向',
  [RoadDirection.East]: '東向',
  [RoadDirection.Southeast]: '東南向',
  [RoadDirection.South]: '南向',
  [RoadDirection.Southwest]: '西南向',
  [RoadDirection.West]: '西向',
  [RoadDirection.Northwest]: '西北向',
};

const roadDirectionAngles: Record<RoadDirection, number> = {
  [RoadDirection.North]: 0,
  [RoadDirection.Northeast]: 45,
  [RoadDirection.East]: 90,
  [RoadDirection.Southeast]: 135,
  [RoadDirection.South]: 180,
  [RoadDirection.Southwest]: 225,
  [RoadDirection.West]: 270,
  [RoadDirection.Northwest]: 315,
};

/** 將 TDX 方位代碼轉成中文，CCTV、即時路況等欄位共用。 */
export function getRoadDirectionLabel(direction: string) {
  return roadDirectionLabels[direction as RoadDirection] ?? '未提供';
}

/** 取得方位圖示對應的順時針旋轉角度。 */
export function getRoadDirectionAngle(direction: string) {
  return roadDirectionAngles[direction as RoadDirection] ?? null;
}
