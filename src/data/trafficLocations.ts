export type TrafficLocation = {
  name: string;
  center: [number, number];
};

export const trafficLocations: TrafficLocation[] = [
  { name: "基隆市", center: [121.74, 25.13] },
  { name: "臺北市", center: [121.56, 25.04] },
  { name: "新北市", center: [121.46, 25.01] },
  { name: "桃園市", center: [121.3, 24.99] },
  { name: "新竹市", center: [120.97, 24.81] },
  { name: "新竹縣", center: [121.01, 24.84] },
  { name: "苗栗縣", center: [120.82, 24.56] },
  { name: "臺中市", center: [120.67, 24.15] },
  { name: "彰化縣", center: [120.54, 24.08] },
  { name: "南投縣", center: [120.68, 23.91] },
  { name: "雲林縣", center: [120.43, 23.71] },
  { name: "嘉義市", center: [120.45, 23.48] },
  { name: "嘉義縣", center: [120.3, 23.46] },
  { name: "臺南市", center: [120.23, 22.99] },
  { name: "高雄市", center: [120.31, 22.63] },
  { name: "屏東縣", center: [120.49, 22.67] },
  { name: "宜蘭縣", center: [121.75, 24.76] },
  { name: "花蓮縣", center: [121.6, 23.99] },
  { name: "臺東縣", center: [121.15, 22.76] },
  { name: "澎湖縣", center: [119.57, 23.57] },
  { name: "金門縣", center: [118.32, 24.44] },
  { name: "連江縣", center: [119.95, 26.16] },
];

const normalizeLocation = (value: string) => value.trim().replace(/台/g, "臺");

export function findTrafficLocation(query: string) {
  const normalized = normalizeLocation(query);
  return trafficLocations.find((location) => location.name.includes(normalized));
}
