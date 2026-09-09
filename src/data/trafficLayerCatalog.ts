import type { SvgIconComponent } from '@mui/icons-material';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import TrafficRoundedIcon from '@mui/icons-material/TrafficRounded';
import DirectionsBikeRoundedIcon from '@mui/icons-material/DirectionsBikeRounded';
import DirectionsSubwayRoundedIcon from '@mui/icons-material/DirectionsSubwayRounded';
import LocalParkingRoundedIcon from '@mui/icons-material/LocalParkingRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';

export type TrafficLayerId =
  | 'cctv'
  | 'roadEvents'
  | 'liveTraffic'
  | 'vehicleDetectors'
  | 'bikeShare'
  | 'metro'
  | 'bus'
  | 'parkingLots'
  | 'parkingSegments';

export type TrafficLayerAvailability =
  | 'available'
  | 'integrationPending'
  | 'sourcePending';

export type TrafficLayerDefinition = {
  id: TrafficLayerId;
  label: string;
  description: string;
  availability: TrafficLayerAvailability;
  defaultVisible: boolean;
  icon: SvgIconComponent;
  mapIconPath: string;
  color: string;
  softColor: string;
};

export const trafficLayerCatalog: TrafficLayerDefinition[] = [
  {
    id: 'liveTraffic',
    label: '即時路況',
    description: '國道・省道',
    availability: 'available',
    defaultVisible: false,
    icon: TrafficRoundedIcon,
    mapIconPath:
      'M20 10h-3V8.86c1.72-.45 3-2 3-3.86h-3V4c0-1.1-.9-2-2-2H9C7.9 2 7 2.9 7 4v1H4c0 1.86 1.28 3.41 3 3.86V10H4c0 1.86 1.28 3.41 3 3.86V15H4c0 1.86 1.28 3.41 3 3.86V20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-1.14c1.72-.45 3-2 3-3.86h-3v-1.14c1.72-.45 3-2 3-3.86M12 19.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m0-6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m0-6C11.17 7.5 10.5 6.83 10.5 6s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5',
    color: '#16765D',
    softColor: '#E3F2ED',
  },
  {
    id: 'cctv',
    label: '路口影像',
    description: 'CCTV',
    availability: 'available',
    defaultVisible: false,
    icon: VideocamRoundedIcon,
    mapIconPath:
      'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l2.29 2.29c.63.63 1.71.18 1.71-.71V8.91c0-.89-1.08-1.34-1.71-.71z',
    color: '#1B7895',
    softColor: '#E4F2F6',
  },
  {
    id: 'roadEvents',
    label: '交通事件',
    description: '道路事件',
    availability: 'available',
    defaultVisible: false,
    icon: WarningAmberRoundedIcon,
    mapIconPath:
      'M12 5.99 19.53 19H4.47zM2.74 18c-.77 1.33.19 3 1.73 3h15.06c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0zM11 11v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1m0 5h2v2h-2z',
    color: '#C35B24',
    softColor: '#FAECE5',
  },
  {
    id: 'vehicleDetectors',
    label: '車輛偵測器',
    description: 'VD',
    availability: 'available',
    defaultVisible: false,
    icon: SensorsRoundedIcon,
    mapIconPath:
      'M8.54 8.54c.35.35.37.88.1 1.29C8.24 10.45 8 11.2 8 12s.24 1.55.64 2.17c.27.41.24.95-.11 1.29-.43.43-1.17.4-1.51-.11C6.38 14.4 6 13.24 6 12c0-1.21.36-2.33.97-3.28.36-.54 1.11-.64 1.57-.18m6.92 6.92c.43.43 1.17.4 1.51-.11C17.62 14.4 18 13.24 18 12s-.38-2.4-1.03-3.36c-.34-.5-1.08-.54-1.51-.11-.35.35-.37.88-.11 1.29.41.63.65 1.38.65 2.18s-.24 1.55-.64 2.17c-.27.41-.24.95.1 1.29M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m6.32 8.32c.42.42 1.12.39 1.5-.08C21.18 16.53 22 14.36 22 12s-.82-4.53-2.18-6.24c-.37-.47-1.07-.5-1.5-.08-.36.36-.4.92-.08 1.32 1.1 1.37 1.76 3.11 1.76 5s-.66 3.63-1.76 5c-.32.39-.28.96.08 1.32M5.68 5.68c-.42-.42-1.12-.39-1.5.08C2.82 7.47 2 9.64 2 12s.82 4.53 2.18 6.24c.37.47 1.07.5 1.5.08.36-.36.4-.92.08-1.32C4.66 15.63 4 13.89 4 12s.66-3.63 1.76-5c.32-.39.28-.96-.08-1.32',
    color: '#A6386B',
    softColor: '#F6E7EE',
  },
  {
    id: 'bikeShare',
    label: 'YouBike',
    description: '共享單車',
    availability: 'available',
    defaultVisible: false,
    icon: DirectionsBikeRoundedIcon,
    mapIconPath:
      'M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2M5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5m0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5m5.8-10 2.4-2.4.8.8c1.06 1.06 2.38 1.78 3.96 2.02.6.09 1.14-.39 1.14-1 0-.49-.37-.91-.85-.99-1.11-.18-2.02-.71-2.75-1.43l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v4c0 .55.45 1 1 1s1-.45 1-1v-4.4c0-.52-.2-1.01-.55-1.38zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5m0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5',
    color: '#B8860B',
    softColor: '#F5EEDC',
  },
  {
    id: 'metro',
    label: '捷運／輕軌',
    description: '軌道運輸',
    availability: 'available',
    defaultVisible: false,
    icon: DirectionsSubwayRoundedIcon,
    mapIconPath:
      'M12 2c-4.42 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19l-1.15 1.15c-.31.31-.09.85.36.85H17.3c.45 0 .67-.54.35-.85L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4M7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m3.5-6H6V6h5zm5.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m1.5-6h-5V6h5z',
    color: '#2C5F8A',
    softColor: '#E6EEF4',
  },
  {
    id: 'bus',
    label: '公車站牌',
    description: '市區公車',
    availability: 'available',
    defaultVisible: false,
    icon: DirectionsBusRoundedIcon,
    mapIconPath: 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4zm3.5 1.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5S9 15.17 9 16s-.67 1.5-1.5 1.5m9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5S18 15.17 18 16s-.67 1.5-1.5 1.5M18 11H6V6h12z',
    color: '#7857A4',
    softColor: '#EFE9F6',
  },
  {
    id: 'parkingLots',
    label: '戶外停車場',
    description: '路外停車場',
    availability: 'available',
    defaultVisible: false,
    icon: LocalParkingRoundedIcon,
    mapIconPath:
      'M12.79 3H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2s2-.9 2-2v-4h3c3.57 0 6.42-3.13 5.95-6.79C18.56 5.19 15.84 3 12.79 3m.41 8H10V7h3.2c1.1 0 2 .9 2 2s-.9 2-2 2',
    color: '#2F6844',
    softColor: '#E7F0E9',
  },
  {
    id: 'parkingSegments',
    label: '路邊停車格',
    description: '路邊停車路段',
    availability: 'available',
    defaultVisible: false,
    icon: DirectionsCarFilledRoundedIcon,
    mapIconPath:
      'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v7.5c0 .83.67 1.5 1.5 1.5S6 20.33 6 19.5V19h12v.5c0 .82.67 1.5 1.5 1.5.82 0 1.5-.67 1.5-1.5V12zM7.5 16c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16m9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5M5.81 10l1.04-3h10.29l1.04 3z',
    color: '#3F4E9C',
    softColor: '#E8EAF6',
  },
];
