import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { getCongestionPresentation } from '@/config/liveTraffic';
import { typographyTokens } from '@/config/designTokens';
import { getRoadDirectionLabel } from '@/config/roadDirections';
import type { LiveTrafficSegment } from '@/service/liveTrafficApi';
import MapPopupCard from '@/service/map/popups/MapPopupCard';
import { formatDateTime } from '@/utils/dateTime';

/** 顯示即時路段速度、壅塞程度與資料時間。 */
export default function LiveTrafficPopupCard({
  segment,
  onClose,
}: {
  segment: LiveTrafficSegment;
  onClose: () => void;
}) {
  const congestion = getCongestionPresentation(segment.congestionLevel);
  const sourceLabel =
    segment.source === 'Freeway'
      ? 'TDX 國道'
      : segment.source === 'Highway'
        ? 'TDX 省道'
        : 'TDX 市區道路（VD 車速推估）';
  const rows: [string, string][] = [
    ['壅塞程度', congestion.label],
    ['平均速度', segment.travelSpeed == null ? '未提供' : `${segment.travelSpeed} km/h`],
    ['旅行時間', segment.travelTime == null ? '未提供' : `${segment.travelTime} 秒`],
    ['行車方向', getRoadDirectionLabel(segment.roadDirection)],
    ['資料來源', sourceLabel],
    ['更新時間', formatDateTime(segment.dataCollectTime)],
  ];
  // 市區道路沒有官方壅塞等級，須明確標示這是換算值，避免使用者誤以為與國道/省道同等權威。
  if (segment.source === 'VD') {
    rows.push(['說明', '依車輛偵測器車速換算，非官方壅塞等級']);
  }

  return (
    <MapPopupCard
      ariaLabel="即時路況詳細資訊"
      closeLabel="關閉即時路況資訊"
      title={segment.roadName || segment.sectionName || '即時路況'}
      onClose={onClose}
    >
      <Table
        size="small"
        aria-label="即時路況欄位"
        sx={{
          mt: 1,
          '& th, & td': { px: 0, py: 0.75, borderColor: 'rgba(16,47,58,.1)' },
          '& th': {
            width: 80,
            color: 'text.secondary',
            fontSize: typographyTokens.fontSize.caption,
            fontWeight: typographyTokens.fontWeight.bold,
          },
          '& td': { fontSize: typographyTokens.fontSize.caption },
          '& tr:last-of-type th, & tr:last-of-type td': { border: 0 },
        }}
      >
        <TableBody>
          {rows.map(([label, value], index) => (
            <TableRow key={label}>
              <TableCell component="th" scope="row">{label}</TableCell>
              <TableCell>
                {index === 0 && (
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
                )}
                {value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </MapPopupCard>
  );
}
