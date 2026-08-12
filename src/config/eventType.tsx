import DirectionsIcon from '@mui/icons-material/Directions';
import CarCrashIcon from '@mui/icons-material/CarCrash';
import AirIcon from '@mui/icons-material/Air';
import FloodIcon from '@mui/icons-material/Flood';
import GroupsIcon from '@mui/icons-material/Groups';
import WarningIcon from '@mui/icons-material/Warning';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import { getSvgData } from '@/utils/getSvgPath';
import { uiColors } from '@/config/semanticColors';
import {
  paintPathToIcon,
  paintPathToConstructionWorker,
} from '@/utils/paintSVG';
import type { SvgIcon } from '@mui/material';
import ConstructionWorker from '@/components/icons/ConstructionWorker';

const tdx_event_classification: EventClassification = {
  '1': {
    name: '交通事故',
    Icon: CarCrashIcon,
    iconColor: uiColors.event.accident.main,
    iconBackground: uiColors.event.accident.soft,
    iconDataUri: paintPathToIcon({
      content: getSvgData(<CarCrashIcon />).content,
      iconColor: uiColors.event.accident.main,
      iconBackground: uiColors.event.accident.soft,
    }),
    subtypes: {
      '101': '人與汽(機)車事故',
      '102': '車與車事故',
      '103': '汽(機)車本身事故',
      '104': '平交道事故',
      '105': '火災車事故',
      '106': '危險原物料事故',
      '198': '其他',
      '199': '未知',
    },
  },
  '2': {
    name: '施工',
    Icon: ConstructionWorker,
    iconColor: uiColors.event.construction.main,
    iconBackground: uiColors.event.construction.soft,
    iconDataUri: paintPathToConstructionWorker({
      iconBackground: uiColors.event.construction.soft,
      iconColor: uiColors.event.construction.main,
    }),
    subtypes: {
      '201': '佈纜施工',
      '202': '鋪磨施工',
      '203': '設施施工',
      '204': '拆除施工',
      '205': '挖掘施工',
      '206': '管線施工',
      '207': '道路/鋪面施工',
      '208': '移動/清掃施工',
      '209': '拓寬施工',
      '210': '隧道施工',
      '211': '匝道施工',
      '298': '其他',
      '299': '未知',
    },
  },
  '3': {
    name: '壅塞',
    Icon: DirectionsIcon,
    iconColor: uiColors.event.congestion.main,
    iconBackground: uiColors.event.congestion.soft,
    iconDataUri: paintPathToIcon({
      content: getSvgData(<DirectionsIcon />).content,
      iconColor: uiColors.event.congestion.main,
      iconBackground: uiColors.event.congestion.soft,
    }),
    subtypes: {
      '301': '車多',
      '302': '壅塞',
      '303': '嚴重壅塞',
      '304': '極度壅塞',
    },
  },
  '4': {
    name: '特殊管制',
    Icon: AltRouteIcon,
    iconColor: uiColors.event.control.main,
    iconBackground: uiColors.event.control.soft,
    iconDataUri: paintPathToIcon({
      content: getSvgData(<AltRouteIcon />).content,
      iconColor: uiColors.event.control.main,
      iconBackground: uiColors.event.control.soft,
    }),
    subtypes: {
      '401': '航運',
      '402': '預警性封閉',
      '403': '演習',
      '404': '維安',
      '498': '其他',
      '499': '未知',
    },
  },
  '5': {
    name: '天氣',
    Icon: AirIcon,
    iconColor: uiColors.event.weather.main,
    iconBackground: uiColors.event.weather.soft,
    iconDataUri: paintPathToIcon({
      content: getSvgData(<AirIcon />).content,
      iconColor: uiColors.event.weather.main,
      iconBackground: uiColors.event.weather.soft,
    }),
    subtypes: {
      '501': '濃霧',
      '502': '豪雨',
      '503': '強風',
      '504': '高溫',
      '505': '低溫',
      '506': '颱風',
      '507': '冰雹',
      '508': '下雪',
      '509': '塵暴',
      '598': '其他',
      '599': '未知',
    },
  },
  '6': {
    name: '災害',
    Icon: FloodIcon,
    iconColor: uiColors.event.disaster.main,
    iconBackground: uiColors.event.disaster.soft,
    iconDataUri: paintPathToIcon({
      content: getSvgData(<FloodIcon />).content,
      iconColor: uiColors.event.disaster.main,
      iconBackground: uiColors.event.disaster.soft,
    }),
    subtypes: {
      '601': '地震',
      '602': '海嘯',
      '603': '落石',
      '604': '坍方',
      '605': '淹水',
      '606': '山崩',
      '607': '土石流',
      '608': '火災',
      '609': '爆震',
      '610': '危險物品洩漏',
      '611': '颱風',
      '698': '其他',
      '699': '未知',
    },
  },
  '7': {
    name: '活動',
    Icon: GroupsIcon,
    iconColor: uiColors.event.activity.main,
    iconBackground: uiColors.event.activity.soft,
    iconDataUri: paintPathToIcon({
      content: getSvgData(<GroupsIcon />).content,
      iconColor: uiColors.event.activity.main,
      iconBackground: uiColors.event.activity.soft,
    }),
    subtypes: {
      '701': '學術',
      '702': '藝文',
      '703': '旅遊',
      '704': '公益',
      '705': '體育',
      '706': '婚喪喜慶',
      '707': '集會遊行',
      '708': '宗教活動',
      '709': '節慶',
      '798': '其他',
      '799': '未知',
    },
  },
  '8': {
    name: '其他異常專案',
    Icon: WarningIcon,
    iconColor: uiColors.event.hazard.main,
    iconBackground: uiColors.event.hazard.soft,
    iconDataUri: paintPathToIcon({
      content: getSvgData(<WarningIcon />).content,
      iconColor: uiColors.event.hazard.main,
      iconBackground: uiColors.event.hazard.soft,
    }),
    subtypes: {
      '801': '散落物',
      '802': '路面損壞',
      '803': '路面坑洞',
      '804': '路面積水',
      '805': '號誌故障',
      '806': '路燈故障',
      '807': '故障車',
      '808': '車輛逆行',
      '809': '機車誤闖',
      '810': '自行車誤闖',
      '811': '行人誤闖',
      '812': '動物闖入',
      '813': '隧道照明設備故障',
      '814': '隧道機電設備故障',
      '898': '其他',
      '899': '未知',
    },
  },
};

export type EventClassification = {
  [key: string]: {
    name: string;
    Icon: typeof SvgIcon | React.ElementType;
    iconColor: string;
    iconBackground: string;
    iconDataUri: string;
    subtypes: {
      [key: string]: string;
    };
  };
};

export default function getEventDescription(
  eventType: string,
  eventSubType: string,
) {
  const classification =
    tdx_event_classification[
      eventType as keyof typeof tdx_event_classification
    ];
  if (classification) {
    const subtype =
      classification.subtypes[
        eventSubType as keyof typeof classification.subtypes
      ];
    return {
      name: classification.name,
      subtype: subtype || '未知子類型',
      Icon: classification.Icon,
      iconColor: classification.iconColor,
      iconBackground: classification.iconBackground,
      iconDataUri: classification.iconDataUri,
    };
  }
  return {
    name: '未知事件類型',
    subtype: '未知子類型',
    Icon: null,
    iconColor: 'text.secondary',
    iconBackground: '#EEF2F1',
  };
}
