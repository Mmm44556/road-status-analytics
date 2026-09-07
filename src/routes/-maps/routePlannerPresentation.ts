/** 將公尺轉成適合路線摘要的距離文字。 */
export function formatRouteDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} 公尺`;
  return `${(distanceMeters / 1000).toFixed(1)} 公里`;
}

/** 將秒數轉成向上取整的預估行車時間。 */
export function formatRouteDuration(durationSeconds: number): string {
  const totalMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  if (totalMinutes < 60) return `約 ${totalMinutes} 分鐘`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `約 ${hours} 小時`;
  return `約 ${hours} 小時 ${minutes} 分鐘`;
}
