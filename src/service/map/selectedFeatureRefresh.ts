import { useEffect, useRef } from 'react';
import { useReloadBikeStation } from '@/service/bikeApi';
import { useReloadMetroStation } from '@/service/metroApi';
import { useReloadParkingLot } from '@/service/parkingLotApi';
import { useReloadParkingSegment } from '@/service/parkingSegmentApi';
import { useReloadVd } from '@/service/vdApi';
import type { SelectedFeature } from '@/service/map/useTrafficMap';

type RefreshableKind = Extract<
  SelectedFeature['kind'],
  'bike' | 'vd' | 'metro' | 'parkingLot' | 'parkingSegment'
>;

export type RefreshableSelection = {
  kind: RefreshableKind;
  id: string;
};

export type SelectedFeatureRefresh = {
  reload: () => void;
  isReloading: boolean;
  reloadFailed: boolean;
} | null;

/** 將可單筆刷新的 popup 選取狀態轉成統一識別資料。 */
export function getRefreshableSelection(
  selectedFeature: SelectedFeature | null,
): RefreshableSelection | null {
  if (!selectedFeature) return null;
  switch (selectedFeature.kind) {
    case 'bike':
    case 'vd':
    case 'metro':
    case 'parkingLot':
    case 'parkingSegment':
      return {
        kind: selectedFeature.kind,
        id: selectedFeature.data.id,
      };
    default:
      return null;
  }
}

/** 開啟支援即時資料的 popup 時刷新單筆，並提供共用刷新狀態。 */
export function useSelectedFeatureRefresh(
  city: string | null,
  selectedFeature: SelectedFeature | null,
): SelectedFeatureRefresh {
  const vdCity =
    selectedFeature?.kind === 'vd' ? selectedFeature.data.city : undefined;
  const refreshCity = vdCity || city || '';
  const bike = useReloadBikeStation(city ?? '');
  const vd = useReloadVd(refreshCity);
  const metro = useReloadMetroStation(city ?? '');
  const parkingLot = useReloadParkingLot(city ?? '');
  const parkingSegment = useReloadParkingSegment(city ?? '');
  const reloadBike = bike.mutate;
  const reloadVd = vd.mutate;
  const reloadMetro = metro.mutate;
  const reloadParkingLot = parkingLot.mutate;
  const reloadParkingSegment = parkingSegment.mutate;
  const reloadHandlersRef = useRef({
    bike: reloadBike,
    vd: reloadVd,
    metro: reloadMetro,
    parkingLot: reloadParkingLot,
    parkingSegment: reloadParkingSegment,
  });
  reloadHandlersRef.current = {
    bike: reloadBike,
    vd: reloadVd,
    metro: reloadMetro,
    parkingLot: reloadParkingLot,
    parkingSegment: reloadParkingSegment,
  };
  const selection = getRefreshableSelection(selectedFeature);

  const selectedKind = selection?.kind;
  const selectedId = selection?.id;

  useEffect(() => {
    if (!refreshCity || !selectedKind || !selectedId) return;
    reloadHandlersRef.current[selectedKind](selectedId);
  }, [refreshCity, selectedKind, selectedId]);

  if (!selection) return null;
  const getMutation = () => {
    switch (selection.kind) {
      case 'bike':
        return bike;
      case 'vd':
        return vd;
      case 'metro':
        return metro;
      case 'parkingLot':
        return parkingLot;
      case 'parkingSegment':
        return parkingSegment;
    }
  };
  const mutation = getMutation();
  return {
    reload: () => mutation.mutate(selection.id),
    isReloading: mutation.isPending && mutation.variables === selection.id,
    reloadFailed: mutation.isError && mutation.variables === selection.id,
  };
}
