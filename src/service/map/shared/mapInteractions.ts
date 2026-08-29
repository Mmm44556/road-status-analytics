/** 依圖徵是否可互動決定地圖游標。 */
export function getMapFeatureCursor(hasInteractiveFeature: boolean) {
  return hasInteractiveFeature ? 'pointer' : '';
}
