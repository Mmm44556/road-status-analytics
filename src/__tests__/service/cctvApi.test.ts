import { describe, expect, it } from 'vitest';
import {
  createCctvQueryOptions,
  getCctvImageUrl,
  parseCctvCameras,
} from '@/service/cctvApi';

const cctv = {
  CCTVID: 'cctv-1',
  LinkID: 'link-1',
  VideoStreamURL: 'https://cctv.example.gov.tw/stream',
  LocationType: 1,
  PositionLon: 120.65,
  PositionLat: 24.18,
  RoadID: 'road-1',
  RoadName: '中華路',
  RoadClass: 6,
  RoadDirection: 'N',
};

describe('CCTV API contract', () => {
  it('does not query CCTV until its layer is visible', () => {
    expect(createCctvQueryOptions('高雄市', false).enabled).toBe(false);
    expect(createCctvQueryOptions('高雄市', true).enabled).toBe(true);
  });

  it('builds a same-origin proxy URL with encoded camera parameters', () => {
    expect(getCctvImageUrl('高雄市', 'camera/a')).toBe(
      '/api/traffic/cctv/image?city=%E9%AB%98%E9%9B%84%E5%B8%82&camera_id=camera%2Fa',
    );
  });

  it('validates CCTV points including authorities that omit optional fields', () => {
    const parsed = parseCctvCameras({
      data: { city: 'Taichung', cctvs: [cctv] },
    });

    expect(parsed.data.cctvs).toHaveLength(1);
    expect(parsed.data.cctvs[0].CCTVID).toBe('cctv-1');
  });

  it('validates CCTV points that include the optional description fields', () => {
    const parsed = parseCctvCameras({
      data: {
        city: 'Kaohsiung',
        cctvs: [{
          ...cctv,
          SurveillanceType: -1,
          SurveillanceDescription: '中華三路、建國三路',
          RoadSection: { Start: '', End: '' },
          LocationMile: '',
          LayoutMapURL: '',
        }],
      },
    });

    expect(parsed.data.cctvs[0].SurveillanceDescription).toBe('中華三路、建國三路');
  });

  it('validates CCTV points that omit road identification fields', () => {
    // 少數攝影機（例如未對應到路段的機台）完全沒有 RoadID/RoadName/RoadClass/RoadDirection。
    const cctvWithoutRoadInfo = {
      CCTVID: 'cctv-2',
      LinkID: 'link-2',
      VideoStreamURL: 'https://cctv.example.gov.tw/stream-2',
      LocationType: 1,
      PositionLon: 120.65,
      PositionLat: 24.18,
    };
    const parsed = parseCctvCameras({
      data: { city: 'Kaohsiung', cctvs: [cctvWithoutRoadInfo] },
    });

    expect(parsed.data.cctvs).toHaveLength(1);
    expect(parsed.data.cctvs[0].RoadName).toBeUndefined();
  });

  it('rejects malformed upstream CCTV points at the API boundary', () => {
    expect(() => parseCctvCameras({
      data: { city: 'Kaohsiung', cctvs: [{}] },
    })).toThrow();
  });

  it('accepts a valid WSS stream for authorities that provide it', () => {
    const parsed = parseCctvCameras({
      data: {
        city: 'Kaohsiung',
        cctvs: [{ ...cctv, VideoStreamURL: 'wss://camera.example/live' }],
      },
    });

    expect(parsed.data.cctvs[0].VideoStreamURL).toContain('wss://');
  });
});
