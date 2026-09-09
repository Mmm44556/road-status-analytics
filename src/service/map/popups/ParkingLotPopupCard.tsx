import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { typographyTokens } from '@/config/designTokens';
import type { ParkingLotMapPoint } from '@/service/map/features/parkingLotFeatures';
import MapPopupCard from '@/service/map/popups/MapPopupCard';
import { formatDateTime } from '@/utils/dateTime';

type ParkingLotPopupCardProps = {
  parkingLot: ParkingLotMapPoint;
  onClose: () => void;
  onReload: () => void;
  isReloading: boolean;
  reloadFailed: boolean;
};

// TDX 服務狀態代碼：1 為正常營運，其餘（暫停營運等）都不宜顯示車位數字。
const SERVICE_STATUS_NORMAL = 1;

/** 依可用車位佔總數的比例決定顏色：比例愈低愈接近警示色。 */
function getAvailabilityColor(ratio: number): string {
  if (ratio >= 0.3) return '#16A36A';
  if (ratio >= 0.1) return '#E6B422';
  return '#D64242';
}

/** 戶外停車場 popup：地址、即時可用車位（含已滿、服務暫停的明確提示）與收費說明。 */
export default function ParkingLotPopupCard({
  parkingLot,
  onClose,
  onReload,
  isReloading,
  reloadFailed,
}: ParkingLotPopupCardProps) {
  const isOutOfService =
    parkingLot.serviceStatus != null && parkingLot.serviceStatus !== SERVICE_STATUS_NORMAL;
  const hasAvailability = parkingLot.availableSpaces != null && !isOutOfService;
  const ratio =
    hasAvailability && parkingLot.totalSpaces
      ? parkingLot.availableSpaces! / parkingLot.totalSpaces
      : null;
  const isFull = hasAvailability && parkingLot.availableSpaces === 0;

  return (
    <MapPopupCard
      ariaLabel="戶外停車場詳細資訊"
      closeLabel="關閉戶外停車場資訊"
      title={parkingLot.name || '未提供站名'}
      onClose={onClose}
      onReload={onReload}
      reloadLabel="重新整理這一站的即時資料"
      isReloading={isReloading}
    >
      {parkingLot.address && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.25 }}
        >
          {parkingLot.address}
        </Typography>
      )}
      {parkingLot.isMotorcycle && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}
        >
          機車停車場
        </Typography>
      )}

      {isOutOfService ? (
        <Typography
          sx={{ mt: 1.5, fontSize: typographyTokens.fontSize.caption, color: '#D64242' }}
        >
          此站目前暫停使用
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
            {parkingLot.availableSpaces == null || parkingLot.totalSpaces == null
              ? '未提供'
              : isFull
                ? '已滿'
                : `${parkingLot.availableSpaces}/${parkingLot.totalSpaces} 可停`}
          </Typography>
        </Box>
      )}

      {parkingLot.fareDescription && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 1, color: 'text.secondary' }}
        >
          {parkingLot.fareDescription}
        </Typography>
      )}
      {parkingLot.updateTime && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          更新時間：{formatDateTime(parkingLot.updateTime)}
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
