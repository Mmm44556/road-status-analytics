import { uiColors } from './semanticColors';

export const roadEventTypes = {
  1: { label: '交通事故', ...uiColors.event.accident },
  2: { label: '施工', ...uiColors.event.construction },
  3: { label: '壅塞', ...uiColors.event.congestion },
  4: { label: '特殊管制', ...uiColors.event.control },
  5: { label: '天氣', ...uiColors.event.weather },
  6: { label: '災害', ...uiColors.event.disaster },
  7: { label: '活動', ...uiColors.event.activity },
  8: { label: '其它異常告警', ...uiColors.event.hazard },
} as const;

export const roadEventSubTypes: Readonly<Record<number, string>> = {
  101: '人與汽機車事故',
  102: '車與車事故',
  103: '汽機車本身事故',
  104: '平交道事故',
  105: '火燒車事故',
  106: '危險原物料事故',
  198: '其他的交通事故',
  199: '未知的交通事故',
  201: '橋梁施工',
  202: '爆破施工',
  203: '設施施工',
  204: '拆除施工',
  205: '挖掘施工',
  206: '管線施工',
  207: '道路或鋪面施工',
  208: '移動或清掃施工',
  209: '拓寬施工',
  210: '隧道施工',
  211: '匝道施工',
  298: '其他的施工',
  299: '未知的施工',
  301: '車多',
  302: '壅塞',
  303: '嚴重壅塞',
  304: '極度壅塞',
  401: '疏運',
  402: '預警性封閉',
  403: '演習',
  404: '維安',
  498: '其他的特殊管制',
  499: '未知的特殊管制',
  501: '濃霧',
  502: '豪雨',
  503: '強風',
  504: '高溫',
  505: '低溫',
  506: '颱風的天氣',
  507: '冰雹',
  508: '下雪',
  509: '塵霾',
  598: '其他的天氣',
  599: '未知的天氣',
  601: '地震',
  602: '海嘯',
  603: '落石',
  604: '坍方',
  605: '淹水',
  606: '山崩',
  607: '土石流',
  608: '火災',
  609: '煙塵',
  610: '危險物品洩漏',
  611: '颱風的災害',
  698: '其他的災害',
  699: '未知的災害',
  701: '學術',
  702: '藝文',
  703: '旅遊',
  704: '公益',
  705: '體育',
  706: '婚喪喜慶',
  707: '集會遊行',
  708: '宗教活動',
  709: '節慶',
  798: '其他的活動',
  799: '未知的活動',
  801: '散落物',
  802: '路面損毀',
  803: '路面坑洞',
  804: '路面積水',
  805: '號誌故障',
  806: '路燈故障',
  807: '故障車',
  808: '車輛逆行',
  809: '機車誤闖',
  810: '自行車誤闖',
  811: '行人誤闖',
  812: '動物闖入',
  813: '隧道照明設備故障',
  814: '隧道機電設備故障',
  898: '其他的異常',
  899: '未知的異常',
};

export type RoadEventTypeCode = keyof typeof roadEventTypes;
export type RoadEventTypeDefinition = {
  label: string;
  main: string;
  soft: string;
};

const unknownRoadEventType = {
  label: '未分類事件',
  main: uiColors.event.hazard.main,
  soft: uiColors.event.hazard.soft,
} as const;

/** 取得事件類別的名稱與配色，未知代碼使用預設樣式。 */
export function getRoadEventType(code: number): RoadEventTypeDefinition {
  // TDX 未來新增代碼時使用安全的預設樣式。
  const definitions: Partial<Record<number, RoadEventTypeDefinition>> = roadEventTypes;
  return definitions[code] ?? unknownRoadEventType;
}

/** 組合 TDX 事件大類與次類別的顯示名稱。 */
export function getRoadEventLabel(type: number, subType: number) {
  const eventType = getRoadEventType(type);
  const subTypeLabel = roadEventSubTypes[subType];
  if (!(type in roadEventTypes)) return eventType.label;
  return subTypeLabel ? `${eventType.label}・${subTypeLabel}` : eventType.label;
}
