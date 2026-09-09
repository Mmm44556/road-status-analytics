import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

/** 依圖徵是否可互動決定地圖游標。 */
export function getMapFeatureCursor(hasInteractiveFeature: boolean) {
  return hasInteractiveFeature ? 'pointer' : '';
}

/** 取得 OpenLayers cluster 包裝的原始點位。 */
export function getClusterMembers(feature: Feature | undefined) {
  return (feature?.get('features') as Feature<Point>[] | undefined) ?? [];
}

/** 多點聚合才顯示 hover 幾何範圍，單點只改變游標。 */
export function getClusterHoverFeature(feature: Feature | undefined) {
  return getClusterMembers(feature).length > 1
    ? (feature as Feature<Point>)
    : undefined;
}

/** 取得單點或聚合點的原生 title 文字，聚合僅列出前三個名稱。 */
export function getClusterTitle<T extends Feature>(
  members: T[],
  layerName: string,
  getMemberTitle: (member: T) => string,
) {
  const titles = [
    ...new Set(members.map(getMemberTitle).map((title) => title.trim())),
  ].filter(Boolean);
  if (members.length === 1) return titles[0] ?? layerName;
  if (members.length === 0) return '';

  const visibleTitles = titles.slice(0, 3);
  const remainingCount = Math.max(members.length - visibleTitles.length, 0);
  const lines = [`${layerName}（${members.length} 筆）`, ...visibleTitles];
  if (remainingCount > 0) lines.push(`另有 ${remainingCount} 筆`);
  return lines.join('\n');
}
