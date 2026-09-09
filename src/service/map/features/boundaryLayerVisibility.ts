export type BoundaryLayerVisibility = {
  outerMask: boolean;
  county: boolean;
  township: boolean;
};

/** 遮罩開關只影響顯示，不改變目前行政區選擇狀態。 */
export function getBoundaryLayerVisibility(
  isOuterMaskVisible: boolean,
  areSelectionBoundariesVisible: boolean,
  isSelectingTownship: boolean,
  selectedTownshipId: string | null,
): BoundaryLayerVisibility {
  const hasTownshipOverlay =
    isSelectingTownship || Boolean(selectedTownshipId);
  return {
    outerMask: isOuterMaskVisible,
    county: areSelectionBoundariesVisible,
    township: areSelectionBoundariesVisible && hasTownshipOverlay,
  };
}
