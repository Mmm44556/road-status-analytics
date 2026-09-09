export type ClusterLevel = {
  id: 'low' | 'medium' | 'high';
  color: string;
  radius: number;
  iconSize: number;
  iconPath: string;
};

const clusterLevels: readonly ClusterLevel[] = [
  {
    id: 'low',
    color: '#0B7C74',
    radius: 16,
    iconSize: 14,
    iconPath:
      'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3m-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3m0 2c-2.33 0-7 1.17-7 3.5V18c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-1.5c0-2.33-4.67-3.5-7-3.5m8 0c-.29 0-.62.02-.97.05 1.17.84 1.97 1.96 1.97 3.45V19h5c.55 0 1-.45 1-1v-1.5c0-2.33-4.67-3.5-7-3.5',
  },
  {
    id: 'medium',
    color: '#B65D13',
    radius: 20,
    iconSize: 16,
    iconPath:
      'M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91M4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m16 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2M12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3',
  },
  {
    id: 'high',
    color: '#C33A4A',
    radius: 22,
    iconSize: 18,
    iconPath:
      'M12 5.99 19.53 19H4.47zM2.74 18c-.77 1.33.19 3 1.73 3h15.06c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0zM11 11v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1m0 5h2v2h-2z',
  },
];

/** 依聚合事件數量取得低、中、高密度樣式。 */
export function getClusterLevel(count: number): ClusterLevel {
  if (count >= 50) return clusterLevels[2];
  if (count >= 10) return clusterLevels[1];
  return clusterLevels[0];
}
