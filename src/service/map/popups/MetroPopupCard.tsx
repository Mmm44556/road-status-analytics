import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { typographyTokens } from '@/config/designTokens';
import type { MetroMapPoint } from '@/service/map/features/metroFeatures';
import MapPopupCard from '@/service/map/popups/MapPopupCard';
import { formatDateTime } from '@/utils/dateTime';

type MetroPopupCardProps = {
  metro: MetroMapPoint;
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

/** 捷運／輕軌 popup：站名、系統別，以及各方向最近一班到站時間。 */
export default function MetroPopupCard({
  metro,
  onClose,
  onReload,
  isReloading,
  reloadFailed,
}: MetroPopupCardProps) {
  const sortedTrains = [...metro.nextTrains].sort(
    (a, b) => a.estimateMinutes - b.estimateMinutes,
  );

  return (
    <MapPopupCard
      ariaLabel="捷運／輕軌站點詳細資訊"
      closeLabel="關閉捷運／輕軌站點資訊"
      title={metro.name || '未提供站名'}
      onClose={onClose}
      onReload={onReload}
      reloadLabel="重新整理這一站的即時到站資料"
      isReloading={isReloading}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 0.25 }}
      >
        {metro.system}
      </Typography>

      <Box sx={{ mt: 1.5 }}>
        {sortedTrains.length === 0 ? (
          <Typography sx={{ fontSize: typographyTokens.fontSize.caption, color: 'text.secondary' }}>
            目前無到站資訊
          </Typography>
        ) : (
          <Table size="small" aria-label="捷運／輕軌到站時間" sx={cellSx}>
            <TableBody>
              {sortedTrains.map((train) => (
                <TableRow key={train.direction}>
                  <TableCell component="th" scope="row">{train.direction}</TableCell>
                  <TableCell>{train.estimateMinutes} 分鐘後</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      {metro.updateTime && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          更新時間：{formatDateTime(metro.updateTime)}
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
