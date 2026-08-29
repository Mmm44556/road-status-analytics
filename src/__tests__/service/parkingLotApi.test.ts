import { describe, expect, it } from 'vitest';
import { parseParkingLot, parseParkingLots } from '@/service/parkingLotApi';

describe('戶外停車場 API contract', () => {
  it('accepts a merged lot with live availability', () => {
    const parsed = parseParkingLots({
      data: {
        city: 'Kaohsiung',
        lots: [{
          lotId: 'KHA00001',
          name: '五都重平站停車場',
          address: '高雄市前鎮區鎮中路、翠亨北路口',
          positionLon: 120.32149,
          positionLat: 22.58779,
          fareDescription: '計次15元/次',
          isMotorcycle: false,
          totalSpaces: 54,
          availableSpaces: 15,
          serviceStatus: 1,
          updateTime: '2026-08-29T23:03:08+08:00',
        }],
      },
    });

    expect(parsed.data.lots[0].lotId).toBe('KHA00001');
  });

  it('accepts a lot with no live availability (null fields)', () => {
    const parsed = parseParkingLots({
      data: {
        city: 'Kaohsiung',
        lots: [{
          lotId: 's1',
          name: '測試站',
          address: '',
          positionLon: 120.3,
          positionLat: 22.6,
          fareDescription: '',
          isMotorcycle: false,
          totalSpaces: null,
          availableSpaces: null,
          serviceStatus: null,
          updateTime: null,
        }],
      },
    });

    expect(parsed.data.lots[0].availableSpaces).toBeNull();
  });

  it('rejects malformed upstream lot records at the API boundary', () => {
    expect(() => parseParkingLots({
      data: { city: 'Kaohsiung', lots: [{}] },
    })).toThrow();
  });
});

describe('single-lot reload API contract', () => {
  it('accepts a single refreshed lot', () => {
    const parsed = parseParkingLot({
      data: {
        lotId: 'KHA00001',
        name: '五都重平站停車場',
        address: '高雄市前鎮區鎮中路、翠亨北路口',
        positionLon: 120.32149,
        positionLat: 22.58779,
        fareDescription: '計次15元/次',
        isMotorcycle: false,
        totalSpaces: 54,
        availableSpaces: 15,
        serviceStatus: 1,
        updateTime: '2026-08-29T23:03:08+08:00',
      },
    });

    expect(parsed.data.lotId).toBe('KHA00001');
  });

  it('rejects a malformed single-lot response', () => {
    expect(() => parseParkingLot({ data: {} })).toThrow();
  });
});
