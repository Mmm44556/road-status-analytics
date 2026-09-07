import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import IconStyle from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import { uiColors } from '@/config/semanticColors';

const searchMarkerSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
    <defs>
      <filter id="shadow" x="-40%" y="-30%" width="180%" height="190%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#062B5B" flood-opacity=".34"/>
      </filter>
    </defs>
    <path filter="url(#shadow)" fill="${uiColors.brand.ink}" stroke="#FFFFFF" stroke-width="2"
      d="M18 1C8.6 1 1 8.5 1 17.8 1 30.2 18 45 18 45s17-14.8 17-27.2C35 8.5 27.4 1 18 1Z"/>
    <circle cx="18" cy="18" r="7" fill="${uiColors.brand.mint}" stroke="#FFFFFF" stroke-width="3"/>
  </svg>
`;

const searchMarkerUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  searchMarkerSvg,
)}`;

/** 搜尋結果使用 pin 尖端對準實際座標。 */
export const searchLocationStyle = new Style({
  image: new IconStyle({
    src: searchMarkerUrl,
    size: [36, 46],
    anchor: [18, 46],
    anchorXUnits: 'pixels',
    anchorYUnits: 'pixels',
  }),
  zIndex: 30,
});

/** 我的所在位置使用光暈、白環與中心點，和搜尋 pin 明確區分。 */
export const userLocationStyle = [
  new Style({
    image: new CircleStyle({
      radius: 18,
      fill: new Fill({ color: 'rgba(22, 127, 118, .18)' }),
      stroke: new Stroke({ color: 'rgba(22, 127, 118, .30)', width: 1 }),
    }),
    zIndex: 28,
  }),
  new Style({
    image: new CircleStyle({
      radius: 9,
      fill: new Fill({ color: '#FFFFFF' }),
      stroke: new Stroke({ color: 'rgba(6, 43, 91, .18)', width: 1 }),
    }),
    zIndex: 29,
  }),
  new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: uiColors.brand.teal }),
      stroke: new Stroke({ color: uiColors.brand.ink, width: 2 }),
    }),
    zIndex: 30,
  }),
];
