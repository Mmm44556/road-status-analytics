import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { typographyTokens } from '@/config/designTokens';
import { getRoadEventLabel, getRoadEventType } from '@/config/roadEventTypes';
import type { RoadEventMapPoint } from '@/service/map/features/mapFeatures';
import MapPopupCard from '@/service/map/popups/MapPopupCard';
import { formatDateTime } from '@/utils/dateTime';

type RoadEventPopupCardProps = {
  event: RoadEventMapPoint;
  onClose: () => void;
};

/** 道路事件 popup：事件類別、位置、說明與發布時間。 */
export default function RoadEventPopupCard({
  event,
  onClose,
}: RoadEventPopupCardProps) {
  return (
    <MapPopupCard
      ariaLabel="道路事件詳細資訊"
      closeLabel="關閉事件資訊"
      title={event.eventTitle}
      onClose={onClose}
    >
      {/* 使用表格語意呈現事件欄位，方便快速掃讀。 */}
      <Table
        size="small"
        aria-label="道路事件欄位"
        sx={{
          mt: 1,
          tableLayout: 'fixed',
          '& th, & td': {
            px: 0,
            py: 0.75,
            borderColor: 'rgba(16,47,58,.1)',
            verticalAlign: 'top',
          },
          '& th': {
            width: 76,
            pr: 1.5,
            color: 'text.secondary',
            fontSize: typographyTokens.fontSize.caption,
            fontWeight: typographyTokens.fontWeight.bold,
          },
          '& td': {
            color: 'text.primary',
            fontSize: typographyTokens.fontSize.caption,
            lineHeight: 1.55,
            overflowWrap: 'anywhere',
          },
          '& tr:last-of-type th, & tr:last-of-type td': { border: 0 },
        }}
      >
        <TableBody>
          <TableRow>
            <TableCell component="th" scope="row">
              事件類別
            </TableCell>
            <TableCell>
              <Chip
                label={getRoadEventLabel(event.eventType, event.eventSubType)}
                size="small"
                sx={{
                  height: 24,
                  color: getRoadEventType(event.eventType).main,
                  bgcolor: getRoadEventType(event.eventType).soft,
                  fontSize: typographyTokens.fontSize.metadata,
                  fontWeight: typographyTokens.fontWeight.bold,
                }}
              />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              發生位置
            </TableCell>
            <TableCell>{event.location || '未提供'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              事件說明
            </TableCell>
            <TableCell>{event.description || '未提供'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              資料狀態
            </TableCell>
            <TableCell>
              {event.sourceKind === 'live' ? '即時事件' : '預告事件'}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              發布時間
            </TableCell>
            <TableCell>{formatDateTime(event.publishTime)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </MapPopupCard>
  );
}
