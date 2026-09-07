import {
  trafficLayerCatalog,
  type TrafficLayerId,
} from '@/data/trafficLayerCatalog';
import type { SvgIconComponent } from '@mui/icons-material';

export type LayerErrorStates = Partial<Record<TrafficLayerId, boolean>>;

export type LayerStatus = {
  id: TrafficLayerId;
  type: 'loading' | 'error';
  message: string;
  color: string;
  icon: SvgIconComponent;
};

export const LAYER_LOADING_DELAY_MS = 300;
export const LAYER_LOADING_MIN_VISIBLE_MS = 600;

/** 計算 loading 已顯示後仍需保留的時間，避免短暫閃爍。 */
export function getRemainingLoadingVisibility(startedAt: number, now: number) {
  return Math.max(LAYER_LOADING_MIN_VISIBLE_MS - (now - startedAt), 0);
}

/** 依 catalog 順序建立各圖層獨立的讀取狀態。 */
export function getLayerStatuses(
  errors: LayerErrorStates,
  loading: LayerErrorStates,
): LayerStatus[] {
  return trafficLayerCatalog.flatMap<LayerStatus>((layer) => {
    if (errors[layer.id]) {
      return [{
        id: layer.id,
        type: 'error' as const,
        message: `${layer.label}讀取失敗，請稍後再試。`,
        color: layer.color,
        icon: layer.icon,
      }];
    }
    if (loading[layer.id]) {
      return [{
        id: layer.id,
        type: 'loading' as const,
        message: `${layer.label}讀取中…`,
        color: layer.color,
        icon: layer.icon,
      }];
    }
    return [];
  });
}
