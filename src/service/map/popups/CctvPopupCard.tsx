import { useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import NavigationIcon from '@mui/icons-material/Navigation';
import {
  getRoadDirectionAngle,
  getRoadDirectionLabel,
} from '@/config/roadDirections';
import { typographyTokens } from '@/config/designTokens';
import type { CctvCameraView, CctvMapPoint } from '@/service/map/features/cctvFeatures';
import CctvMediaViewer from '@/service/map/popups/CctvMediaViewer';
import MapPopupCard from '@/service/map/popups/MapPopupCard';

type CctvPopupCardProps = {
  cctv: CctvMapPoint;
  onClose: () => void;
};

/** CCTV popup：多支同路口攝影機以分頁切換方向，內容為表格與即時影像。 */
export default function CctvPopupCard({ cctv, onClose }: CctvPopupCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const camera = cctv.cameras[activeIndex] ?? cctv.cameras[0];

  return (
    <MapPopupCard
      ariaLabel="CCTV 詳細資訊"
      closeLabel="關閉 CCTV 資訊"
      title={camera.roadName || '未提供道路名稱'}
      onClose={onClose}
    >
      {cctv.cameras.length > 1 && (
        <Tabs
          value={activeIndex}
          onChange={(_event, value: number) => setActiveIndex(value)}
          variant="fullWidth"
          aria-label="同路口不同方向的攝影機"
          sx={{
            minHeight: 32,
            mb: 1,
            '& .MuiTab-root': {
              minHeight: 32,
              py: 0.5,
              fontSize: typographyTokens.fontSize.caption,
            },
          }}
        >
          {cctv.cameras.map((cameraOption, index) => (
            <Tab
              key={cameraOption.id}
              value={index}
              label={
                cameraOption.roadDirection
                  ? getRoadDirectionLabel(cameraOption.roadDirection)
                  : `鏡頭 ${index + 1}`
              }
            />
          ))}
        </Tabs>
      )}
      <CctvCameraDetail key={camera.id} camera={camera} />
    </MapPopupCard>
  );
}

/** 單一攝影機的方向、位置說明與即時影像（含載入中、失敗降級與放大檢視）。 */
function CctvCameraDetail({ camera }: { camera: CctvCameraView }) {
  const directionAngle = getRoadDirectionAngle(camera.roadDirection);

  return (
    <>
      <Table
        size="small"
        aria-label="CCTV 欄位"
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
              方向
            </TableCell>
            <TableCell>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
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
                {getRoadDirectionLabel(camera.roadDirection)}
              </Box>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              位置說明
            </TableCell>
            <TableCell>{camera.description || '未提供'}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <CctvMediaViewer camera={camera} />
    </>
  );
}
