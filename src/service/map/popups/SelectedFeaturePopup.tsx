import BikePopupCard from '@/service/map/popups/BikePopupCard';
import BusPopupCard from '@/service/map/popups/BusPopupCard';
import CctvPopupCard from '@/service/map/popups/CctvPopupCard';
import LiveTrafficPopupCard from '@/service/map/popups/LiveTrafficPopupCard';
import MetroPopupCard from '@/service/map/popups/MetroPopupCard';
import ParkingLotPopupCard from '@/service/map/popups/ParkingLotPopupCard';
import ParkingSegmentPopupCard from '@/service/map/popups/ParkingSegmentPopupCard';
import RoadEventPopupCard from '@/service/map/popups/RoadEventPopupCard';
import VdPopupCard from '@/service/map/popups/VdPopupCard';
import type { SelectedFeatureRefresh } from '@/service/map/selectedFeatureRefresh';
import type { SelectedFeature } from '@/service/map/useTrafficMap';

type SelectedFeaturePopupProps = {
  selectedFeature: SelectedFeature | null;
  refresh: SelectedFeatureRefresh;
  onClose: () => void;
};

const emptyRefresh = {
  reload: () => undefined,
  isReloading: false,
  reloadFailed: false,
};

/** 依圖層種類分派 popup，讓地圖容器只負責版面與 OpenLayers 節點。 */
export default function SelectedFeaturePopup({
  selectedFeature,
  refresh,
  onClose,
}: SelectedFeaturePopupProps) {
  if (!selectedFeature) return null;
  const refreshProps = refresh ?? emptyRefresh;

  switch (selectedFeature.kind) {
    case 'event':
      return <RoadEventPopupCard event={selectedFeature.data} onClose={onClose} />;
    case 'cctv':
      return <CctvPopupCard key={selectedFeature.data.id} cctv={selectedFeature.data} onClose={onClose} />;
    case 'liveTraffic':
      return <LiveTrafficPopupCard segment={selectedFeature.data} onClose={onClose} />;
    case 'vd':
      return <VdPopupCard key={selectedFeature.data.id} vd={selectedFeature.data} onClose={onClose} onReload={refreshProps.reload} isReloading={refreshProps.isReloading} reloadFailed={refreshProps.reloadFailed} />;
    case 'bike':
      return <BikePopupCard key={selectedFeature.data.id} bike={selectedFeature.data} onClose={onClose} onReload={refreshProps.reload} isReloading={refreshProps.isReloading} reloadFailed={refreshProps.reloadFailed} />;
    case 'metro':
      return <MetroPopupCard key={selectedFeature.data.id} metro={selectedFeature.data} onClose={onClose} onReload={refreshProps.reload} isReloading={refreshProps.isReloading} reloadFailed={refreshProps.reloadFailed} />;
    case 'bus':
      return <BusPopupCard key={selectedFeature.data.id} bus={selectedFeature.data} onClose={onClose} />;
    case 'parkingLot':
      return <ParkingLotPopupCard key={selectedFeature.data.id} parkingLot={selectedFeature.data} onClose={onClose} onReload={refreshProps.reload} isReloading={refreshProps.isReloading} reloadFailed={refreshProps.reloadFailed} />;
    case 'parkingSegment':
      return <ParkingSegmentPopupCard key={selectedFeature.data.id} parkingSegment={selectedFeature.data} onClose={onClose} onReload={refreshProps.reload} isReloading={refreshProps.isReloading} reloadFailed={refreshProps.reloadFailed} />;
  }
}
