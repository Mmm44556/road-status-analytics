import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import NavigationIcon from '@mui/icons-material/Navigation';
import { getCongestionPresentation } from '@/config/liveTraffic';
import {
  getRoadDirectionAngle,
  getRoadDirectionLabel,
} from '@/config/roadDirections';
import { typographyTokens } from '@/config/designTokens';
import type { VdLink } from '@/service/vdApi';
import type { VdMapPoint } from '@/service/map/features/vdFeatures';
import MapPopupCard from '@/service/map/popups/MapPopupCard';

type VdPopupCardProps = {
  vd: VdMapPoint;
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

/** VD popup：路段位置與各偵測方向的即時車速、佔有率。 */
export default function VdPopupCard({
  vd,
  onClose,
  onReload,
  isReloading,
  reloadFailed,
}: VdPopupCardProps) {
  const { start, end } = vd.roadSection;

  return (
    <MapPopupCard
      ariaLabel="車輛偵測器詳細資訊"
      closeLabel="關閉車輛偵測器資訊"
      title={vd.roadName || '未提供道路名稱'}
      onClose={onClose}
      onReload={onReload}
      reloadLabel="重新整理這一點的即時讀數"
      isReloading={isReloading}
    >
      {(start || end) && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.25 }}
        >
          {start || '未提供'} – {end || '未提供'}
        </Typography>
      )}
      {reloadFailed && (
        <Typography variant="caption" sx={{ display: 'block', color: '#D64242' }}>
          刷新失敗，請稍後再試
        </Typography>
      )}
      {vd.links.map((link, index) => (
        <VdLinkDetail
          key={link.linkId}
          link={link}
          isLast={index === vd.links.length - 1}
        />
      ))}
    </MapPopupCard>
  );
}

function VdLinkDetail({ link, isLast }: { link: VdLink; isLast: boolean }) {
  const directionAngle = getRoadDirectionAngle(link.roadDirection);
  // 沒有有效車速讀數時不代表壅塞或順暢，維持「未提供」，不要套用任何等級顏色。
  const congestion =
    link.congestionLevel == null
      ? null
      : getCongestionPresentation(link.congestionLevel);

  return (
    <Box
      sx={{
        mt: 1.5,
        pb: isLast ? 0 : 1.5,
        borderBottom: isLast ? 0 : '1px solid rgba(16,47,58,.08)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {directionAngle !== null && (
          <NavigationIcon
            aria-hidden="true"
            sx={{
              fontSize: 18,
              color: 'text.secondary',
              transform: `rotate(${directionAngle}deg)`,
            }}
          />
        )}
        <Typography
          variant="subtitle2"
          fontWeight={typographyTokens.fontWeight.bold}
          sx={{ fontSize: typographyTokens.fontSize.caption }}
        >
          {getRoadDirectionLabel(link.roadDirection)}
        </Typography>
      </Box>
      <Table size="small" aria-label="車道欄位" sx={{ ...cellSx, mt: 0.5 }}>
        <TableBody>
          <TableRow>
            <TableCell component="th" scope="row">
              路況
            </TableCell>
            <TableCell>
              {congestion ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      mr: 0.75,
                      borderRadius: '50%',
                      bgcolor: congestion.color,
                    }}
                  />
                  {congestion.label}
                </Box>
              ) : (
                '未提供'
              )}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              車道數
            </TableCell>
            <TableCell>{link.laneCount ?? '未提供'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              平均車速
            </TableCell>
            <TableCell>
              {link.averageSpeed == null
                ? '未提供'
                : `${link.averageSpeed} km/h`}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              車流密集度
            </TableCell>
            <TableCell>
              {link.averageOccupancy == null ? (
                '未提供'
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(link.averageOccupancy, 100)}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(16,47,58,.08)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        bgcolor: congestion?.color ?? 'rgba(16,47,58,.4)',
                      },
                    }}
                  />
                  <Typography
                    component="span"
                    sx={{
                      fontSize: typographyTokens.fontSize.caption,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {link.averageOccupancy}%
                  </Typography>
                </Box>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
}
