import DirectionsIcon from "@mui/icons-material/Directions";
import CarCrashIcon from "@mui/icons-material/CarCrash";
import FrontLoaderIcon from "@mui/icons-material/FrontLoader";
import AirIcon from "@mui/icons-material/Air";
import FloodIcon from "@mui/icons-material/Flood";
import GroupsIcon from "@mui/icons-material/Groups";
import WarningIcon from "@mui/icons-material/Warning";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import { orange, blue, grey, green, red } from "@mui/material/colors";
const tdx_event_classification: EventClassification = {
  "1": {
    name: "交通事故",
    Icon: CarCrashIcon,
    iconColor: red[500],
    subtypes: {
      "101": "人與汽(機)車事故",
      "102": "車與車事故",
      "103": "汽(機)車本身事故",
      "104": "平交道事故",
      "105": "火災車事故",
      "106": "危險原物料事故",
      "198": "其他",
      "199": "未知",
    },
  },
  "2": {
    name: "施工",
    Icon: FrontLoaderIcon,
    iconColor: grey[500],
    subtypes: {
      "201": "佈纜施工",
      "202": "鋪磨施工",
      "203": "設施施工",
      "204": "拆除施工",
      "205": "挖掘施工",
      "206": "管線施工",
      "207": "道路/鋪面施工",
      "208": "移動/清掃施工",
      "209": "拓寬施工",
      "210": "隧道施工",
      "211": "匝道施工",
      "298": "其他",
      "299": "未知",
    },
  },
  "3": {
    name: "壅塞",
    Icon: DirectionsIcon,
    iconColor: orange[500],
    subtypes: {
      "301": "車多",
      "302": "壅塞",
      "303": "嚴重壅塞",
      "304": "極度壅塞",
    },
  },
  "4": {
    name: "特殊管制",
    Icon: AltRouteIcon,
    iconColor: "#000",
    subtypes: {
      "401": "航運",
      "402": "預警性封閉",
      "403": "演習",
      "404": "維安",
      "498": "其他",
      "499": "未知",
    },
  },
  "5": {
    name: "天氣",
    Icon: AirIcon,
    iconColor: blue[500],
    subtypes: {
      "501": "濃霧",
      "502": "豪雨",
      "503": "強風",
      "504": "高溫",
      "505": "低溫",
      "506": "颱風",
      "507": "冰雹",
      "508": "下雪",
      "509": "塵暴",
      "598": "其他",
      "599": "未知",
    },
  },
  "6": {
    name: "災害",
    Icon: FloodIcon,
    iconColor: "warning.main",
    subtypes: {
      "601": "地震",
      "602": "海嘯",
      "603": "落石",
      "604": "坍方",
      "605": "淹水",
      "606": "山崩",
      "607": "土石流",
      "608": "火災",
      "609": "爆震",
      "610": "危險物品洩漏",
      "611": "颱風",
      "698": "其他",
      "699": "未知",
    },
  },
  "7": {
    name: "活動",
    Icon: GroupsIcon,
    iconColor: green[500],
    subtypes: {
      "701": "學術",
      "702": "藝文",
      "703": "旅遊",
      "704": "公益",
      "705": "體育",
      "706": "婚喪喜慶",
      "707": "集會遊行",
      "708": "宗教活動",
      "709": "節慶",
      "798": "其他",
      "799": "未知",
    },
  },
  "8": {
    name: "其他異常專案",
    Icon: WarningIcon,
    iconColor: "warning.main",
    subtypes: {
      "801": "散落物",
      "802": "路面損壞",
      "803": "路面坑洞",
      "804": "路面積水",
      "805": "號誌故障",
      "806": "路燈故障",
      "807": "故障車",
      "808": "車輛逆行",
      "809": "機車誤闖",
      "810": "自行車誤闖",
      "811": "行人誤闖",
      "812": "動物闖入",
      "813": "隧道照明設備故障",
      "814": "隧道機電設備故障",
      "898": "其他",
      "899": "未知",
    },
  },
};

export type EventClassification = {
  [key: string]: {
    name: string;
    Icon: React.ElementType | null;
    iconColor: string;
    subtypes: {
      [key: string]: string;
    };
  };
};

export default function getEventDescription(
  eventType: string,
  eventSubType: string
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
      subtype: subtype || "未知子類型",
      Icon: classification.Icon,
      iconColor: classification.iconColor,
    };
  }
  return {
    name: "未知事件類型",
    subtype: "未知子類型",
    Icon: null,
    iconColor: "text.secondary",
  };
}
