export type CountyBoundaryState = 'default' | 'hovered' | 'selected' | 'masked';

const COUNTY_PALETTES = [
  { fill: '#557485', stroke: '#354E5A', hover: '#6E8C9C' },
  { fill: '#766779', stroke: '#514653', hover: '#8F8092' },
  { fill: '#708064', stroke: '#4C5A43', hover: '#89977D' },
  { fill: '#8B705E', stroke: '#624C3E', hover: '#A38874' },
  { fill: '#4F786E', stroke: '#31554D', hover: '#669187' },
  { fill: '#686F86', stroke: '#474D62', hover: '#81899F' },
] as const;

/** 依縣市代碼穩定分配同色系配色。 */
export function getCountyBoundaryPalette(countyId: string) {
  const hash = [...countyId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return COUNTY_PALETTES[hash % COUNTY_PALETTES.length];
}

/** 依目前選取與 hover 條件決定縣市的視覺狀態。 */
export function getCountyBoundaryState(
  countyId: string,
  selectedCountyId: string | null,
  hoveredCountyId: string | null,
): CountyBoundaryState {
  if (selectedCountyId) {
    return countyId === selectedCountyId ? 'selected' : 'masked';
  }
  return countyId === hoveredCountyId ? 'hovered' : 'default';
}

/** 遮罩中的行政區不顯示名稱，但保留目前選取行政區的標籤。 */
export function isBoundaryLabelVisible(state: CountyBoundaryState) {
  return state !== 'masked';
}
