import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { typographyTokens } from '@/config/designTokens';
import type { ParkingSegmentMapPoint } from '@/service/map/features/parkingSegmentFeatures';
import MapPopupCard from '@/service/map/popups/MapPopupCard';
import { formatDateTime } from '@/utils/dateTime';

type ParkingSegmentPopupCardProps = {
  parkingSegment: ParkingSegmentMapPoint;
  onClose: () => void;
  onReload: () => void;
  isReloading: boolean;
  reloadFailed: boolean;
};

// TDX 服務狀態代碼：1 為正常營運，其餘（暫停使用等）都不宜顯示車位數字。
const SERVICE_STATUS_NORMAL = 1;

/** 依可用車位佔總數的比例決定顏色：比例愈低愈接近警示色。 */
function getAvailabilityColor(ratio: number): string {
  if (ratio >= 0.3) return '#16A36A';
  if (ratio >= 0.1) return '#E6B422';
  return '#D64242';
}

/** 路邊停車格 popup：此為路段層級的空位數（非單一車位感測狀態），含已滿、服務暫停的明確提示。 */
export default function ParkingSegmentPopupCard({
  parkingSegment,
  onClose,
  onReload,
  isReloading,
  reloadFailed,
}: ParkingSegmentPopupCardProps) {
  const isOutOfService =
    parkingSegment.serviceStatus != null &&
    parkingSegment.serviceStatus !== SERVICE_STATUS_NORMAL;
  const hasAvailability = parkingSegment.availableSpaces != null && !isOutOfService;
  const ratio =
    hasAvailability && parkingSegment.totalSpaces
      ? parkingSegment.availableSpaces! / parkingSegment.totalSpaces
      : null;
  const isFull = hasAvailability && parkingSegment.availableSpaces === 0;

  return (
    <MapPopupCard
      ariaLabel="路邊停車格詳細資訊"
      closeLabel="關閉路邊停車格資訊"
      title={parkingSegment.name || '未提供路段名稱'}
      onClose={onClose}
      onReload={onReload}
      reloadLabel="重新整理這一段的即時資料"
      isReloading={isReloading}
    >
      {parkingSegment.description && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.25 }}
        >
          {parkingSegment.description}
        </Typography>
      )}

      {isOutOfService ? (
        <Typography
          sx={{ mt: 1.5, fontSize: typographyTokens.fontSize.caption, color: '#D64242' }}
        >
          此路段目前暫停使用
        </Typography>
      ) : (
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <LinearProgress
            variant="determinate"
            value={ratio == null ? 0 : Math.min(ratio * 100, 100)}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(16,47,58,.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: ratio == null ? 'rgba(16,47,58,.4)' : getAvailabilityColor(ratio),
              },
            }}
          />
          <Typography
            component="span"
            sx={{ fontSize: typographyTokens.fontSize.caption, whiteSpace: 'nowrap' }}
          >
            {parkingSegment.availableSpaces == null || parkingSegment.totalSpaces == null
              ? '未提供'
              : isFull
                ? '已滿'
                : `${parkingSegment.availableSpaces}/${parkingSegment.totalSpaces} 可停`}
          </Typography>
        </Box>
      )}

      {parkingSegment.fareDescription && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 1, color: 'text.secondary' }}
        >
          {parkingSegment.fareDescription}
        </Typography>
      )}
      {parkingSegment.updateTime && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          更新時間：{formatDateTime(parkingSegment.updateTime)}
        </Typography>
      )}
      {reloadFailed && (
        <Typography variant="caption" sx={{ display: 'block', color: '#D64242' }}>
          刷新失敗，請稍後再試
        </Typography>
      )}
    </MapPopupCard>
  );
}
