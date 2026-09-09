import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { typographyTokens } from '@/config/designTokens';
import type { BikeMapPoint } from '@/service/map/features/bikeFeatures';
import MapPopupCard from '@/service/map/popups/MapPopupCard';
import { formatDateTime } from '@/utils/dateTime';

type BikePopupCardProps = {
  bike: BikeMapPoint;
  onClose: () => void;
  onReload: () => void;
  isReloading: boolean;
  reloadFailed: boolean;
};

const cellSx = {
  '& th, & td': {
    px: 0,
    py: 0.5,
    borderColor: 'rgba(16,47,58,.1)',
  },
  '& th': {
    width: 90,
    pr: 1.5,
    color: 'text.secondary',
    fontSize: typographyTokens.fontSize.caption,
    fontWeight: typographyTokens.fontWeight.bold,
  },
  '& td': {
    color: 'text.primary',
    fontSize: typographyTokens.fontSize.caption,
  },
  '& tr:last-of-type th, & tr:last-of-type td': { border: 0 },
} as const;

// TDX 服務狀態代碼：1 為正常營運，其餘（暫停營運、調度中等）都不宜顯示車輛數字。
const SERVICE_STATUS_NORMAL = 1;

/** 依可借車輛佔總車柱數的比例決定顏色：比例愈低愈接近警示色。 */
function getAvailabilityColor(ratio: number): string {
  if (ratio >= 0.3) return '#16A36A';
  if (ratio >= 0.1) return '#E6B422';
  return '#D64242';
}

/** YouBike popup：站點位置與即時可借還數量（含服務暫停的明確提示）。 */
export default function BikePopupCard({
  bike,
  onClose,
  onReload,
  isReloading,
  reloadFailed,
}: BikePopupCardProps) {
  const isOutOfService =
    bike.serviceStatus != null && bike.serviceStatus !== SERVICE_STATUS_NORMAL;
  const hasAvailability = bike.availableRentBikes != null && !isOutOfService;
  const ratio =
    hasAvailability && bike.capacity ? bike.availableRentBikes! / bike.capacity : null;
  const generalBikes =
    bike.availableRentBikes != null && bike.availableElectricBikes != null
      ? bike.availableRentBikes - bike.availableElectricBikes
      : null;

  return (
    <MapPopupCard
      ariaLabel="YouBike 站點詳細資訊"
      closeLabel="關閉 YouBike 站點資訊"
      title={bike.name || '未提供站名'}
      onClose={onClose}
      onReload={onReload}
      reloadLabel="重新整理這一站的即時資料"
      isReloading={isReloading}
    >
      {bike.address && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.25 }}
        >
          {bike.address}
        </Typography>
      )}

      {isOutOfService ? (
        <Typography
          sx={{ mt: 1.5, fontSize: typographyTokens.fontSize.caption, color: '#D64242' }}
        >
          此站目前暫停營運
        </Typography>
      ) : (
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
              {bike.availableRentBikes == null || bike.capacity == null
                ? '未提供'
                : `${bike.availableRentBikes}/${bike.capacity} 可借`}
            </Typography>
          </Box>
          <Table size="small" aria-label="YouBike 欄位" sx={{ ...cellSx, mt: 1 }}>
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">可借一般車</TableCell>
                <TableCell>{generalBikes ?? '未提供'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">可借電輔車</TableCell>
                <TableCell>{bike.availableElectricBikes ?? '未提供'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">可還空位</TableCell>
                <TableCell>{bike.availableReturnBikes ?? '未提供'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      )}

      {bike.updateTime && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          更新時間：{formatDateTime(bike.updateTime)}
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
